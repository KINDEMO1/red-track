"use client"
import { useState, useEffect } from "react"
import type React from "react"
import { FaBicycle } from "react-icons/fa"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"

// This should be an environment variable in production
const ADMIN_KEY = "redtrack2025"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams?.get("message")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    adminKey: "",
  })
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<"password" | "google">("password")

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (message) {
      setError(message)
    }
  }, [message])

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Session check error:", error)
        return
      }

      if (data.session) {
        // User is logged in - we'll still need the admin key
        setLoginMethod("google")
        setSuccessMessage("You're logged in. Please enter the admin key to continue.")
      }
    }

    checkUser()
  }, [])

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
    setSuccessMessage("")
    setIsLoading(true)

    try {
      // First, verify the admin key
      if (formData.adminKey !== ADMIN_KEY) {
        setError("Invalid admin key")
        setIsLoading(false)
        return
      }

      // If we're already logged in (Google method), just verify the admin key and proceed
      if (loginMethod === "google") {
        const { data: session } = await supabase.auth.getSession()

        if (!session.session) {
          setError("Session expired. Please sign in again.")
          setIsLoading(false)
          return
        }

        // Store admin status in localStorage
        localStorage.setItem("isAdmin", "true")
        localStorage.setItem("adminVerifiedAt", Date.now().toString())

        // Navigate to admin dashboard
        router.push("/admin")
        return
      }

      // For password login, validate the email
      if (!validateBatstateEmail(formData.email)) {
        setError("Please use your Batstate-U email (xx-xxxxx@g.batstate-u.edu.ph)")
        setIsLoading(false)
        return
      }

      // Attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Store admin status in localStorage
        localStorage.setItem("isAdmin", "true")
        localStorage.setItem("adminVerifiedAt", Date.now().toString())

        // Navigate to admin dashboard
        router.push("/admin")
      }
    } catch (error: any) {
      setError("Login failed. Please try again.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/admin-login`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (error: any) {
      setError("Google sign in failed. Please try again.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Link href="/" className="flex items-center space-x-2">
              <FaBicycle className="text-3xl text-red-600" />
              <span className="text-2xl font-bold text-red-600">RED Track</span>
            </Link>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">Admin Login</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Access the administrative dashboard
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-md text-sm">
                {successMessage}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {loginMethod === "password" && (
                <>
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
                </>
              )}

              <div>
                <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Admin Key
                </label>
                <div className="mt-1">
                  <input
                    id="adminKey"
                    name="adminKey"
                    type="password"
                    required
                    value={formData.adminKey}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="Enter admin key"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Access Admin Dashboard"}
                </button>
              </div>
            </form>

            {loginMethod === "password" && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    disabled={isLoading}
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path
                          fill="#4285F4"
                          d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                        />
                        <path
                          fill="#34A853"
                          d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                        />
                      </g>
                    </svg>
                    Sign in with Google
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
