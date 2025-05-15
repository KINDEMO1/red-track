"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function ExtractHash() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Function to extract code from hash and redirect
    const extractCodeAndRedirect = () => {
      try {
        // Get the hash fragment
        const hash = window.location.hash

        if (hash && hash.length > 1) {
          // Parse the hash fragment
          const hashParams = new URLSearchParams(hash.substring(1))
          const code = hashParams.get("code")
          const accessToken = hashParams.get("access_token")

          if (code) {
            // If we have a code, redirect to the callback with the code as a query parameter
            window.location.href = `/auth/callback?code=${encodeURIComponent(code)}`
            return
          } else if (accessToken) {
            // If we have an access token but no code, we need to handle this differently
            // This is a simplified approach - in a real app, you might want to use the Supabase JS client
            // to set the session directly
            window.location.href = `/auth/token?access_token=${encodeURIComponent(accessToken)}`
            return
          }
        }

        // If we couldn't find a code or access token, show an error
        setError("No authentication code or token found in the URL")
      } catch (err) {
        console.error("Error extracting hash:", err)
        setError("Error processing authentication response")
      }
    }

    // Run the extraction function
    extractCodeAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Processing authentication...</h2>
          {error ? (
            <div className="mt-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Return to login
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-600">Please wait while we complete your sign-in...</p>
          )}
        </div>
      </div>
    </div>
  )
}
