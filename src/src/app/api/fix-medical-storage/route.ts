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

    // Run the SQL script to fix permissions
    const { error: sqlError } = await supabase.rpc("run_sql", {
      sql: `
      -- Temporarily disable RLS to make changes
      ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "Allow users to upload their own medical certificates" ON storage.objects;
      DROP POLICY IF EXISTS "Allow users to view their own medical certificates" ON storage.objects;
      DROP POLICY IF EXISTS "Allow users to update their own medical certificates" ON storage.objects;
      DROP POLICY IF EXISTS "Allow users to delete their own medical certificates" ON storage.objects;
      DROP POLICY IF EXISTS "Allow admins to access all medical certificates" ON storage.objects;

      -- Create new policies

      -- Allow users to upload their own medical certificates
      CREATE POLICY "Allow users to upload their own medical certificates"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'medical-certificates' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR auth.jwt() ->> 'role' = 'admin')
      );

      -- Allow users to view their own medical certificates
      CREATE POLICY "Allow users to view their own medical certificates"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'medical-certificates' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR auth.jwt() ->> 'role' = 'admin')
      );

      -- Allow users to update their own medical certificates
      CREATE POLICY "Allow users to update their own medical certificates"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'medical-certificates' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR auth.jwt() ->> 'role' = 'admin')
      );

      -- Allow users to delete their own medical certificates
      CREATE POLICY "Allow users to delete their own medical certificates"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'medical-certificates' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR auth.jwt() ->> 'role' = 'admin')
      );

      -- Allow admins to access all medical certificates
      CREATE POLICY "Allow admins to access all medical certificates"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'medical-certificates' AND
        auth.jwt() ->> 'role' = 'admin'
      );

      -- Re-enable RLS
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `,
    })

    if (sqlError) {
      return NextResponse.json({ error: sqlError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Medical storage bucket and permissions fixed successfully",
      bucketCreated: !bucketExists,
    })
  } catch (error) {
    console.error("Error fixing medical storage:", error)
    return NextResponse.json(
      {
        error: `Failed to fix medical storage: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
