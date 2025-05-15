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

    console.log("Admin verified, fetching all certificates...")

    // Method 1: Try using a raw SQL query with service role (if available)
    try {
      // Execute raw SQL to get all certificates with user info
      const { data, error } = await supabase.rpc("get_all_certificates")

      if (error) throw error

      console.log(`Found ${data?.length || 0} certificates using RPC function`)

      return NextResponse.json({
        certificates: data,
        method: "rpc_function",
        adminEmail: userData.email,
        timestamp: new Date().toISOString(),
      })
    } catch (rpcError) {
      console.error("RPC function error:", rpcError)

      // Method 2: Try direct query with joins
      try {
        // This query uses a direct approach
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

        console.log(`Found ${data?.length || 0} certificates using direct query`)

        return NextResponse.json({
          certificates: data,
          method: "direct_query",
          adminEmail: userData.email,
          timestamp: new Date().toISOString(),
        })
      } catch (directError) {
        console.error("Direct query error:", directError)

        // Method 3: Try separate queries as last resort
        try {
          // Get all certificates first
          const { data: rawCertificates, error: rawError } = await supabase
            .from("medical_certificates")
            .select("*")
            .order("created_at", { ascending: false })

          if (rawError) throw rawError

          console.log(`Found ${rawCertificates?.length || 0} raw certificates`)

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
                  console.log(`Error fetching user for certificate ${cert.id}:`, userError)
                  return { ...cert, user: null }
                }

                return { ...cert, user: userData }
              } catch (err) {
                console.error(`Error processing certificate ${cert.id}:`, err)
                return { ...cert, user: null }
              }
            }),
          )

          console.log(`Processed ${certificatesWithUsers.length} certificates with user data`)

          return NextResponse.json({
            certificates: certificatesWithUsers,
            method: "separate_queries",
            adminEmail: userData.email,
            timestamp: new Date().toISOString(),
          })
        } catch (separateError) {
          console.error("Separate queries error:", separateError)
          throw separateError
        }
      }
    }
  } catch (error: any) {
    console.error("Unhandled error in get all certificates API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
