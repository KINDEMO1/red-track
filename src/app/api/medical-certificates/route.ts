import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    console.log("Medical certificate API: POST request received")

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return NextResponse.json({ error: `Authentication error: ${sessionError.message}` }, { status: 401 })
    }

    if (!session) {
      console.error("No session found")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("Session found for user:", session.user.id)

    // Get the request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    // Validate the request body
    if (!body.file_name || !body.file_type || !body.file_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Ensure the user can only upload for themselves unless they're an admin
    const userId = body.user_id || session.user.id

    if (userId !== session.user.id) {
      // Check if the user is an admin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (userError) {
        console.error("Error checking user role:", userError)
        return NextResponse.json({ error: `Failed to verify permissions: ${userError.message}` }, { status: 500 })
      }

      if (userData?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized to upload for other users" }, { status: 403 })
      }
    }

    // Create the certificate record
    console.log("Creating certificate record for user:", userId)
    const { data, error } = await supabase
      .from("medical_certificates")
      .insert([
        {
          user_id: userId,
          file_name: body.file_name,
          file_type: body.file_type,
          file_url: body.file_url,
          status: body.status || "pending",
          notes: body.notes || null,
          upload_date: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error("Error creating certificate:", error)
      return NextResponse.json({ error: `Failed to create certificate: ${error.message}` }, { status: 500 })
    }

    console.log("Certificate created successfully")
    return NextResponse.json({ success: true, certificate: data[0] })
  } catch (error: any) {
    console.error("Unhandled error in medical certificates API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}

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

    // Get userId from query params or use the authenticated user's ID
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId") || session.user.id

    // Verify the user is either requesting their own certificates or is an admin
    if (userId !== session.user.id) {
      // Check if the user is an admin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (userError || userData?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized to access other users' certificates" }, { status: 403 })
      }
    }

    // Fetch the certificates
    const { data: certificates, error: certificatesError } = await supabase
      .from("medical_certificates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (certificatesError) {
      console.error("Error fetching certificates:", certificatesError)
      return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
    }

    return NextResponse.json({ certificates })
  } catch (error: any) {
    console.error("Unhandled error in medical certificates API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
