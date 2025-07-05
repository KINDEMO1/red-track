import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Create a unique file name
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = fileName

    // Upload the file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("bicycle-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("bicycle-images").getPublicUrl(filePath)

    console.log("File uploaded successfully:", urlData.publicUrl)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      message: "File uploaded successfully",
    })
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
