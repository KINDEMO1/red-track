"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { FaBicycle, FaUsers, FaClipboardCheck, FaCheckCircle, FaChartLine, FaExclamationTriangle } from "react-icons/fa"
import { supabase } from "@/lib/supabase"

type DashboardStats = {
  totalBicycles: number
  availableBicycles: number
  activeBorrowings: number
  pendingCertificates: number
  totalUsers: number
}

type RecentActivity = {
  id: string
  type: "borrowing" | "return" | "certificate" | "registration"
  user: string
  timestamp: string
  details: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBicycles: 0,
    availableBicycles: 0,
    activeBorrowings: 0,
    pendingCertificates: 0,
    totalUsers: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataConsistencyIssue, setDataConsistencyIssue] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true)

        // First try the API endpoint
        try {
          const response = await fetch("/api/admin/dashboard")
          if (response.ok) {
            const data = await response.json()
            console.log("Dashboard data from API:", data)

            if (data.stats) {
              setStats(data.stats)
            }

            if (data.dataConsistencyIssue) {
              setDataConsistencyIssue(data.dataConsistencyIssue.details)
            }

            // Fetch recent activity
            await fetchRecentActivity()
            return
          }
        } catch (apiError) {
          console.error("Error fetching from API, falling back to direct query:", apiError)
        }

        // Fetch bicycle stats
        const { data: bicycles, error: bicyclesError } = await supabase.from("bicycles").select("id, is_available")

        if (bicyclesError) throw bicyclesError

        const totalBicycles = bicycles?.length || 0
        const availableBicycles = bicycles?.filter((b) => b.is_available)?.length || 0

        // Fetch active borrowings
        const { data: activeBorrowings, error: borrowingsError } = await supabase
          .from("borrowings")
          .select("id")
          .eq("status", "active")

        if (borrowingsError) throw borrowingsError

        // Fetch pending certificates
        const { data: pendingCertificates, error: certificatesError } = await supabase
          .from("medical_certificates")
          .select("id")
          .eq("status", "pending")

        if (certificatesError) throw certificatesError

        // Fetch total users
        const { data: users, error: usersError } = await supabase.from("users").select("id")

        if (usersError) throw usersError

        // Check for data inconsistency
        const unavailableBicycles = bicycles?.filter((b) => !b.is_available)?.length || 0
        const activeBorrowingsCount = activeBorrowings?.length || 0

        if (unavailableBicycles !== activeBorrowingsCount) {
          setDataConsistencyIssue(
            `${unavailableBicycles} bicycles are marked as unavailable, but there are ${activeBorrowingsCount} active borrowings.`,
          )
        }

        // Update stats
        setStats({
          totalBicycles,
          availableBicycles,
          activeBorrowings: activeBorrowings?.length || 0,
          pendingCertificates: pendingCertificates?.length || 0,
          totalUsers: users?.length || 0,
        })

        // Fetch recent activity
        await fetchRecentActivity()
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  async function fetchRecentActivity() {
    try {
      // Fetch recent borrowings
      const { data: recentBorrowings, error: borrowingsError } = await supabase
        .from("borrowings")
        .select(`
          id,
          borrow_date,
          status,
          return_date,
          bicycle_id,
          user_id,
          bicycles!bicycle_id (name, location),
          users!user_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5)

      if (borrowingsError) throw borrowingsError

      // Fetch recent certificates
      const { data: recentCertificates, error: certificatesError } = await supabase
        .from("medical_certificates")
        .select(`
          id,
          upload_date,
          status,
          user_id,
          users!user_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(3)

      if (certificatesError) throw certificatesError

      // Fetch recent user registrations
      const { data: recentUsers, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(3)

      if (usersError) throw usersError

      // Combine and format activities
      const activities: RecentActivity[] = []

      // Format borrowings
      if (recentBorrowings) {
        recentBorrowings.forEach((borrowing) => {
          const activityType: "borrowing" | "return" = borrowing.return_date ? "return" : "borrowing"
          const userName = borrowing.users?.[0]?.full_name || "Unknown User"
          const bicycleName = borrowing.bicycles?.[0]?.name || "a bicycle"
          const bicycleLocation = borrowing.bicycles?.[0]?.location || "storage"

          activities.push({
            id: `borrowing-${borrowing.id}`,
            type: activityType,
            user: userName,
            timestamp: new Date(borrowing.borrow_date || borrowing.return_date).toLocaleString(),
            details:
              activityType === "return"
                ? `Returned ${bicycleName} to ${bicycleLocation}`
                : `Borrowed ${bicycleName} from ${bicycleLocation}`,
          })
        })
      }

      // Format certificates
      if (recentCertificates) {
        recentCertificates.forEach((cert) => {
          const userName = cert.users?.[0]?.full_name || "Unknown User"
          activities.push({
            id: `cert-${cert.id}`,
            type: "certificate",
            user: userName,
            timestamp: new Date(cert.upload_date).toLocaleString(),
            details: `Submitted medical certificate for approval (${cert.status})`,
          })
        })
      }

      // Format user registrations
      if (recentUsers) {
        recentUsers.forEach((user) => {
          activities.push({
            id: `user-${user.id}`,
            type: "registration",
            user: user.full_name || "Unknown User",
            timestamp: new Date(user.created_at).toLocaleString(),
            details: "New user registration completed",
          })
        })
      }

      // Sort by timestamp (newest first)
      activities.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      // Take only the 5 most recent activities
      setRecentActivity(activities.slice(0, 5))
    } catch (err: any) {
      console.error("Error fetching recent activity:", err)
      setError(err.message)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "borrowing":
        return <FaBicycle className="text-blue-500" />
      case "return":
        return <FaCheckCircle className="text-green-500" />
      case "certificate":
        return <FaClipboardCheck className="text-yellow-500" />
      case "registration":
        return <FaUsers className="text-purple-500" />
      default:
        return <FaChartLine className="text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-md">
        Error loading dashboard data: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

      {dataConsistencyIssue && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 p-4 rounded-md flex items-start">
          <FaExclamationTriangle className="text-yellow-600 dark:text-yellow-500 mt-1 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">Data Inconsistency Detected</p>
            <p>{dataConsistencyIssue}</p>
            <Link href="/admin/borrowings" className="text-red-600 dark:text-red-400 hover:underline mt-2 inline-block">
              Go to Borrowings Page to Fix
            </Link>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4">
              <FaBicycle className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bicycles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBicycles}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">{stats.availableBicycles} Available</span>
              <span className="text-blue-600 dark:text-blue-400">
                {stats.totalBicycles - stats.availableBicycles} In Use
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{
                  width: `${stats.totalBicycles > 0 ? (stats.availableBicycles / stats.totalBicycles) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mr-4">
              <FaClipboardCheck className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Certificates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingCertificates}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/medical-certificates"
              className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center"
            >
              Review pending certificates
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-4">
              <FaUsers className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/users"
              className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center"
            >
              Manage users
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.details}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span>{activity.user}</span> • <time>{activity.timestamp}</time>
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">No recent activity found</div>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
          <Link
            href="/admin/borrowings"
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline flex items-center justify-center"
          >
            View all activity
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
