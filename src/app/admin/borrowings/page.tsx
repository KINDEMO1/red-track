"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
  FaSync,
  FaUser,
  FaBicycle,
  FaEye,
  FaCheck,
} from "react-icons/fa"

type Borrowing = {
  id: string
  bicycle_id: string
  user_id: string
  borrow_date: string
  expected_return_date: string
  return_date: string | null
  status: "active" | "returned" | "overdue"
  created_at: string
  updated_at: string
  bicycles: {
    id: string
    name: string
    type: string
    location: string
    image_url: string | null
    is_available: boolean
  }
  users: {
    id: string
    full_name: string
    email: string
    student_id: string
  }
}

export default function BorrowingsPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [filteredBorrowings, setFilteredBorrowings] = useState<Borrowing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "returned" | "overdue">("all")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchBorrowings()
  }, [])

  useEffect(() => {
    filterBorrowings()
  }, [borrowings, searchTerm, statusFilter, dateFilter])

  const fetchBorrowings = async () => {
    try {
      setIsLoading(true)
      setError("")

      console.log("Fetching borrowings...")

      // First try the API endpoint
      try {
        const response = await fetch("/api/admin/borrowings")
        if (response.ok) {
          const data = await response.json()
          console.log("Borrowings fetched from API:", data.borrowings?.length || 0)

          if (data.borrowings && data.borrowings.length > 0) {
            setBorrowings(data.borrowings)
            setFilteredBorrowings(data.borrowings)
            setIsLoading(false)
            setIsRefreshing(false)
            return
          }
        }
      } catch (apiError) {
        console.error("Error fetching from API, falling back to direct query:", apiError)
      }

      // Fallback to direct query if API fails
      const { data, error } = await supabase
        .from("borrowings")
        .select(`
          *,
          bicycles (*),
          users (*)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching borrowings:", error)
        throw error
      }

      console.log("Borrowings fetched directly:", data?.length || 0)

      // Log sample data for debugging
      if (data && data.length > 0) {
        console.log("Sample borrowing data:", data[0])
      } else {
        console.log("No borrowings found")

        // If no borrowings found, check if there are bicycles marked as unavailable
        const { data: bicycles, error: bicyclesError } = await supabase
          .from("bicycles")
          .select("*")
          .eq("is_available", false)

        if (!bicyclesError && bicycles && bicycles.length > 0) {
          console.log("Found unavailable bicycles but no borrowings:", bicycles)
          setError(
            "Found bicycles marked as unavailable but no corresponding borrowing records. Database inconsistency detected.",
          )
        }
      }

      // Process the data
      const processedData =
        data?.map((borrowing) => ({
          ...borrowing,
          bicycles: borrowing.bicycles || {},
          users: borrowing.users || {},
        })) || []

      // Check for overdue borrowings and update their status
      const now = new Date()
      const updatedBorrowings = processedData.map((borrowing) => {
        if (
          borrowing.status === "active" &&
          !borrowing.return_date &&
          borrowing.expected_return_date &&
          new Date(borrowing.expected_return_date) < now
        ) {
          updateBorrowingStatus(borrowing.id, "overdue")
          return { ...borrowing, status: "overdue" }
        }
        return borrowing
      })

      setBorrowings(updatedBorrowings)
      setFilteredBorrowings(updatedBorrowings)
    } catch (err: any) {
      console.error("Error in fetchBorrowings:", err)
      setError(err.message || "Failed to fetch borrowings")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const updateBorrowingStatus = async (id: string, status: string) => {
    try {
      console.log(`Updating borrowing ${id} status to ${status}`)

      const { data, error } = await supabase
        .from("borrowings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()

      if (error) {
        console.error("Error updating borrowing status:", error)
      } else {
        console.log("Borrowing status updated successfully:", data)
      }
    } catch (err) {
      console.error("Error in updateBorrowingStatus:", err)
    }
  }

  const refreshData = () => {
    setIsRefreshing(true)
    fetchBorrowings()
  }

  const filterBorrowings = () => {
    let filtered = [...borrowings]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((borrowing) => borrowing.status === statusFilter)
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)

      filtered = filtered.filter((borrowing) => {
        const borrowDate = new Date(borrowing.borrow_date)
        if (dateFilter === "today") {
          return borrowDate >= today
        } else if (dateFilter === "week") {
          return borrowDate >= weekAgo
        } else if (dateFilter === "month") {
          return borrowDate >= monthAgo
        }
        return true
      })
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (borrowing) =>
          (borrowing.bicycles?.name && borrowing.bicycles.name.toLowerCase().includes(term)) ||
          (borrowing.users?.full_name && borrowing.users.full_name.toLowerCase().includes(term)) ||
          (borrowing.users?.email && borrowing.users.email.toLowerCase().includes(term)) ||
          (borrowing.users?.student_id && borrowing.users.student_id.toLowerCase().includes(term)),
      )
    }

    setFilteredBorrowings(filtered)
  }

  const handleReturn = async () => {
    if (!selectedBorrowing) return

    try {
      setIsSubmitting(true)
      setError("")

      const returnDate = new Date().toISOString()

      console.log(`Marking borrowing ${selectedBorrowing.id} as returned`)

      // Update borrowing status to returned
      const { data: borrowingData, error: borrowingError } = await supabase
        .from("borrowings")
        .update({
          status: "returned",
          return_date: returnDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBorrowing.id)
        .select()

      if (borrowingError) {
        console.error("Error updating borrowing:", borrowingError)
        throw borrowingError
      }

      console.log("Borrowing marked as returned:", borrowingData)

      // Update bicycle availability
      const { data: bicycleData, error: bicycleError } = await supabase
        .from("bicycles")
        .update({
          is_available: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBorrowing.bicycle_id)
        .select()

      if (bicycleError) {
        console.error("Error updating bicycle:", bicycleError)
        throw bicycleError
      }

      console.log("Bicycle marked as available:", bicycleData)

      // Update local state
      setBorrowings(
        borrowings.map((borrowing) =>
          borrowing.id === selectedBorrowing.id
            ? { ...borrowing, status: "returned", return_date: returnDate }
            : borrowing,
        ),
      )

      setShowReturnModal(false)
      setSelectedBorrowing(null)

      // Refresh data to ensure we have the latest from the database
      setTimeout(() => {
        refreshData()
      }, 500)
    } catch (err: any) {
      console.error("Error returning bicycle:", err)
      setError(err.message || "Failed to mark bicycle as returned")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            Active
          </span>
        )
      case "returned":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
            <FaCheck className="mr-1 mt-0.5" /> Returned
          </span>
        )
      case "overdue":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <FaExclamationTriangle className="mr-1 mt-0.5" /> Overdue
          </span>
        )
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400">
            Unknown
          </span>
        )
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bicycle Borrowings</h1>
        <div className="flex space-x-2">
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-4">
        <div className="relative w-full md:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search borrowings..."
            className="pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <select
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaFilter className="text-gray-400" />
            </div>
          </div>
          <div className="relative w-full md:w-auto">
            <select
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white appearance-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaCalendarAlt className="text-gray-400" />
            </div>
          </div>
        </div>
      </div>

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
                  Bicycle
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Borrow Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Expected Return
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBorrowings.length > 0 ? (
                filteredBorrowings.map((borrowing) => (
                  <tr key={borrowing.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <FaUser className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {borrowing.users?.full_name || "Unknown User"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowing.users?.email || "No email"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {borrowing.users?.student_id || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          {borrowing.bicycles?.image_url ? (
                            <img
                              src={borrowing.bicycles.image_url || "/placeholder.svg"}
                              alt={borrowing.bicycles.name || "Bicycle"}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <FaBicycle className="text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {borrowing.bicycles?.name || "Unknown Bicycle"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowing.bicycles?.type || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Location: {borrowing.bicycles?.location || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(borrowing.borrow_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(borrowing.expected_return_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(borrowing.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBorrowing(borrowing)
                            setShowViewModal(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {(borrowing.status === "active" || borrowing.status === "overdue") && (
                          <button
                            onClick={() => {
                              setSelectedBorrowing(borrowing)
                              setShowReturnModal(true)
                            }}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            title="Mark as Returned"
                          >
                            <FaCheck />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No borrowings found
                    {error ? null : (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            // Check for data inconsistency
                            checkDataConsistency()
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Check for data inconsistency
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedBorrowing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Borrowing Details</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Student</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedBorrowing.users?.full_name || "Unknown User"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedBorrowing.users?.email || "No email"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {selectedBorrowing.users?.student_id || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bicycle</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedBorrowing.bicycles?.name || "Unknown Bicycle"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBorrowing.bicycles?.type || "N/A"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Location: {selectedBorrowing.bicycles?.location || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Borrow Date</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(selectedBorrowing.borrow_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Return Date</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(selectedBorrowing.expected_return_date).toLocaleDateString()}
                </p>
              </div>

              {selectedBorrowing.return_date && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Return Date</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedBorrowing.return_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <div className="mt-1">{getStatusBadge(selectedBorrowing.status)}</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Close
              </button>
              {(selectedBorrowing.status === "active" || selectedBorrowing.status === "overdue") && (
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false)
                    setShowReturnModal(true)
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Mark as Returned
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedBorrowing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Mark as Returned</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to mark this bicycle as returned?
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bicycle</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedBorrowing.bicycles?.name || "Unknown Bicycle"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Student</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedBorrowing.users?.full_name || "Unknown User"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Borrow Date</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(selectedBorrowing.borrow_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Return Date</p>
                <p className="text-sm text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturn}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Function to check for data inconsistency
  async function checkDataConsistency() {
    setIsLoading(true)
    setError("")

    try {
      // Check for bicycles marked as unavailable
      const { data: bicycles, error: bicyclesError } = await supabase
        .from("bicycles")
        .select("*")
        .eq("is_available", false)

      if (bicyclesError) {
        throw bicyclesError
      }

      if (bicycles && bicycles.length > 0) {
        console.log("Found unavailable bicycles:", bicycles)

        // For each unavailable bicycle, create a borrowing record if none exists
        for (const bicycle of bicycles) {
          const { data: existingBorrowings, error: borrowingCheckError } = await supabase
            .from("borrowings")
            .select("id")
            .eq("bicycle_id", bicycle.id)
            .eq("status", "active")

          if (borrowingCheckError) {
            console.error("Error checking for existing borrowings:", borrowingCheckError)
            continue
          }

          if (!existingBorrowings || existingBorrowings.length === 0) {
            console.log(`Creating missing borrowing record for bicycle ${bicycle.id}`)

            // Get the first user
            const { data: users, error: usersError } = await supabase.from("users").select("id").limit(1)

            if (usersError || !users || users.length === 0) {
              console.error("Error getting user for borrowing:", usersError)
              continue
            }

            const userId = users[0].id
            const now = new Date()
            const expectedReturn = new Date()
            expectedReturn.setDate(now.getDate() + 3) // 3 days from now

            // Create a borrowing record
            const { data: newBorrowing, error: createError } = await supabase
              .from("borrowings")
              .insert({
                bicycle_id: bicycle.id,
                user_id: userId,
                borrow_date: now.toISOString(),
                expected_return_date: expectedReturn.toISOString(),
                status: "active",
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
              })
              .select()

            if (createError) {
              console.error("Error creating borrowing record:", createError)
              setError(`Failed to create borrowing record: ${createError.message}`)
            } else {
              console.log("Created borrowing record:", newBorrowing)
              setError("Fixed data inconsistency. Refresh to see the new borrowing record.")
            }
          }
        }
      } else {
        setError("No unavailable bicycles found. The dashboard may be showing incorrect information.")
      }
    } catch (err: any) {
      console.error("Error checking data consistency:", err)
      setError(`Error checking data consistency: ${err.message}`)
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        refreshData()
      }, 1000)
    }
  }
}
