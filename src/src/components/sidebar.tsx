"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { FaHome, FaFileAlt, FaBicycle, FaUser, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

interface SidebarProps {
  handleLogout?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ handleLogout }) => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserData() {
      try {
        setIsLoading(true)
        setError(null)

        // Get the user from auth
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError || !userData.user) {
          console.error("User error:", userError)
          setError("Failed to get user data")
          setIsLoading(false)
          return
        }

        // Try to get user profile from API
        try {
          const response = await fetch("/api/auth/user")
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
          }

          const data = await response.json()
          if (data.user) {
            setUserProfile(data.user)
          } else {
            throw new Error("No user data returned from API")
          }
        } catch (apiError) {
          console.error("API error:", apiError)

          // Create a fallback profile
          setUserProfile({
            id: userData.user.id,
            email: userData.user.email,
            full_name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || "User",
            student_id: userData.user.email?.split("@")[0] || "",
            role: "student",
          })
        }
      } catch (error: any) {
        console.error("Error fetching user data:", error)
        setError(`Error: ${error.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const closeSidebar = () => {
    setIsOpen(false)
  }

  const defaultHandleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Extract username from email (e.g., john.doe@example.com -> John Doe)
  const formatUsername = (email: string | null) => {
    if (!email) return "User"
    const username = email.split("@")[0]
    return username
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  }

  if (isLoading) {
    return (
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 md:hidden bg-red-600 text-white p-2 rounded-md"
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={closeSidebar}></div>}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-red-600 text-white">
            <FaBicycle className="text-2xl mr-2" />
            <span className="text-xl font-bold">RED Track</span>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <FaUser className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {userProfile?.full_name || formatUsername(userProfile?.email) || "User"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userProfile?.student_id || userProfile?.email?.split("@")[0] || userProfile?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/dashboard"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaHome className="mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/documents"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/dashboard/documents"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaFileAlt className="mr-3" />
                  My Documents
                </Link>
              </li>
              <li>
                <Link
                  href="/medical"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/medical"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaFileAlt className="mr-3" />
                  Upload Medical Certificate
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/bicycles"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/dashboard/bicycles"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaBicycle className="mr-3" />
                  Available Bicycles
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/profile"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/dashboard/profile"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaUser className="mr-3" />
                  My Profile
                </Link>
              </li>
            </ul>
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout || defaultHandleLogout}
              className="flex items-center w-full p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-700"
            >
              <FaSignOutAlt className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
