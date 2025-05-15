import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (!code) {
    console.error("No code found in callback URL")
    return NextResponse.redirect(new URL("/login?error=No+code+found", requestUrl.origin))
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }

    // Get the user to check if they exist in the database
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Error getting user:", userError)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Failed to get user")}`, requestUrl.origin),
      )
    }

    // Check if user exists in the database
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (userCheckError && userCheckError.code !== "PGRST116") {
      console.error("Error checking if user exists:", userCheckError)
    }

    // If user doesn't exist in the database, check if they exist by email
    if (!existingUser && user.email) {
      const { data: userByEmail, error: emailCheckError } = await supabase
        .from("users")
        .select("id, role")
        .eq("email", user.email)
        .single()

      if (emailCheckError && emailCheckError.code !== "PGRST116") {
        console.error("Error checking if user exists by email:", emailCheckError)
      }

      // If user exists by email but with different ID, update the user ID
      if (userByEmail) {
        const { error: updateError } = await supabase.from("users").update({ id: user.id }).eq("email", user.email)

        if (updateError) {
          console.error("Error updating user ID:", updateError)
        }
      } else {
        // Create a new user in the database
        const { error: insertError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          student_id: user.email?.split("@")[0] || "",
          role: "student",
        })

        if (insertError) {
          console.error("Error creating user:", insertError)
        }
      }
    }

    // Redirect based on role
    if (existingUser?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", requestUrl.origin))
    } else {
      return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
    }
  } catch (error: any) {
    console.error("Auth callback error:", error)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
  }
}
