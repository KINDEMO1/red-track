import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const getUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting user:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Exception getting user:", error)
    return null
  }
}

export const getUserProfile = async () => {
  try {
    const user = await getUser()
    if (!user) return null

    const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single()

    if (error) {
      console.error("Error getting user profile:", error)

      // Return a fallback profile with basic information from auth
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || "User",
        student_id: user.email?.split("@")[0] || "",
        role: "student",
        status: "pending",
      }
    }

    return data
  } catch (error) {
    console.error("Exception getting user profile:", error)

    // Return null on exception
    return null
  }
}

export const isAdmin = async () => {
  const profile = await getUserProfile()
  return profile?.role === "admin"
}

export const checkMedicalCertificateStatus = async () => {
  try {
    const user = await getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("medical_certificates")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" error
      console.error("Error checking medical certificate status:", error)
      return null
    }

    return data?.status || null
  } catch (error) {
    console.error("Exception checking medical certificate status:", error)
    return null
  }
}

export const hasActiveBorrowing = async () => {
  try {
    const user = await getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from("borrowings")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)

    if (error) {
      console.error("Error checking active borrowings:", error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error("Exception checking active borrowings:", error)
    return false
  }
}

export const checkAdminAccess = async () => {
  try {
    const user = await getUser()
    if (!user) return false

    // Check if user has admin role
    const { data, error } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (error) {
      console.error("Error checking admin access:", error)
      return false
    }

    return data?.role === "admin"
  } catch (error) {
    console.error("Exception checking admin access:", error)
    return false
  }
}
