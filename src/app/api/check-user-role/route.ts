import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check users table
    const { data: userData, error: userError2 } = await supabase.from("users").select("*").eq("id", user.id).single()

    // Check profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    // Get all tables
    const { data: tables, error: tablesError } = await supabase.rpc("run_sql", {
      sql: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
      `,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      userData: userData || null,
      userError: userError2 ? userError2.message : null,
      profileData: profileData || null,
      profileError: profileError ? profileError.message : null,
      tables: tables || [],
      tablesError: tablesError ? tablesError.message : null,
    })
  } catch (error) {
    console.error("Error checking user role:", error)
    return NextResponse.json(
      {
        error: `Failed to check user role: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
