"use client"

import { useState, useEffect } from "react"
import type React from "react"

import { FaBicycle, FaLock, FaGoogle } from "react-icons/fa"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get("error")

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    student_id: "",
  })
  const [error, setError] = useState(errorMessage || "")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminKey, setAdminKey] = useState("")
  const [adminKeyError, setAdminKeyError] = useState("")

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error checking session:", error)
          return
        }

        if (data.session) {
          // Get user profile to check role
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("role")
            .eq("id", data.session.user.id)
            .single()

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Error fetching user profile:", profileError)
            return
          }

          if (profile?.role === "admin") {
            router.push("/admin")
          } else {
            router.push("/dashboard")
          }
        }
      } catch (error) {
        console.error("Error checking user:", error)
      }
    }

    checkUser()
  }, [router])

  const validateBatstateEmail = (email: string) => {
    const regex = /^[0-9]{2}-[0-9]{5}@g\.batstate-u\.edu\.ph$/
    return regex.test(email)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      if (!validateBatstateEmail(formData.email)) {
        setError("Please use your Batstate-U email (xx-xxxxx@g.batstate-u.edu.ph)")
        setIsLoading(false)
        return
      }

      // Validate student ID format
      if (!formData.student_id.match(/^\d{2}-\d{5}$/)) {
        setError("Please enter a valid student ID (format: xx-xxxxx)")
        setIsLoading(false)
        return
      }

      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          // Try to sign up if login fails
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: "",
                student_id: formData.student_id,
              },
            },
          })

          if (signUpError) {
            setError(signUpError.message)
            setIsLoading(false)
            return
          }

          // Create user in database
          const { error: insertError } = await supabase.from("users").insert({
            id: signUpData.user?.id,
            email: formData.email,
            student_id: formData.student_id,
            full_name: "",
            role: "student",
          })

          if (insertError && !insertError.message.includes("duplicate key")) {
            console.error("Error creating user:", insertError)
            setError("Error creating user: " + insertError.message)
            setIsLoading(false)
            return
          }

          setSuccess("Account created! Redirecting...")
          setTimeout(() => {
            router.push("/dashboard")
          }, 1500)
        } else {
          setError(error.message)
        }
        setIsLoading(false)
        return
      }

      // Check if user exists in database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user?.id)
        .single()

      if (userError && userError.code !== "PGRST116") {
        console.error("Error checking user:", userError)
      }

      // If user doesn't exist in database, create them
      if (!userData && data.user) {
        const { error: insertError } = await supabase.from("users").insert({
          id: data.user.id,
          email: formData.email,
          student_id: formData.student_id,
          full_name: data.user.user_metadata?.full_name || "",
          role: "student",
        })

        if (insertError && !insertError.message.includes("duplicate key")) {
          console.error("Error creating user:", insertError)
        }
      }

      // Update student ID if it's different
      if (userData && userData.student_id !== formData.student_id) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ student_id: formData.student_id })
          .eq("id", data.user?.id)

        if (updateError) {
          console.error("Error updating student ID:", updateError)
        }
      }

      setSuccess("Login successful! Redirecting...")
      setTimeout(() => {
        if (userData?.role === "admin") {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
      }, 1500)
    } catch (error: any) {
      setError("Login failed: " + error.message)
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Get the current origin for the redirect URL
      const origin = window.location.origin

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.error("Google sign-in error:", error)
        setError(`Google sign-in failed: ${error.message}`)
      } else if (data && data.url) {
        // Redirect to the OAuth URL
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error("Google sign-in exception:", error)
      setError(`Google sign-in failed: ${error.message || "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminKeySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminKeyError("")

    if (adminKey === "12345") {
      setShowAdminModal(false)
      router.push("/admin-login")
    } else {
      setAdminKeyError("Invalid administrator key")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center space-x-2">
            <FaBicycle className="text-3xl text-red-600" />
            <span className="text-2xl font-bold text-red-600">RED Track</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or{" "}
          <Link href="/signup" className="font-medium text-red-600 hover:text-red-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-md text-sm">
              {success}
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              <FaGoogle className="mr-2 h-5 w-5" />
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="xx-xxxxx@g.batstate-u.edu.ph"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Student ID field */}
            <div>
              <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Student ID (SR-Code)
              </label>
              <div className="mt-1">
                <input
                  id="student_id"
                  name="student_id"
                  type="text"
                  required
                  value={formData.student_id}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="xx-xxxxx"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-red-600 hover:text-red-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Administrator Access
                </span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAdminModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FaLock className="mr-2 -ml-1" />
                Sign in as Administrator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Key Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Administrator Access</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please enter the administrator key to access the admin login page.
            </p>

            {adminKeyError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {adminKeyError}
              </div>
            )}

            <form onSubmit={handleAdminKeySubmit}>
              <div className="mb-4">
                <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Administrator Key
                </label>
                <input
                  type="password"
                  id="adminKey"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Enter administrator key"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
