import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`Processing medical certificate upload for user ${user.id}`, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })

    // Create a unique file name
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // Make sure the bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some((bucket) => bucket.name === "medical-certificates")

      if (!bucketExists) {
        console.log("Creating medical-certificates bucket")
        const { error: createBucketError } = await supabase.storage.createBucket("medical-certificates", {
          public: true,
        })

        if (createBucketError) {
          console.error("Error creating bucket:", createBucketError)
        }
      }
    } catch (bucketError) {
      console.error("Error checking bucket:", bucketError)
    }

    // Upload the file
    console.log(`Uploading file to path: medical-certificates/${filePath}`)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("medical-certificates")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    console.log("File uploaded successfully:", uploadData)

    // Get the public URL
    const { data: urlData } = supabase.storage.from("medical-certificates").getPublicUrl(filePath)
    console.log("Public URL generated:", urlData.publicUrl)

    // Create a record in the database
    console.log("Creating medical certificate record in database")
    const { data: dbData, error: dbError } = await supabase
      .from("medical_certificates")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_url: urlData.publicUrl,
        status: "pending",
        upload_date: new Date().toISOString(),
      })
      .select()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    console.log("Certificate record created successfully:", dbData)

    // Update the user's medical_certificate_status to pending
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ medical_certificate_status: "pending" })
      .eq("id", user.id)

    if (userUpdateError) {
      console.error("Error updating user medical status:", userUpdateError)
      // Don't return an error, just log it
    } else {
      console.log(`Updated user ${user.id} medical status to pending`)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Certificate uploaded successfully",
        url: urlData.publicUrl,
        certificate: dbData[0],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
