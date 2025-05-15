import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Create a Supabase admin client with the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    // Generate a random ID for testing
    const testId = `test-${Math.random().toString(36).substring(2, 9)}`

    // Try to insert a test user
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          id: testId,
          email: `test-${testId}@example.com`,
          full_name: "Test User",
          role: "student",
          status: "pending",
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in create-test-user route:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
