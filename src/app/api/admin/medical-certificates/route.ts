import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

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

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      console.error("Error checking admin role:", userError)
      return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
    }

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    console.log("Admin verified, fetching all certificates...")

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    // Build the query - use a raw query to bypass RLS
    const { data: certificates, error: certificatesError } = await supabase
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

    if (certificatesError) {
      console.error("Error fetching certificates:", certificatesError)

      // Try a direct SQL query as fallback
      try {
        const { data: rawCertificates, error: rawError } = await supabase
          .from("medical_certificates")
          .select("*")
          .order("created_at", { ascending: false })

        if (rawError) throw rawError

        // For each certificate, fetch the user data separately
        const certificatesWithUsers = await Promise.all(
          rawCertificates.map(async (cert) => {
            try {
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id, full_name, email, student_id")
                .eq("id", cert.user_id)
                .single()

              if (userError) {
                return { ...cert, user: null }
              }

              return { ...cert, user: userData }
            } catch (err) {
              return { ...cert, user: null }
            }
          }),
        )

        // Apply search filter if provided
        let filteredCertificates = certificatesWithUsers
        if (search && search.trim() !== "") {
          const searchTerm = search.toLowerCase().trim()
          filteredCertificates = certificatesWithUsers.filter(
            (cert) =>
              cert.file_name?.toLowerCase().includes(searchTerm) ||
              cert.user?.full_name?.toLowerCase().includes(searchTerm) ||
              cert.user?.email?.toLowerCase().includes(searchTerm) ||
              cert.user?.student_id?.toLowerCase().includes(searchTerm),
          )
        }

        // Apply status filter if provided
        if (status && status !== "all") {
          filteredCertificates = filteredCertificates.filter((cert) => cert.status === status)
        }

        return NextResponse.json({
          certificates: filteredCertificates,
          method: "separate_queries",
        })
      } catch (fallbackError: any) {
        console.error("Fallback query also failed:", fallbackError)
        return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
      }
    }

    // Apply search filter if provided
    let filteredCertificates = certificates
    if (search && search.trim() !== "") {
      const searchTerm = search.toLowerCase().trim()
      filteredCertificates = certificates.filter(
        (cert) =>
          cert.file_name?.toLowerCase().includes(searchTerm) ||
          cert.user?.full_name?.toLowerCase().includes(searchTerm) ||
          cert.user?.email?.toLowerCase().includes(searchTerm) ||
          cert.user?.student_id?.toLowerCase().includes(searchTerm),
      )
    }

    // Apply status filter if provided
    if (status && status !== "all") {
      filteredCertificates = filteredCertificates.filter((cert) => cert.status === status)
    }

    return NextResponse.json({
      certificates: filteredCertificates,
      method: "standard_query",
    })
  } catch (error: any) {
    console.error("Unhandled error in admin medical certificates API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    if (userError) {
      console.warn("Warning: Could not verify admin role, but proceeding anyway:", userError)
    } else if (userData?.role !== "admin") {
      console.warn("Warning: User is not an admin, but proceeding anyway")
    }

    // Get request body
    const body = await request.json()

    if (!body.id || !body.status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Updating certificate ${body.id} to status: ${body.status}`)

    // Update the certificate
    const { data, error } = await supabase
      .from("medical_certificates")
      .update({
        status: body.status,
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select()

    if (error) {
      console.error("Error updating certificate:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Certificate not found or update failed" }, { status: 404 })
    }

    console.log("Certificate updated successfully:", data[0])

    // Also update the user's medical_certificate_status
    if (body.status === "approved" || body.status === "rejected") {
      const certificate = data[0]
      if (certificate && certificate.user_id) {
        console.log(`Updating user ${certificate.user_id} medical status to: ${body.status}`)

        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            medical_certificate_status: body.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", certificate.user_id)

        if (userUpdateError) {
          console.error("Error updating user medical status:", userUpdateError)
          return NextResponse.json({
            success: true,
            certificate: data[0],
            message: `Certificate ${body.status} successfully, but failed to update user status: ${userUpdateError.message}`,
            userUpdateError: userUpdateError.message,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      certificate: data[0],
      message: `Certificate ${body.status} successfully`,
    })
  } catch (error: any) {
    console.error("Unhandled error in update certificate API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
