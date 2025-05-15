import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

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

    if (sessionError) {
      console.error("Session error:", sessionError)
      return NextResponse.json({ error: "Authentication error", details: sessionError.message }, { status: 401 })
    }

    if (!session) {
      return NextResponse.json({ error: "Not authenticated", details: "No active session found" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      console.error("Error checking admin role:", userError)
      return NextResponse.json({ error: "Failed to verify admin status", details: userError.message }, { status: 500 })
    }

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    console.log("Admin verified, fetching all certificates...")

    // Try using the admin client to bypass RLS
    try {
      console.log("Attempting to fetch certificates using admin client...")

      // Use the admin client with service role key to bypass RLS
      const { data, error } = await supabaseAdmin
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

      if (error) {
        console.error("Admin client query error:", error)
        return NextResponse.json(
          {
            error: "Database query error",
            details: error.message,
            code: error.code,
          },
          { status: 500 },
        )
      }

      console.log(`Found ${data?.length || 0} certificates using admin client`)

      return NextResponse.json({
        certificates: data || [],
        method: "admin_client",
        adminEmail: userData.email,
        timestamp: new Date().toISOString(),
      })
    } catch (adminError: any) {
      console.error("Admin client error:", adminError)

      // Return a proper JSON error response
      return NextResponse.json(
        {
          error: "Admin client error",
          details: adminError.message,
          stack: process.env.NODE_ENV === "development" ? adminError.stack : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Unhandled error in get all certificates API:", error)

    // Always return JSON, even for unhandled errors
    return NextResponse.json(
      {
        error: "Server error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
