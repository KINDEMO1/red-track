"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FaBicycle,
  FaHome,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaUsers,
  FaClipboardCheck,
  FaChartLine,
  FaCog,
} from "react-icons/fa"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

type Admin = {
  id: string
  email: string
  full_name: string
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClientComponentClient()

    // Check if admin key is valid
    const isAdmin = localStorage.getItem("isAdmin") === "true"
    const adminVerifiedAt = Number.parseInt(localStorage.getItem("adminVerifiedAt") || "0", 10)
    const isAdminVerified = isAdmin && Date.now() - adminVerifiedAt < 12 * 60 * 60 * 1000

    if (!isAdminVerified) {
      console.log("Admin verification expired or not found")
      setError("Admin verification required")
      setIsLoading(false)
      router.push("/admin-login?message=Admin verification required")
      return
    }

    // Load user data
    const loadAdminData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if user is logged in
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Admin session error:", sessionError)
          setError("Session error")
          router.push("/admin-login")
          return
        }

        if (!session) {
          console.log("No admin session found")
          setError("No session")
          router.push("/admin-login")
          return
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, email, full_name")
          .eq("id", session.user.id)
          .single()

        if (profileError) {
          console.error("Admin profile error:", profileError)

          // If the profile doesn't exist, create a minimal profile from session data
          const userProfile = {
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Admin User",
          }

          setAdmin(userProfile)
          setIsLoading(false)
          return
        }

        setAdmin(profile as Admin)
      } catch (error) {
        console.error("Error loading admin data:", error)
        setError("Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    // Load admin data immediately
    loadAdminData()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClientComponentClient()

    // Clear admin status
    localStorage.removeItem("isAdmin")
    localStorage.removeItem("adminVerifiedAt")

    // Sign out
    await supabase.auth.signOut()
    router.push("/admin-login")
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const closeSidebar = () => {
    setIsOpen(false)
  }

  // Show a minimal loading state instead of null
  if (isLoading) {
    return (
      <aside className="fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out -translate-x-full md:translate-x-0">
        <div className="flex items-center justify-center h-16 bg-red-600 text-white">
          <FaBicycle className="text-2xl mr-2" />
          <span className="text-xl font-bold">RED Track Admin</span>
        </div>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </aside>
    )
  }

  // If error, show error state
  if (error) {
    return (
      <aside className="fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out -translate-x-full md:translate-x-0">
        <div className="flex items-center justify-center h-16 bg-red-600 text-white">
          <FaBicycle className="text-2xl mr-2" />
          <span className="text-xl font-bold">RED Track Admin</span>
        </div>
        <div className="flex flex-col justify-center items-center h-full p-4">
          <p className="text-red-600 mb-4">Authentication error</p>
          <button
            onClick={() => router.push("/admin-login")}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </aside>
    )
  }

  // If not logged in and not loading, don't render the sidebar
  if (!admin) {
    return null
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
            <span className="text-xl font-bold">RED Track Admin</span>
          </div>

          {/* Admin info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <FaUsers className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{admin.full_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Administrator</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/admin"
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
                  href="/admin/medical-certificates"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/admin/medical-certificates"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaClipboardCheck className="mr-3" />
                  Medical Certificates
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/bicycles"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/admin/bicycles"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaBicycle className="mr-3" />
                  Manage Bicycles
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/borrowings"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/admin/borrowings"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaChartLine className="mr-3" />
                  Borrowing Records
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/admin/users"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaUsers className="mr-3" />
                  Manage Users
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className={`flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 ${
                    pathname === "/admin/settings"
                      ? "bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={closeSidebar}
                >
                  <FaCog className="mr-3" />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
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
