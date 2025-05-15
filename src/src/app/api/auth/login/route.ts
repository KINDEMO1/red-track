import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { email, password, student_id } = await request.json()

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user exists in the database
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from("users")
      .select("id, email, role")
      .eq("email", email)
      .single()

    if (userCheckError && userCheckError.code !== "PGRST116") {
      console.error("Error checking for existing user:", userCheckError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Try to sign in
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    // If sign in fails but user exists in database
    if (authError && existingUser) {
      // User exists in database but not in auth or password is wrong
      // Create a new auth user with the provided credentials
      const { data: newAuthUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createUserError) {
        console.error("Error creating auth user:", createUserError)
        return NextResponse.json({ error: "Failed to create authentication" }, { status: 500 })
      }

      // Update the user record to link with the new auth user
      if (newAuthUser.user) {
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({ id: newAuthUser.user.id })
          .eq("email", email)

        if (updateError) {
          console.error("Error updating user ID:", updateError)
          return NextResponse.json({ error: "Failed to update user record" }, { status: 500 })
        }

        // Update student_id if provided
        if (student_id) {
          await supabaseAdmin.from("users").update({ student_id }).eq("id", newAuthUser.user.id)
        }

        // Return success with user data
        return NextResponse.json({
          success: true,
          user: newAuthUser.user,
          role: existingUser.role,
        })
      }
    }

    // If normal sign in succeeded
    if (authData?.user) {
      // Update student_id if provided
      if (student_id) {
        await supabaseAdmin.from("users").update({ student_id }).eq("id", authData.user.id)
      }

      // Get user role
      const { data: userProfile } = await supabaseAdmin.from("users").select("role").eq("id", authData.user.id).single()

      return NextResponse.json({
        success: true,
        user: authData.user,
        role: userProfile?.role || "student",
      })
    }

    // If we get here, authentication failed
    return NextResponse.json({ error: "Invalid login credentials" }, { status: 401 })
  } catch (error: any) {
    console.error("Login API error:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
