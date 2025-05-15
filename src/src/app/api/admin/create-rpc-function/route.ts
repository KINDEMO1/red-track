import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

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
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (userError || userData?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    // Try to create the RPC function using rpc
    try {
      const { error } = await supabase.rpc("create_admin_certificates_function")

      if (!error) {
        return NextResponse.json({
          success: true,
          message: "RPC function created successfully using rpc",
        })
      }
    } catch (rpcError) {
      console.warn("Failed to create function using rpc:", rpcError)
    }

    // Try to create the function using raw SQL
    try {
      const { error } = await supabase.rpc("exec_sql", {
        sql_query: `
          CREATE OR REPLACE FUNCTION admin_get_all_certificates()
          RETURNS SETOF json
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            SELECT json_build_object(
              'id', mc.id,
              'user_id', mc.user_id,
              'file_name', mc.file_name,
              'file_type', mc.file_type,
              'file_url', mc.file_url,
              'upload_date', mc.upload_date,
              'status', mc.status,
              'notes', mc.notes,
              'created_at', mc.created_at,
              'updated_at', mc.updated_at,
              'user', json_build_object(
                'id', u.id,
                'full_name', u.full_name,
                'email', u.email,
                'student_id', u.student_id
              )
            )
            FROM medical_certificates mc
            LEFT JOIN users u ON mc.user_id = u.id
            ORDER BY mc.created_at DESC;
          $$;
          
          -- Grant execute permission to authenticated users
          GRANT EXECUTE ON FUNCTION admin_get_all_certificates() TO authenticated;
        `,
      })

      if (!error) {
        return NextResponse.json({
          success: true,
          message: "RPC function created successfully using exec_sql",
        })
      }
    } catch (execError) {
      console.warn("Failed to create function using exec_sql:", execError)
    }

    return NextResponse.json({
      success: false,
      message: "Could not create RPC function. Please contact your database administrator to create it manually.",
    })
  } catch (error: any) {
    console.error("Unhandled error in create RPC function API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
