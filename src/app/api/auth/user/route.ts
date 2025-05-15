import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!session?.user) {
      return NextResponse.json({ error: "No user in session" }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email || ""

    // Check if email matches the school format
    const isValidSchoolEmail = /^[0-9]{2}-[0-9]{5}@g\.batstate-u\.edu\.ph$/i.test(userEmail)

    // Try to get the user from the database
    let { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("Error getting user profile:", profileError)
    }

    // If we don't have a user profile in the database, create one (only for valid school emails)
    if (!userProfile && !profileError && isValidSchoolEmail) {
      try {
        // First check if a user with this email already exists
        const { data: existingUser, error: existingError } = await supabase
          .from("users")
          .select("id")
          .eq("email", userEmail)
          .maybeSingle()

        if (existingUser) {
          // User exists with this email but different ID - update the ID
          const { error: updateError } = await supabase.from("users").update({ id: userId }).eq("id", existingUser.id)

          if (updateError) {
            console.error("Error updating user ID:", updateError)
          } else {
            // Fetch the updated user
            const { data: updatedUser, error: fetchError } = await supabase
              .from("users")
              .select("*")
              .eq("id", userId)
              .maybeSingle()

            if (!fetchError) {
              userProfile = updatedUser
            } else {
              console.error("Error fetching updated user:", fetchError)
            }
          }
        } else {
          // Use user session data to create a minimal profile
          const { error: insertError } = await supabase.from("users").insert([
            {
              id: userId,
              email: userEmail,
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "User",
              role: "student",
            },
          ])

          if (insertError) {
            console.error("Error creating user profile:", insertError)
          } else {
            // Fetch the newly created user
            const { data: newUser, error: fetchError } = await supabase
              .from("users")
              .select("*")
              .eq("id", userId)
              .maybeSingle()

            if (!fetchError) {
              userProfile = newUser
            } else {
              console.error("Error fetching new user:", fetchError)
            }
          }
        }
      } catch (err) {
        console.error("Exception creating user profile:", err)
      }
    }

    // Create a fallback user object if we still don't have one
    if (!userProfile) {
      userProfile = {
        id: userId,
        email: userEmail,
        full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "User",
        student_id: isValidSchoolEmail ? userEmail.split("@")[0] : "",
        role: "student",
        created_at: new Date().toISOString(),
      }
    }

    return NextResponse.json({
      user: userProfile,
      // Add a warning if the email is not a valid school email
      warnings: !isValidSchoolEmail
        ? ["Please use your school email (xx-xxxxx@g.batstate-u.edu.ph) to access all features."]
        : undefined,
    })
  } catch (error) {
    console.error("Unhandled error in user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
