"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FaBicycle, FaHome, FaFileAlt, FaUser, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa"

type User = {
  studentId: string
  name: string
  email: string
  isLoggedIn: boolean
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      router.push("/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const closeSidebar = () => {
    setIsOpen(false)
  }

  if (!user) {
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
            <span className="text-xl font-bold">RED Track</span>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <FaUser className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.studentId}</p>
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
