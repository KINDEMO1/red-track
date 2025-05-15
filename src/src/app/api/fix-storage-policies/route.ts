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

    // Execute SQL to fix storage policies
    const { error: sqlError } = await supabase.rpc("run_sql", {
      sql: `
      -- Disable RLS temporarily
      ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

      -- Drop existing policies
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

      -- Create a simple policy that allows all operations for authenticated users
      CREATE POLICY "authenticated_users_all_access" 
      ON storage.objects
      FOR ALL 
      TO authenticated
      USING (true)
      WITH CHECK (true);

      -- Re-enable RLS
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `,
    })

    if (sqlError) {
      return NextResponse.json({ error: sqlError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Storage policies have been fixed. All authenticated users can now access all storage buckets.",
    })
  } catch (error) {
    console.error("Error fixing storage policies:", error)
    return NextResponse.json(
      {
        error: `Failed to fix storage policies: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
