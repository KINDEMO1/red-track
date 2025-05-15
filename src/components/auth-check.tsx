"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface AuthCheckProps {
  children: React.ReactNode
  adminOnly?: boolean
  redirectTo?: string
}

export default function AuthCheck({ children, adminOnly = false, redirectTo = "/login" }: AuthCheckProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const isAdminRoute = adminOnly || pathname?.startsWith("/admin")

  useEffect(() => {
    const supabase = createClientComponentClient()
    let mounted = true

    const checkAuth = async () => {
      try {
        // Check session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Session error:", error)
          if (mounted) {
            setIsAuthenticated(false)
            setIsLoading(false)
          }
          return
        }

        if (!session) {
          console.log("No session found")
          if (mounted) {
            setIsAuthenticated(false)
            setIsLoading(false)
          }
          return
        }

        // Check if admin verification is required
        if (isAdminRoute) {
          // Get admin status from localStorage
          const isAdminFromStorage = localStorage.getItem("isAdmin") === "true"
          const adminVerifiedAt = Number.parseInt(localStorage.getItem("adminVerifiedAt") || "0", 10)

          // Admin verification expires after 12 hours
          const isAdminVerified = isAdminFromStorage && Date.now() - adminVerifiedAt < 12 * 60 * 60 * 1000

          if (isAdminVerified) {
            if (mounted) {
              setIsAdmin(true)
              setIsAuthenticated(true)
              setIsLoading(false)
            }
          } else {
            console.log("Admin verification required or expired")
            if (mounted) {
              setIsAdmin(false)
              setIsAuthenticated(true)
              setIsLoading(false)
            }
            router.push("/admin-login?message=Admin verification required")
          }
        } else {
          // Regular authenticated route
          if (mounted) {
            setIsAuthenticated(true)
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error("Auth check error:", error)
        if (mounted) {
          setIsAuthenticated(false)
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Clear admin status on sign out
        localStorage.removeItem("isAdmin")
        localStorage.removeItem("adminVerifiedAt")

        if (mounted) {
          setIsAuthenticated(false)
          setIsAdmin(false)
        }
      }

      // Recheck auth status
      checkAuth()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, isAdminRoute, redirectTo, pathname])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">You need to be logged in to access this page.</p>
          <button
            onClick={() => router.push(isAdminRoute ? "/admin-login" : redirectTo)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Redirect if admin required but not admin
  if (isAdminRoute && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">You need admin privileges to access this page.</p>
          <button
            onClick={() => router.push("/admin-login")}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    )
  }

  // Render children if authenticated
  return <>{children}</>
}
