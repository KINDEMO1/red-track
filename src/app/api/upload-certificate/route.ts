import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("Upload certificate API called")

  try {
    // Get the form data
    const formData = await request.formData()
    console.log("Form data received")

    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const fileName = formData.get("fileName") as string
    const fileType = formData.get("fileType") as string

    console.log("Form data:", { userId, fileName, fileType, fileSize: file?.size })

    if (!file || !userId) {
      console.error("Missing required fields:", { file: !!file, userId: !!userId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Initialize Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    console.log("Supabase client initialized")

    // Verify the user session
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
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log("Session verified for user:", session.user.id)

    // Verify the user is uploading their own certificate
    if (session.user.id !== userId) {
      console.error("User ID mismatch:", { sessionUserId: session.user.id, requestUserId: userId })
      return NextResponse.json({ error: "You can only upload your own certificates" }, { status: 403 })
    }

    // Convert the file to an array buffer
    console.log("Converting file to buffer")
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    console.log("File converted to buffer, size:", buffer.length)

    // Upload the file to storage
    const fileExt = fileName.split(".").pop()
    const storagePath = `${userId}/${Date.now()}.${fileExt}`
    console.log("Uploading to storage path:", storagePath)

    // Try a simpler approach first - create a record without the file
    console.log("Creating certificate record in database")
    try {
      const { data: dbData, error: dbError } = await supabase
        .from("medical_certificates")
        .insert([
          {
            user_id: userId,
            file_name: fileName,
            file_type: fileType,
            file_url: "pending", // We'll update this later
            status: "pending",
          },
        ])
        .select()

      if (dbError) {
        console.error("Database error:", dbError)
        return NextResponse.json({ error: `Failed to create certificate record: ${dbError.message}` }, { status: 500 })
      }

      console.log("Certificate record created:", dbData)

      // Now try to upload the file
      console.log("Uploading file to storage")
      const { data: storageData, error: storageError } = await supabase.storage
        .from("medical-certificates")
        .upload(storagePath, buffer, {
          contentType: fileType,
          cacheControl: "3600",
          upsert: false,
        })

      if (storageError) {
        console.error("Storage error:", storageError)
        // Don't fail the request, just log the error
        return NextResponse.json({
          success: true,
          message: "Certificate record created but file upload failed. Please try again later.",
          data: dbData,
          fileError: storageError.message,
        })
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("medical-certificates").getPublicUrl(storagePath)
      console.log("File uploaded, public URL:", publicUrl)

      // Update the record with the file URL
      const { error: updateError } = await supabase
        .from("medical_certificates")
        .update({ file_url: publicUrl })
        .eq("id", dbData[0].id)

      if (updateError) {
        console.error("Update error:", updateError)
        // Don't fail the request, just log the error
      }

      return NextResponse.json({
        success: true,
        message: "Certificate uploaded successfully",
        data: dbData,
      })
    } catch (innerError: any) {
      console.error("Inner try-catch error:", innerError)
      return NextResponse.json({ error: `Inner error: ${innerError.message}` }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 })
  }
}
