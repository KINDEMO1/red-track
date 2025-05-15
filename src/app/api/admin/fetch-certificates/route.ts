import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
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

    console.log("Fetching all medical certificates for admin...")

    // Direct query to get all certificates with user information
    // Use a simpler query to ensure we get all records
    const { data: certificates, error } = await supabase
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
      console.error("Error fetching certificates:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${certificates.length} certificates`)
    console.log("Sample certificate:", certificates.length > 0 ? certificates[0] : "No certificates found")

    return NextResponse.json(
      {
        certificates,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error: any) {
    console.error("Unhandled error in fetch certificates API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
