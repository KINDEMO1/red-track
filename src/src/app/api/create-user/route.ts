import { NextResponse } from "next/server"

// Create a Supabase client with the service role key
import { createClient } from "@supabase/supabase-js"

// This is a server-side route handler that will use the service role
// to bypass RLS policies when creating a new user
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, email, full_name, role, status } = body

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

    // Insert the user with the service role client (bypasses RLS)
    const { error } = await supabaseAdmin.from("users").insert([
      {
        id,
        email,
        full_name,
        role,
        status,
      },
    ])

    if (error) {
      console.error("Error creating user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in create-user route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
