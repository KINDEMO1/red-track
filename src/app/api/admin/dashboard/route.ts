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

    // Fetch bicycle stats
    const { data: bicycles, error: bicyclesError } = await supabase.from("bicycles").select("id, is_available")

    if (bicyclesError) {
      console.error("Error fetching bicycles:", bicyclesError)
      return NextResponse.json({ error: "Failed to fetch bicycles" }, { status: 500 })
    }

    const totalBicycles = bicycles?.length || 0
    const availableBicycles = bicycles?.filter((b) => b.is_available)?.length || 0

    // Fetch active borrowings
    const { data: activeBorrowings, error: borrowingsError } = await supabase
      .from("borrowings")
      .select("id, bicycle_id, user_id")
      .eq("status", "active")

    if (borrowingsError) {
      console.error("Error fetching borrowings:", borrowingsError)
      return NextResponse.json({ error: "Failed to fetch borrowings" }, { status: 500 })
    }

    // Fetch pending certificates
    const { data: pendingCertificates, error: certificatesError } = await supabase
      .from("medical_certificates")
      .select("id")
      .eq("status", "pending")

    if (certificatesError) {
      console.error("Error fetching certificates:", certificatesError)
      return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
    }

    // Fetch total users
    const { data: users, error: usersError } = await supabase.from("users").select("id")

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Check for data inconsistency
    const unavailableBicycles = bicycles?.filter((b) => !b.is_available)?.length || 0
    const activeBorrowingsCount = activeBorrowings?.length || 0

    let dataConsistencyIssue = null
    if (unavailableBicycles !== activeBorrowingsCount) {
      dataConsistencyIssue = {
        message: "Data inconsistency detected",
        details: `${unavailableBicycles} bicycles are marked as unavailable, but there are ${activeBorrowingsCount} active borrowings.`,
      }

      console.warn("Data inconsistency detected:", dataConsistencyIssue.details)
    }

    // Return dashboard stats
    return NextResponse.json({
      stats: {
        totalBicycles,
        availableBicycles,
        activeBorrowings: activeBorrowingsCount,
        pendingCertificates: pendingCertificates?.length || 0,
        totalUsers: users?.length || 0,
      },
      dataConsistencyIssue,
    })
  } catch (error: any) {
    console.error("Unhandled error in admin dashboard API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
