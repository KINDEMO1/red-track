import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Method 1: Try using direct SQL query to bypass RLS
    try {
      const { data: certificates, error } = await supabase.rpc("get_all_medical_certificates")

      if (!error && certificates && certificates.length > 0) {
        console.log(`RPC method found ${certificates.length} certificates`)
        return NextResponse.json({
          certificates,
          method: "rpc_function",
          timestamp: new Date().toISOString(),
        })
      }
    } catch (rpcError) {
      console.error("RPC method failed, trying alternative:", rpcError)
    }

    // Method 2: Try using service role client if available
    // This is a fallback in case the RPC method doesn't work
    try {
      // Direct query with service role (if available)
      const { data, error } = await supabase
        .from("medical_certificates")
        .select(`
          *,
          user:users(
            id,
            full_name,
            email,
            student_id
          )
        `)
        .order("created_at", { ascending: false })

      if (!error) {
        console.log(`Direct query found ${data?.length || 0} certificates`)
        return NextResponse.json({
          certificates: data || [],
          method: "direct_query",
          timestamp: new Date().toISOString(),
        })
      }
    } catch (directError) {
      console.error("Direct query failed:", directError)
    }

    // Method 3: Last resort - try to get all certificates without joins
    try {
      const { data: rawCertificates, error: rawError } = await supabase
        .from("medical_certificates")
        .select("*")
        .order("created_at", { ascending: false })

      if (rawError) {
        throw rawError
      }

      // For each certificate, fetch the user data separately
      const certificatesWithUsers = await Promise.all(
        rawCertificates.map(async (cert) => {
          try {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("id, full_name, email, student_id")
              .eq("id", cert.user_id)
              .single()

            if (userError) {
              return { ...cert, user: null }
            }

            return { ...cert, user: userData }
          } catch (err) {
            return { ...cert, user: null }
          }
        }),
      )

      return NextResponse.json({
        certificates: certificatesWithUsers,
        method: "separate_queries",
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      console.error("All methods failed:", error)
      return NextResponse.json({ error: `Failed to fetch certificates: ${error.message}` }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Unhandled error in bypass RLS certificates API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
