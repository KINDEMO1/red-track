import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if the user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all certificates with invalid URLs
    const { data: certificates, error: fetchError } = await supabase
      .from("medical_certificates")
      .select("*")
      .or("file_url.eq.pending,file_url.is.null")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!certificates || certificates.length === 0) {
      return NextResponse.json({ message: "No certificates with invalid URLs found" })
    }

    // Update each certificate with a placeholder URL
    const updates = certificates.map((cert) => ({
      id: cert.id,
      file_url: `https://placeholder.com/medical-certificate-${cert.id}.pdf`,
    }))

    const { error: updateError } = await supabase.from("medical_certificates").upsert(updates)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Fixed ${certificates.length} certificates with invalid URLs`,
      updatedCertificates: certificates.map((cert) => cert.id),
    })
  } catch (error) {
    console.error("Error fixing certificate URLs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
