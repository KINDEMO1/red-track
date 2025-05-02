"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { FaFileAlt, FaBicycle, FaUpload, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from "react-icons/fa"

type User = {
  studentId: string
  name: string
  email: string
  isLoggedIn: boolean
}

type Document = {
  id: string
  name: string
  type: string
  status: "pending" | "approved" | "rejected"
  uploadDate: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    // Get user data
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Get documents data (in a real app, this would be from an API)
    const mockDocuments: Document[] = [
      {
        id: "1",
        name: "Medical Certificate.pdf",
        type: "Medical Certificate",
        status: "approved",
        uploadDate: "2024-04-15",
      },
      {
        id: "2",
        name: "Health Declaration.pdf",
        type: "Health Declaration",
        status: "pending",
        uploadDate: "2024-04-28",
      },
    ]
    setDocuments(mockDocuments)
  }, [])

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome, {user.name}!</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Student ID: {user.studentId} | Email: {user.email}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/medical"
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <FaUpload className="text-red-600 dark:text-red-400 text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Medical Certificate</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Submit your medical documents</p>
          </div>
        </Link>

        <Link
          href="/dashboard/documents"
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <FaFileAlt className="text-red-600 dark:text-red-400 text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Documents</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">View all your uploaded documents</p>
          </div>
        </Link>

        <Link
          href="/dashboard/bicycles"
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <FaBicycle className="text-red-600 dark:text-red-400 text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Available Bicycles</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Browse and reserve bicycles</p>
          </div>
        </Link>
      </div>

      {/* Recent Documents */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Documents</h2>
          <Link href="/dashboard/documents" className="text-red-600 dark:text-red-400 text-sm hover:underline">
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Document
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaFileAlt className="text-gray-400 mr-2" />
                      <span className="text-gray-900 dark:text-white">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{doc.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doc.status === "approved" && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        <FaCheckCircle className="mr-1 mt-0.5" /> Approved
                      </span>
                    )}
                    {doc.status === "rejected" && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                        <FaTimesCircle className="mr-1 mt-0.5" /> Rejected
                      </span>
                    )}
                    {doc.status === "pending" && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                        <FaHourglassHalf className="mr-1 mt-0.5" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{doc.uploadDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
