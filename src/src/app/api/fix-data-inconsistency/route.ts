import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
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

    // Check for bicycles marked as unavailable
    const { data: bicycles, error: bicyclesError } = await supabase
      .from("bicycles")
      .select("*")
      .eq("is_available", false)

    if (bicyclesError) {
      return NextResponse.json({ error: `Error fetching bicycles: ${bicyclesError.message}` }, { status: 500 })
    }

    if (!bicycles || bicycles.length === 0) {
      return NextResponse.json({ message: "No unavailable bicycles found" })
    }

    console.log(`Found ${bicycles.length} unavailable bicycles`)

    const results = []

    // For each unavailable bicycle, check if there's an active borrowing
    for (const bicycle of bicycles) {
      const { data: existingBorrowings, error: borrowingCheckError } = await supabase
        .from("borrowings")
        .select("id")
        .eq("bicycle_id", bicycle.id)
        .eq("status", "active")

      if (borrowingCheckError) {
        results.push({
          bicycle_id: bicycle.id,
          status: "error",
          message: `Error checking borrowings: ${borrowingCheckError.message}`,
        })
        continue
      }

      if (!existingBorrowings || existingBorrowings.length === 0) {
        // No active borrowing found for this unavailable bicycle
        // Get the first user
        const { data: users, error: usersError } = await supabase.from("users").select("id").limit(1)

        if (usersError || !users || users.length === 0) {
          results.push({
            bicycle_id: bicycle.id,
            status: "error",
            message: "No users found to create borrowing",
          })
          continue
        }

        const userId = users[0].id
        const now = new Date()
        const expectedReturn = new Date()
        expectedReturn.setDate(now.getDate() + 3) // 3 days from now

        // Create a borrowing record
        const { data: newBorrowing, error: createError } = await supabase
          .from("borrowings")
          .insert({
            bicycle_id: bicycle.id,
            user_id: userId,
            borrow_date: now.toISOString(),
            expected_return_date: expectedReturn.toISOString(),
            status: "active",
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select()

        if (createError) {
          results.push({
            bicycle_id: bicycle.id,
            status: "error",
            message: `Error creating borrowing: ${createError.message}`,
          })
        } else {
          results.push({
            bicycle_id: bicycle.id,
            status: "fixed",
            message: "Created missing borrowing record",
            borrowing_id: newBorrowing[0].id,
          })
        }
      } else {
        results.push({
          bicycle_id: bicycle.id,
          status: "ok",
          message: "Borrowing record exists",
          borrowing_id: existingBorrowings[0].id,
        })
      }
    }

    return NextResponse.json({
      message: "Data consistency check completed",
      bicycles_checked: bicycles.length,
      results,
    })
  } catch (error: any) {
    console.error("Error fixing data inconsistency:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
