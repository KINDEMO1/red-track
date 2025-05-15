"use client"
import { useState, useEffect } from "react"
import type React from "react"
import { supabase } from "@/lib/supabase"

import {
  FaUser,
  FaEnvelope,
  FaCalendarAlt,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaBan,
  FaUnlock,
  FaSync,
} from "react-icons/fa"

type User = {
  id: string
  student_id: string
  full_name: string
  email: string
  created_at: string
  department?: string
  year?: string
  status: "active" | "suspended" | "pending"
  medicalCertificate?: "approved" | "pending" | "rejected" | "none"
  borrowingCount?: number
  activeBorrowingCount?: number
  phone?: string
  medical_certificates?: {
    id: string
    status: "approved" | "pending" | "rejected"
    created_at: string
    file_url: string
  }[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    department: "",
    year: "",
    status: "active",
  })
  const [error, setError] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    // Filter and search users
    let result = users

    // Apply status filter
    if (filter !== "all") {
      if (filter === "medical-approved") {
        result = result.filter((user) => user.medicalCertificate === "approved")
      } else if (filter === "medical-pending") {
        result = result.filter((user) => user.medicalCertificate === "pending")
      } else if (filter === "medical-rejected") {
        result = result.filter((user) => user.medicalCertificate === "rejected")
      } else {
        result = result.filter((user) => user.status === filter)
      }
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (user) =>
          user.full_name.toLowerCase().includes(term) ||
          user.student_id.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          (user.department && user.department.toLowerCase().includes(term)),
      )
    }

    setFilteredUsers(result)
  }, [users, filter, searchTerm])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError("")

      console.log("Fetching users...")

      // Fetch users with medical certificates
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          *,
          medical_certificates(*)
        `)
        .order("created_at", { ascending: false })

      if (usersError) {
        console.error("Error fetching users:", usersError)
        throw usersError
      }

      console.log("Users fetched:", usersData?.length || 0)

      // Log sample data for debugging
      if (usersData && usersData.length > 0) {
        console.log("Sample user data:", usersData[0])

        // Log medical certificates for the first user
        if (usersData[0].medical_certificates && usersData[0].medical_certificates.length > 0) {
          console.log("Sample user medical certificates:", usersData[0].medical_certificates)
        }
      } else {
        console.log("No users found")
      }

      // Fetch borrowings to count per user
      const { data: borrowingsData, error: borrowingsError } = await supabase
        .from("borrowings")
        .select("user_id, id, status")

      if (borrowingsError) {
        console.error("Error fetching borrowings:", borrowingsError)
        throw borrowingsError
      }

      console.log("Borrowings fetched:", borrowingsData?.length || 0)

      if (borrowingsData && borrowingsData.length > 0) {
        console.log("Sample borrowing data:", borrowingsData[0])
      }

      // Process users and add certificate status and borrowing count
      const enhancedUsers = (usersData || []).map((user: User) => {
        // Determine certificate status from the most recent certificate
        let certificateStatus: "approved" | "pending" | "rejected" | "none" = "none"

        if (user.medical_certificates && user.medical_certificates.length > 0) {
          // Sort certificates by created_at descending
          const sortedCertificates = [...user.medical_certificates].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )

          // Get status of the most recent certificate
          certificateStatus = sortedCertificates[0].status

          console.log(`User ${user.full_name} (${user.id}) most recent certificate status: ${certificateStatus}`)
        } else {
          console.log(`User ${user.full_name} (${user.id}) has no certificates`)
        }

        // Count all borrowings for this user
        const userBorrowings = (borrowingsData || []).filter(
          (borrowing: { user_id: string }) => borrowing.user_id === user.id,
        )

        // Count active borrowings separately
        const activeBorrowings = userBorrowings.filter(
          (borrowing: { status: string }) => borrowing.status === "active" || borrowing.status === "overdue",
        )

        console.log(
          `User ${user.full_name} (${user.id}) has ${userBorrowings.length} total borrowings, ${activeBorrowings.length} active`,
        )

        return {
          ...user,
          medicalCertificate: certificateStatus,
          borrowingCount: userBorrowings.length,
          activeBorrowingCount: activeBorrowings.length,
        }
      })

      setUsers(enhancedUsers)
      setFilteredUsers(enhancedUsers)
    } catch (err: any) {
      console.error("Error in fetchUsers:", err)
      setError(err.message || "Failed to fetch users")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const refreshData = () => {
    setIsRefreshing(true)
    fetchUsers()
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      department: user.department || "",
      year: user.year || "",
      status: user.status,
    })
    setShowModal(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!selectedUser) return

    try {
      console.log("Updating user:", selectedUser.id, "with data:", formData)

      // Update user in Supabase
      const { data, error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          department: formData.department || null,
          year: formData.year || null,
          status: formData.status as "active" | "suspended" | "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id)
        .select()

      if (error) {
        console.error("Error updating user:", error)
        throw error
      }

      console.log("User updated successfully:", data)

      // Update local state
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                full_name: formData.full_name,
                email: formData.email,
                department: formData.department,
                year: formData.year,
                status: formData.status as "active" | "suspended" | "pending",
              }
            : user,
        ),
      )

      setShowModal(false)

      // Refresh data to ensure we have the latest from the database
      setTimeout(() => {
        refreshData()
      }, 500)
    } catch (err: any) {
      console.error("Error in handleSubmit:", err)
      setError(err.message || "Failed to update user")
    }
  }

  const handleSuspendUser = async (id: string) => {
    if (window.confirm("Are you sure you want to suspend this user?")) {
      try {
        console.log("Suspending user:", id)

        // Update user status in Supabase
        const { data, error } = await supabase
          .from("users")
          .update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()

        if (error) {
          console.error("Error suspending user:", error)
          throw error
        }

        console.log("User suspended successfully:", data)

        // Update local state
        setUsers(users.map((user) => (user.id === id ? { ...user, status: "suspended" as const } : user)))

        // Refresh data to ensure we have the latest from the database
        setTimeout(() => {
          refreshData()
        }, 500)
      } catch (err: any) {
        console.error("Error in handleSuspendUser:", err)
        setError(err.message || "Failed to suspend user")
      }
    }
  }

  const handleActivateUser = async (id: string) => {
    try {
      console.log("Activating user:", id)

      // Update user status in Supabase
      const { data, error } = await supabase
        .from("users")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()

      if (error) {
        console.error("Error activating user:", error)
        throw error
      }

      console.log("User activated successfully:", data)

      // Update local state
      setUsers(users.map((user) => (user.id === id ? { ...user, status: "active" as const } : user)))

      // Refresh data to ensure we have the latest from the database
      setTimeout(() => {
        refreshData()
      }, 500)
    } catch (err: any) {
      console.error("Error in handleActivateUser:", err)
      setError(err.message || "Failed to activate user")
    }
  }

  const getMedicalCertificateStatus = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            <FaCheckCircle className="mr-1 mt-0.5" /> Approved
          </span>
        )
      case "rejected":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <FaTimesCircle className="mr-1 mt-0.5" /> Rejected
          </span>
        )
      case "pending":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
            Pending
          </span>
        )
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400">
            None
          </span>
        )
    }
  }

  const getUserStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            Active
          </span>
        )
      case "suspended":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            Suspended
          </span>
        )
      case "pending":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
            Pending
          </span>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Users</h1>

        <div className="flex items-center space-x-2">
          <button
            onClick={refreshData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            disabled={isRefreshing}
          >
            <FaSync className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-md mb-4">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white w-full"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "all" ? "bg-red-600 text-white" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "active"
                ? "bg-red-600 text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("suspended")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "suspended"
                ? "bg-red-600 text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Suspended
          </button>
          <button
            onClick={() => setFilter("medical-approved")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "medical-approved"
                ? "bg-red-600 text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Medical Approved
          </button>
          <button
            onClick={() => setFilter("medical-pending")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "medical-pending"
                ? "bg-red-600 text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Medical Pending
          </button>
          <button
            onClick={() => setFilter("medical-rejected")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "medical-rejected"
                ? "bg-red-600 text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Medical Rejected
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Student
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Contact
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Department
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Medical Certificate
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Borrowings
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <FaUser className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">ID: {user.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <FaEnvelope className="text-gray-400 mr-2" />
                          {user.email}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <FaCalendarAlt className="text-gray-400 mr-2" />
                          Registered: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.department || "Not specified"}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.year ? `Year ${user.year}` : "Not specified"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getMedicalCertificateStatus(user.medicalCertificate || "none")}
                      {user.medical_certificates && user.medical_certificates.length > 0 && (
                        <div className="mt-1">
                          <a
                            href={user.medical_certificates[0].file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Certificate
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getUserStatusBadge(user.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        Total: {user.borrowingCount || 0} {user.borrowingCount === 1 ? "time" : "times"}
                      </div>
                      {(user.activeBorrowingCount ?? 0) > 0 && (
                        <div className="mt-1 text-green-600 dark:text-green-400 font-medium">
                          Active: {user.activeBorrowingCount}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                      >
                        <FaEdit className="inline mr-1" /> Edit
                      </button>
                      {user.status === "active" ? (
                        <button
                          onClick={() => handleSuspendUser(user.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <FaBan className="inline mr-1" /> Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(user.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        >
                          <FaUnlock className="inline mr-1" /> Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No users found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <form onSubmit={handleSubmit}>
              <div className="px-4 pt-5 pb-4 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Edit User - {selectedUser.full_name}
                    </h3>
                    <div className="mt-4 grid grid-cols-1 gap-y-4">
                      <div>
                        <label
                          htmlFor="full_name"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          id="full_name"
                          required
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="department"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Department
                        </label>
                        <select
                          id="department"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select Department</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Business">Business</option>
                          <option value="Arts">Arts</option>
                          <option value="Medicine">Medicine</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Year of Study
                        </label>
                        <select
                          id="year"
                          name="year"
                          value={formData.year}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select Year</option>
                          <option value="1">First Year</option>
                          <option value="2">Second Year</option>
                          <option value="3">Third Year</option>
                          <option value="4">Fourth Year</option>
                          <option value="5">Fifth Year or Above</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Account Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
