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

    // Get user role
    const { data: userData, error: userError } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userError || !userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Create the bucket if it doesn't exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      return NextResponse.json({ error: bucketsError.message }, { status: 500 })
    }

    const bucketExists = buckets.some((bucket) => bucket.name === "medical-certificates")

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket("medical-certificates", {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
    }

    // Run the SQL script to fix permissions - using a simpler approach
    const { error: sqlError } = await supabase.rpc("run_sql", {
      sql: `
      -- Temporarily disable RLS to make changes
      ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
      DROP POLICY IF EXISTS "Allow individual access" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
      
      -- Create a simple policy that allows all authenticated users to upload to the medical-certificates bucket
      CREATE POLICY "Allow authenticated users to upload files"
      ON storage.objects FOR ALL
      TO authenticated
      USING (bucket_id = 'medical-certificates')
      WITH CHECK (bucket_id = 'medical-certificates');

      -- Re-enable RLS
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `,
    })

    if (sqlError) {
      return NextResponse.json({ error: sqlError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Storage RLS policies fixed successfully",
      bucketCreated: !bucketExists,
    })
  } catch (error) {
    console.error("Error fixing storage RLS:", error)
    return NextResponse.json(
      {
        error: `Failed to fix storage RLS: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
