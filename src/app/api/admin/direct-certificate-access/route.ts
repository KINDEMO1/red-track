import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    console.log("Attempting direct certificate access with admin client...")

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
      console.error("Admin direct access error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${data?.length || 0} certificates using admin direct access`)

    return NextResponse.json({
      certificates: data,
      method: "admin_direct_access",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Unhandled error in direct certificate access:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
