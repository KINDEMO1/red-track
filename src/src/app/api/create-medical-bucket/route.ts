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

    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      return NextResponse.json({ error: bucketsError.message }, { status: 500 })
    }

    const bucketExists = buckets.some((bucket) => bucket.name === "medical-certificates")

    if (bucketExists) {
      // Bucket already exists, update its settings
      const { error: updateError } = await supabase.storage.updateBucket("medical-certificates", {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ message: "Bucket already exists, settings updated" })
    }

    // Create the bucket
    const { error: createError } = await supabase.storage.createBucket("medical-certificates", {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Bucket created successfully" })
  } catch (error) {
    console.error("Error creating bucket:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
