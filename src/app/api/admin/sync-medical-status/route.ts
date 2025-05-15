import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
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

    // Get request body (optional user_id to sync just one user)
    const body = await request.json().catch(() => ({}))
    const userId = body.user_id

    console.log("Syncing medical certificate status", userId ? `for user ${userId}` : "for all users")

    // Fetch all users with their latest medical certificates
    let query = supabase.from("users").select(`
        id,
        medical_certificates (
          id,
          status,
          created_at
        )
      `)

    // If a specific user ID is provided, only sync that user
    if (userId) {
      query = query.eq("id", userId)
    }

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    console.log(`Found ${users.length} users to process`)

    // Process each user and update their medical certificate status
    const updates = []
    for (const user of users) {
      // Sort certificates by created_at in descending order to get the latest
      const certificates = user.medical_certificates || []
      certificates.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Get the latest certificate status
      const latestStatus = certificates.length > 0 ? certificates[0].status : null

      console.log(`User ${user.id} has ${certificates.length} certificates, latest status: ${latestStatus || "none"}`)

      // Update the user's medical_certificate_status field
      if (latestStatus) {
        const { data, error } = await supabase
          .from("users")
          .update({ medical_certificate_status: latestStatus })
          .eq("id", user.id)
          .select("id, medical_certificate_status")

        if (error) {
          console.error(`Error updating user ${user.id}:`, error)
        } else {
          console.log(`Updated user ${user.id} medical status to ${latestStatus}`, data)
          updates.push({ id: user.id, status: latestStatus })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced medical certificate status for ${updates.length} users`,
      updates,
    })
  } catch (error: any) {
    console.error("Unhandled error in sync medical status API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
