import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if the user is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    // Create the bucket if it doesn't exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      throw bucketsError
    }

    const bucketExists = buckets.some((bucket) => bucket.name === "medical-certificates")

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket("medical-certificates", {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      })

      if (createError) {
        throw createError
      }

      return NextResponse.json({
        success: true,
        message: "Bucket created successfully",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Bucket already exists",
    })
  } catch (error) {
    console.error("Error creating bucket:", error)
    return NextResponse.json(
      {
        error: `Failed to create bucket: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
