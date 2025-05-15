import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

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
      return NextResponse.json({ error: "Session error", details: sessionError.message }, { status: 401 })
    }

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: "User error", details: userError.message }, { status: 500 })
    }

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    // Simple direct query
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

    if (error) {
      return NextResponse.json({ error: "Query error", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      certificates: data || [],
      method: "simple_direct_query",
      adminEmail: userData.email,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    // Always return JSON for errors
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
