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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    // Build the query
    let query = supabase
      .from("borrowings")
      .select(`
        *,
        bicycles (*),
        users (*)
      `)
      .order("created_at", { ascending: false })

    // Apply status filter if provided
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // Execute the query
    const { data: borrowings, error: borrowingsError } = await query

    if (borrowingsError) {
      console.error("Error fetching borrowings:", borrowingsError)
      return NextResponse.json({ error: "Failed to fetch borrowings" }, { status: 500 })
    }

    // Apply search filter if provided
    let filteredBorrowings = borrowings || []
    if (search && search.trim() !== "") {
      const searchTerm = search.toLowerCase().trim()
      filteredBorrowings = filteredBorrowings.filter(
        (borrowing) =>
          borrowing.bicycles?.name?.toLowerCase().includes(searchTerm) ||
          borrowing.users?.full_name?.toLowerCase().includes(searchTerm) ||
          borrowing.users?.email?.toLowerCase().includes(searchTerm) ||
          borrowing.users?.student_id?.toLowerCase().includes(searchTerm),
      )
    }

    return NextResponse.json({ borrowings: filteredBorrowings })
  } catch (error: any) {
    console.error("Unhandled error in admin borrowings API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
