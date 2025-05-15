"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FaBicycle, FaFileAlt, FaUser } from "react-icons/fa"

type User = {
  id: string
  email: string
  full_name: string
  student_id: string
  status?: string
}

type Document = {
  id: string
  file_name: string
  file_type: string
  status: "pending" | "approved" | "rejected"
  upload_date: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docsError, setDocsError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch user data
        const userResponse = await fetch("/api/auth/user")
        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user data: ${userResponse.status}`)
        }

        const userData = await userResponse.json()
        if (!userData.user) {
          throw new Error("No user data returned from API")
        }

        setUser(userData.user)

        // Now fetch documents
        setIsLoadingDocs(true)
        setDocsError(null)

        try {
          const docsResponse = await fetch(`/api/medical-certificates?userId=${userData.user.id}`)

          if (!docsResponse.ok) {
            throw new Error(`Failed to fetch documents: ${docsResponse.status}`)
          }

          const docsData = await docsResponse.json()
          setDocuments(docsData.certificates || [])
        } catch (docErr: any) {
          console.error("Error fetching documents:", docErr)
          setDocsError(docErr.message || "Failed to load documents")
        } finally {
          setIsLoadingDocs(false)
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err)
        setError(err.message || "Failed to load dashboard data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 p-4 rounded-md">
          <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {user && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-2">Welcome, {user.full_name}!</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Student ID: {user.student_id} | Status: {user.status || "Active"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
              <FaFileAlt className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold">Medical Certificate</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Upload your medical certificate to borrow bicycles.</p>
          <Link
            href="/medical"
            className="inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Upload Certificate
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
              <FaBicycle className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold">Available Bicycles</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Browse and borrow available bicycles.</p>
          <Link
            href="/dashboard/bicycles"
            className="inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            View Bicycles
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
              <FaUser className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold">My Profile</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">View and update your profile information.</p>
          <Link
            href="/dashboard/profile"
            className="inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>

      {/* Recent Documents Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>

        {isLoadingDocs ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading documents...</p>
          </div>
        ) : docsError ? (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 p-4 rounded-md">
            <p>{docsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>You haven't uploaded any documents yet.</p>
            <Link
              href="/medical"
              className="mt-2 inline-block text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Upload your first document
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Type
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
                    Upload Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {doc.file_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {doc.file_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${
                          doc.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : doc.status === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <Link
            href="/dashboard/documents"
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
          >
            View all documents →
          </Link>
        </div>
      </div>
    </div>
  )
}
