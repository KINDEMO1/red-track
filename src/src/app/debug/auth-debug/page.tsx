"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"

export default function AuthDebugPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [apiUserData, setApiUserData] = useState<any>(null)
  const [dbUserData, setDbUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Get session
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        setSessionData(session)

        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`)
        }

        if (!session.session) {
          setError("No active session found")
          setLoading(false)
          return
        }

        // Get user
        const { data: user, error: userError } = await supabase.auth.getUser()
        setUserData(user)

        if (userError) {
          throw new Error(`User error: ${userError.message}`)
        }

        // Get user from API
        try {
          const response = await fetch("/api/auth/user")
          const data = await response.json()
          setApiUserData(data)
        } catch (apiError: any) {
          console.error("API error:", apiError)
          setError(`API error: ${apiError.message}`)
        }

        // Get user from database directly
        if (user.user) {
          const { data: dbUser, error: dbError } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.user.id)
            .maybeSingle()

          setDbUserData(dbUser)

          if (dbError && dbError.code !== "PGRST116") {
            console.error("DB error:", dbError)
          }
        }
      } catch (error: any) {
        console.error("Debug error:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Debug</h1>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Authentication Debug</h1>
          <div className="space-x-2">
            <button onClick={handleRefresh} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Refresh
            </button>
            <button onClick={handleSignOut} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md">
            <h2 className="font-bold">Error</h2>
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Session</h2>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-sm text-gray-800 dark:text-gray-200">{JSON.stringify(sessionData, null, 2)}</pre>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Auth User</h2>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-sm text-gray-800 dark:text-gray-200">{JSON.stringify(userData, null, 2)}</pre>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">API User Data</h2>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-sm text-gray-800 dark:text-gray-200">{JSON.stringify(apiUserData, null, 2)}</pre>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Database User</h2>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-sm text-gray-800 dark:text-gray-200">
                {dbUserData ? JSON.stringify(dbUserData, null, 2) : "No database record found"}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-md">
          <h2 className="font-bold">Troubleshooting Tips</h2>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Check if the session exists and is valid</li>
            <li>Verify that the user ID in auth matches the database</li>
            <li>Ensure the email format meets your application requirements</li>
            <li>Check for RLS policy issues if database queries fail</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
