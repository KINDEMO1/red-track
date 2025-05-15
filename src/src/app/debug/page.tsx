"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function DebugPage() {
  const [userTableInfo, setUserTableInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRecord, setUserRecord] = useState<any>(null)

  useEffect(() => {
    async function fetchDebugInfo() {
      try {
        setLoading(true)

        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        setCurrentUser(userData.user)

        if (userData.user) {
          // Get user record from database
          const { data: userRecord, error: recordError } = await supabase
            .from("users")
            .select("*")
            .eq("id", userData.user.id)
            .single()

          if (!recordError) {
            setUserRecord(userRecord)
          }
        }

        // Get column information for users table
        const { data, error } = await supabase.rpc("get_column_info", { table_name: "users" })
        if (error) {
          console.error("Error fetching column info:", error)
          // Try a direct query instead
          const { data: columns, error: columnsError } = await supabase.from("users").select("*").limit(1)

          if (columnsError) throw columnsError

          // Just show the column names from the result
          const columnInfo = Object.keys(columns[0] || {}).map((col) => ({ column_name: col }))
          setUserTableInfo(columnInfo)
        } else {
          setUserTableInfo(data)
        }
      } catch (err: any) {
        console.error("Debug error:", err)
        setError(err.message || "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchDebugInfo()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Current User (Auth)</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">{JSON.stringify(currentUser, null, 2)}</pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">User Record (Database)</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">{JSON.stringify(userRecord, null, 2)}</pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Users Table Columns</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(userTableInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
