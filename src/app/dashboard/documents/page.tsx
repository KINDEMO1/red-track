"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  FaFileAlt,
  FaUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaDownload,
  FaTrash,
  FaSync,
} from "react-icons/fa"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { logSupabaseError } from "@/lib/error-utils"
import { toast } from "react-hot-toast"

type Document = {
  id: string
  file_name: string
  file_type: string
  status: "pending" | "approved" | "rejected"
  upload_date: string
  file_url: string
  notes?: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userStatus, setUserStatus] = useState<string | null>(null)

  const fetchDocuments = async () => {
    try {
      setIsRefreshing(true)
      const supabase = createClientComponentClient()

      // First check if we have a session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        logSupabaseError("Session error", sessionError)
        setError("Authentication error. Please try logging in again.")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      if (!sessionData.session) {
        console.log("No session found")
        setError("You must be logged in to view your documents")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      setIsAuthenticated(true)

      // Now fetch the user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        logSupabaseError("User error", userError)
        setError("Failed to get user information. Please try again.")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      if (!userData.user) {
        setError("User information not found. Please try logging in again.")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      // Fetch user profile to get medical certificate status
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("medical_certificate_status")
        .eq("id", userData.user.id)
        .single()

      if (profileError) {
        console.warn("Error fetching user profile:", profileError)
      } else {
        setUserStatus(profileData?.medical_certificate_status || null)
        console.log("User medical certificate status:", profileData?.medical_certificate_status)
      }

      // Fetch certificates
      try {
        const { data, error: certificatesError } = await supabase
          .from("medical_certificates")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })

        if (certificatesError) {
          logSupabaseError("Error fetching certificates", certificatesError)
          setError("Failed to load documents. Please try again.")
          setIsLoading(false)
          setIsRefreshing(false)
          return
        }

        setDocuments(data || [])
        toast.success(`Found ${data?.length || 0} documents`)
      } catch (certError) {
        console.error("Certificate fetch error:", certError)
        setError("An error occurred while fetching your documents. Please try again.")
      }
    } catch (error: any) {
      console.error("Unexpected error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return
    }

    try {
      const supabase = createClientComponentClient()
      const { error } = await supabase.from("medical_certificates").delete().eq("id", id)

      if (error) {
        logSupabaseError("Delete error", error)
        setError("Failed to delete document. Please try again.")
        return
      }

      setDocuments(documents.filter((doc) => doc.id !== id))
      toast.success("Document deleted successfully")

      // Refresh documents to update status
      fetchDocuments()
    } catch (error: any) {
      console.error("Delete error:", error)
      setError("An unexpected error occurred while deleting. Please try again.")
    }
  }

  const handleRefresh = () => {
    fetchDocuments()
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
        <p>{error}</p>
        {!isAuthenticated && (
          <Link href="/login" className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Go to Login
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Documents</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            disabled={isRefreshing}
          >
            <FaSync className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <Link
            href="/medical"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FaUpload className="mr-2 -ml-1" />
            Upload New Document
          </Link>
        </div>
      </div>

      {userStatus && (
        <div
          className={`p-4 rounded-md ${
            userStatus === "approved"
              ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              : userStatus === "rejected"
                ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
          }`}
        >
          <div className="flex items-center">
            {userStatus === "approved" && <FaCheckCircle className="mr-2" />}
            {userStatus === "rejected" && <FaTimesCircle className="mr-2" />}
            {userStatus === "pending" && <FaHourglassHalf className="mr-2" />}
            <p>
              <strong>Medical Certificate Status: </strong>
              {userStatus === "approved" && "Your medical certificate has been approved."}
              {userStatus === "rejected" && "Your medical certificate has been rejected. Please upload a new one."}
              {userStatus === "pending" && "Your medical certificate is pending approval."}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <FaFileAlt className="mx-auto text-4xl mb-2 opacity-50" />
            <p>You haven&apos;t uploaded any documents yet.</p>
            <Link href="/medical" className="mt-2 inline-block text-red-600 hover:underline">
              Upload a medical certificate
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Notes
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaFileAlt className="text-gray-400 mr-2" />
                        <span className="text-gray-900 dark:text-white">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{doc.file_type}</td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{doc.notes || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-3"
                      >
                        <FaDownload />
                        <span className="sr-only">Download</span>
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <FaTrash />
                        <span className="sr-only">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
