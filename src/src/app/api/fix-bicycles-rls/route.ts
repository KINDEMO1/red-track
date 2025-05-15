import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Run the SQL script to fix RLS policies
    const { error } = await supabase.rpc("run_sql", {
      sql: `
      -- Check if RLS is enabled on the bicycles table
      DO $$
      DECLARE
        rls_enabled BOOLEAN;
      BEGIN
        SELECT rls_enabled FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'bicycles'
        INTO rls_enabled;
        
        IF rls_enabled IS NULL THEN
          RAISE NOTICE 'bicycles table does not exist';
          RETURN;
        END IF;
        
        -- Temporarily disable RLS to make changes
        ALTER TABLE public.bicycles DISABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Allow users to view bicycles" ON public.bicycles;
        DROP POLICY IF EXISTS "Allow admins to manage bicycles" ON public.bicycles;
        
        -- Create new policies
        
        -- Allow all users to view bicycles
        CREATE POLICY "Allow users to view bicycles"
        ON public.bicycles FOR SELECT
        TO authenticated
        USING (true);
        
        -- Allow admins to manage bicycles (insert, update, delete)
        CREATE POLICY "Allow admins to manage bicycles"
        ON public.bicycles FOR ALL
        TO authenticated
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
        
        -- Re-enable RLS
        ALTER TABLE public.bicycles ENABLE ROW LEVEL SECURITY;
      END $$;
      `,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "RLS policies for bicycles table have been updated",
    })
  } catch (error) {
    console.error("Error fixing bicycles RLS:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
