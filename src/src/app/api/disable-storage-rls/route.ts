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

    // Completely disable RLS on storage.objects and create a simple policy
    const { error: sqlError } = await supabase.rpc("run_sql", {
      sql: `
      -- Disable RLS
      ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
      
      -- Drop all existing policies
      DO $$
      DECLARE
          policy_record RECORD;
      BEGIN
          FOR policy_record IN 
              SELECT policyname FROM pg_policies 
              WHERE tablename = 'objects' AND schemaname = 'storage'
          LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
          END LOOP;
      END
      $$;
      
      -- Create a single, simple policy
      CREATE POLICY "allow_all_authenticated" 
      ON storage.objects
      FOR ALL 
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
      -- Re-enable RLS
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      
      -- Make sure the bucket exists and is public
      DO $$
      DECLARE
          bucket_exists BOOLEAN;
      BEGIN
          SELECT EXISTS (
              SELECT 1 FROM storage.buckets WHERE name = 'medical-certificates'
          ) INTO bucket_exists;
          
          IF NOT bucket_exists THEN
              INSERT INTO storage.buckets (id, name, public)
              VALUES ('medical-certificates', 'medical-certificates', true);
          ELSE
              UPDATE storage.buckets
              SET public = true
              WHERE name = 'medical-certificates';
          END IF;
      END
      $$;
      `,
    })

    if (sqlError) {
      return NextResponse.json({ error: sqlError.message }, { status: 500 })
    }

    return NextResponse.json({
      message:
        "Storage RLS has been completely disabled for testing. All authenticated users can now access the storage.",
    })
  } catch (error) {
    console.error("Error disabling storage RLS:", error)
    return NextResponse.json(
      {
        error: `Failed to disable storage RLS: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
