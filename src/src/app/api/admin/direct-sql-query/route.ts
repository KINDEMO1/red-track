import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
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

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      console.error("Error checking admin role:", userError)
      return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
    }

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    console.log("Admin verified, executing SQL query...")

    // Try to execute a raw SQL query to get all certificates with user info
    try {
      const { data, error } = await supabase.rpc("admin_get_all_certificates")

      if (error) throw error

      return NextResponse.json({
        certificates: data,
        method: "rpc_function",
        adminEmail: userData.email,
        timestamp: new Date().toISOString(),
      })
    } catch (rpcError: any) {
      console.error("RPC function error:", rpcError)

      // If RPC fails, try a direct query
      try {
        // This query uses a raw SQL approach to bypass RLS
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

        if (error) throw error

        return NextResponse.json({
          certificates: data,
          method: "direct_query",
          adminEmail: userData.email,
          timestamp: new Date().toISOString(),
        })
      } catch (directError: any) {
        console.error("Direct query error:", directError)

        // Last resort - try to get certificates without joins first
        const { data: rawCertificates, error: rawError } = await supabase
          .from("medical_certificates")
          .select("*")
          .order("created_at", { ascending: false })

        if (rawError) throw rawError

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
          adminEmail: userData.email,
          timestamp: new Date().toISOString(),
        })
      }
    }
  } catch (error: any) {
    console.error("Unhandled error in direct SQL query API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
