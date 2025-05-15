"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { FaBicycle, FaIdCard } from "react-icons/fa"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ConfirmStudentIdPage() {
  const router = useRouter()
  const [studentId, setStudentId] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push("/login")
        return
      }

      setUser(data.user)
      setEmail(data.user.email || "")

      // Try to extract student ID from email
      if (data.user.email) {
        const emailParts = data.user.email.split("@")
        if (emailParts.length > 0 && /^[0-9]{2}-[0-9]{5}$/.test(emailParts[0])) {
          setStudentId(emailParts[0])
        }
      }
    }

    checkUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validate student ID format
    if (!/^[0-9]{2}-[0-9]{5}$/.test(studentId)) {
      setError("Please enter a valid SR-Code (xx-xxxxx)")
      setIsLoading(false)
      return
    }

    try {
      // Update user profile with student ID
      const { error: updateError } = await supabase.from("users").update({ student_id: studentId }).eq("id", user.id)

      if (updateError) {
        throw updateError
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error updating student ID:", error)
      setError(error.message || "Failed to update student ID")
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <FaBicycle className="text-3xl text-red-600" />
            <span className="text-2xl font-bold text-red-600">RED Track</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">Confirm your SR-Code</h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          We need your SR-Code (Student ID) to complete your registration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                SR-Code (Student ID)
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaIdCard className="text-gray-400" />
                </div>
                <input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="xx-xxxxx"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter your SR-Code in the format xx-xxxxx (e.g., 21-01871)
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Confirm SR-Code"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
