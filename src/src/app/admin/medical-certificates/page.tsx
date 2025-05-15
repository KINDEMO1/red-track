"use client"
import { useState, useEffect, useCallback } from "react"
import {
  FaCheck,
  FaTimes,
  FaSearch,
  FaFilter,
  FaDownload,
  FaEye,
  FaExclamationTriangle,
  FaSync,
  FaDatabase,
  FaUserShield,
  FaTools,
} from "react-icons/fa"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "react-hot-toast"

type Certificate = {
  id: string
  user_id: string
  file_name: string
  file_type: string
  file_url: string
  upload_date?: string
  status: "pending" | "approved" | "rejected"
  notes: string | null
  created_at: string
  updated_at?: string
  user?: {
    id: string
    full_name: string
    email: string
    student_id: string
  }
}

export default function MedicalCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [forceRefreshCounter, setForceRefreshCounter] = useState(0)
  const [fetchMethod, setFetchMethod] = useState<string>("standard")
  const [isCreatingFunction, setIsCreatingFunction] = useState(false)

  const supabase = createClientComponentClient()

  // Create database function for admin access
  const createDatabaseFunction = async () => {
    try {
      setIsCreatingFunction(true)
      const response = await fetch("/api/admin/create-certificate-function", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create database function")
      }

      toast.success("Database function created successfully")
      // Refresh certificates after creating the function
      fetchAllCertificates()
    } catch (err: any) {
      console.error("Error creating database function:", err)
      toast.error(`Failed to create function: ${err.message}`)
    } finally {
      setIsCreatingFunction(false)
    }
  }

  // Fetch all certificates using the special endpoint
  const fetchAllCertificates = async () => {
    try {
      setIsRefreshing(true)
      setError("")

      const timestamp = new Date().getTime()
      const response = await fetch(`/api/admin/get-all-certificates?t=${timestamp}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch certificates")
      }

      const data = await response.json()
      console.log(
        `API returned ${data.certificates?.length || 0} certificates using ${data.method || "unknown"} method`,
      )

      if (data.certificates?.length > 0) {
        console.log("Sample certificate:", data.certificates[0])
      } else {
        console.log("No certificates found")
      }

      setCertificates(data.certificates || [])
      setFetchMethod(data.method || "direct_access")
      setLastRefreshed(new Date())
      setDebugInfo({
        apiResponse: data,
        timestamp: new Date().toISOString(),
      })

      toast.success(`Found ${data.certificates?.length || 0} certificates`)
    } catch (err: any) {
      console.error("Error fetching all certificates:", err)
      setError(`Failed to fetch all certificates: ${err.message}`)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch certificates from the API
  const fetchCertificates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      console.log("Fetching certificates from API...")

      // Use the dedicated API endpoint with cache-busting
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/admin/medical-certificates?t=${timestamp}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch certificates")
      }

      const data = await response.json()
      console.log(
        `API returned ${data.certificates?.length || 0} certificates using ${data.method || "unknown"} method`,
      )

      if (data.certificates?.length > 0) {
        console.log("Sample certificate:", data.certificates[0])
      } else {
        console.log("No certificates found")
      }

      // Set debug info
      setDebugInfo({
        apiResponse: data,
        timestamp: new Date().toISOString(),
      })

      // Update state with the fetched certificates
      setCertificates(data.certificates || [])
      setFetchMethod(data.method || "standard")
      setLastRefreshed(new Date())
    } catch (apiError: any) {
      console.error("API error, falling back to direct query:", apiError)
      setError(`API Error: ${apiError.message}. Trying direct database query...`)

      try {
        // Direct query as fallback
        const { data: certificatesData, error: queryError } = await supabase
          .from("medical_certificates")
          .select(`
            *,
            user:users(
              id,
              full_name,
              email,
              student_id
            )
          `)
          .order("created_at", { ascending: false })

        if (queryError) {
          throw queryError
        }

        console.log(`Direct query found ${certificatesData?.length || 0} certificates`)

        if (certificatesData?.length > 0) {
          console.log("Sample certificate:", certificatesData[0])
        } else {
          console.log("No certificates found in direct query")
        }

        setCertificates(certificatesData || [])
        setFetchMethod("direct_fallback")
        setDebugInfo({
          directQuery: certificatesData,
          error: apiError.message,
          timestamp: new Date().toISOString(),
        })

        // Clear the error since fallback succeeded
        setError("")
      } catch (err: any) {
        console.error("Error in fallback query:", err)
        setError(`Failed to fetch certificates: ${err.message}`)
        setDebugInfo({
          error: err,
          timestamp: new Date().toISOString(),
        })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [supabase, forceRefreshCounter])

  // Initial fetch and setup refresh interval
  useEffect(() => {
    fetchCertificates()

    // Set up polling interval
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing certificates...")
      setForceRefreshCounter((prev) => prev + 1)
    }, 60000) // Check every minute

    return () => clearInterval(intervalId)
  }, [fetchCertificates])

  // Filter certificates when data changes
  useEffect(() => {
    filterCertificates()
  }, [certificates, searchTerm, statusFilter])

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const filterCertificates = () => {
    let filtered = [...certificates]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((cert) => cert.status === statusFilter)
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (cert) =>
          cert.file_name?.toLowerCase().includes(term) ||
          cert.user?.full_name?.toLowerCase().includes(term) ||
          cert.user?.email?.toLowerCase().includes(term) ||
          cert.user?.student_id?.toLowerCase().includes(term),
      )
    }

    setFilteredCertificates(filtered)
  }

  const handleApprove = async () => {
    if (!selectedCertificate) return

    try {
      setIsSubmitting(true)
      console.log("Approving certificate:", selectedCertificate.id)

      // Call the API endpoint to update the certificate
      const response = await fetch("/api/admin/medical-certificates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedCertificate.id,
          status: "approved",
          notes: notes || null,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to approve certificate")
      }

      console.log("Approval response:", responseData)

      // Update local state
      setCertificates(
        certificates.map((cert) =>
          cert.id === selectedCertificate.id ? { ...cert, status: "approved", notes: notes || null } : cert,
        ),
      )

      toast.success(`Certificate for ${selectedCertificate.user?.full_name || "user"} has been approved`)
      setShowApproveModal(false)
      setNotes("")
      setSelectedCertificate(null)

      // Force refresh data
      setTimeout(() => {
        setForceRefreshCounter((prev) => prev + 1)
      }, 500)
    } catch (err: any) {
      console.error("Error approving certificate:", err)
      setError(err.message)
      toast.error(`Failed to approve certificate: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!selectedCertificate) return

    try {
      setIsSubmitting(true)
      console.log("Rejecting certificate:", selectedCertificate.id)

      // Call the API endpoint to update the certificate
      const response = await fetch("/api/admin/medical-certificates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedCertificate.id,
          status: "rejected",
          notes: notes || null,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to reject certificate")
      }

      console.log("Rejection response:", responseData)

      // Update local state
      setCertificates(
        certificates.map((cert) =>
          cert.id === selectedCertificate.id ? { ...cert, status: "rejected", notes: notes || null } : cert,
        ),
      )

      toast.success(`Certificate for ${selectedCertificate.user?.full_name || "user"} has been rejected`)
      setShowRejectModal(false)
      setNotes("")
      setSelectedCertificate(null)

      // Force refresh data
      setTimeout(() => {
        setForceRefreshCounter((prev) => prev + 1)
      }, 500)
    } catch (err: any) {
      console.error("Error rejecting certificate:", err)
      setError(err.message)
      toast.error(`Failed to reject certificate: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            <FaCheck className="mr-1 mt-0.5" /> Approved
          </span>
        )
      case "rejected":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <FaTimes className="mr-1 mt-0.5" /> Rejected
          </span>
        )
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
            Pending
          </span>
        )
    }
  }

  const fetchAndPreviewFile = async (fileUrl: string, fileType: string) => {
    try {
      setIsPreviewLoading(true)
      setPreviewError(null)

      // If we already have a blob URL, revoke it to prevent memory leaks
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      console.log("Fetching file for preview:", fileUrl)

      // Check if the URL is a direct URL or a storage path
      if (!fileUrl || fileUrl === "pending") {
        setPreviewError("File URL is pending or missing. The file may not have been uploaded correctly.")
        return
      }

      // For direct URLs, just use them
      if (fileUrl.startsWith("http")) {
        setPreviewUrl(fileUrl)
        return
      }

      // For storage paths, we need to get a public URL
      try {
        // Try to get a public URL first
        const storagePath = fileUrl.replace("medical-certificates/", "")
        const { data: publicUrlData } = await supabase.storage.from("medical-certificates").getPublicUrl(storagePath)

        if (publicUrlData?.publicUrl) {
          console.log("Got public URL:", publicUrlData.publicUrl)
          setPreviewUrl(publicUrlData.publicUrl)
          return
        }
      } catch (err) {
        console.warn("Error getting public URL, falling back to download:", err)
      }

      // If public URL fails, try to download the file
      try {
        const storagePath = fileUrl.replace("medical-certificates/", "")
        const { data, error } = await supabase.storage.from("medical-certificates").download(storagePath)

        if (error) {
          throw error
        }

        // Create a blob URL for the file
        const url = URL.createObjectURL(data)
        console.log("Created blob URL:", url)
        setPreviewUrl(url)
      } catch (err: any) {
        console.error("Error downloading file:", err)
        setPreviewError(`Failed to download file: ${err.message}`)
      }
    } catch (err: any) {
      console.error("Error fetching file for preview:", err)
      setPreviewError(`Failed to load file preview: ${err.message}`)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const FilePreview = ({ url, fileType }: { url: string; fileType: string }) => {
    if (isPreviewLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      )
    }

    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
          <FaExclamationTriangle className="text-yellow-500 text-4xl mb-4" />
          <p className="text-red-500 mb-4">{previewError}</p>
          <p className="mb-4">The file cannot be previewed. You can try downloading it instead.</p>
          <a
            href={selectedCertificate?.file_url}
            download={selectedCertificate?.file_name}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaDownload className="inline mr-2" /> Download File
          </a>
        </div>
      )
    }

    if (!url) return <div>No preview available</div>

    // For PDFs
    if (fileType.includes("pdf")) {
      return (
        <div className="h-[70vh] w-full">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title="PDF Preview"
            onError={() => setPreviewError("Failed to load PDF preview")}
          />
        </div>
      )
    }

    // For images
    if (fileType.includes("image")) {
      return (
        <div className="flex items-center justify-center h-[70vh]">
          <img
            src={url || "/placeholder.svg"}
            alt="Certificate Preview"
            className="max-w-full max-h-full object-contain"
            onError={() => setPreviewError("Failed to load image preview")}
          />
        </div>
      )
    }

    // For other file types
    return (
      <div className="text-center p-4">
        <p>Preview not available for this file type.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Download to view
        </a>
      </div>
    )
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setForceRefreshCounter((prev) => prev + 1)
  }

  const handleForceRefresh = async () => {
    setIsRefreshing(true)
    setError("")

    try {
      // Direct database query to force refresh
      const { data, error } = await supabase
        .from("medical_certificates")
        .select(`
          *,
          user:users(
            id,
            full_name,
            email,
            student_id
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      console.log(`Force refresh found ${data?.length || 0} certificates`)

      if (data?.length > 0) {
        console.log("Sample certificate:", data[0])
      } else {
        console.log("No certificates found in force refresh")
      }

      setCertificates(data || [])
      setFetchMethod("force_refresh")
      setLastRefreshed(new Date())
      setDebugInfo({
        forceRefresh: data,
        timestamp: new Date().toISOString(),
      })
      toast.success("Certificates refreshed directly from database")
    } catch (err: any) {
      console.error("Force refresh error:", err)
      setError(`Force refresh failed: ${err.message}`)
      toast.error("Failed to refresh certificates")
    } finally {
      setIsRefreshing(false)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medical Certificates</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search certificates..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaFilter className="text-gray-400" />
            </div>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md"
          >
            {showDebug ? "Hide Debug" : "Debug"}
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            disabled={isRefreshing}
          >
            <FaSync className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={handleForceRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            disabled={isRefreshing}
          >
            <FaSync className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Force Refresh
          </button>
          <button
            onClick={fetchAllCertificates}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
            disabled={isRefreshing}
            title="Use direct SQL query to bypass RLS"
          >
            <FaDatabase className="mr-2" />
            SQL Query
          </button>
          <button
            onClick={createDatabaseFunction}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            disabled={isCreatingFunction}
            title="Create database function to bypass RLS"
          >
            <FaTools className="mr-2" />
            {isCreatingFunction ? "Creating..." : "Create Function"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-md flex items-center">
          <FaExclamationTriangle className="mr-2" />
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
        <span>Last refreshed: {lastRefreshed.toLocaleTimeString()}</span>
        <span className="mx-2">|</span>
        <span>Total certificates: {certificates.length}</span>
        <span className="mx-2">|</span>
        <span className="flex items-center">
          <span>Fetch method: </span>
          <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-xs font-medium">
            {fetchMethod}
          </span>
        </span>
        <span className="mx-2">|</span>
        <span className="flex items-center">
          <FaUserShield className="mr-1 text-green-600" />
          <span className="text-green-600 font-medium">Admin: {debugInfo?.adminEmail || "JAYVHER FEROLINO"}</span>
        </span>
      </div>

      {showDebug && debugInfo && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-96">
          <h3 className="text-lg font-medium mb-2">Debug Information</h3>
          <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      {certificates.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 p-4 rounded-md flex items-center">
          <FaExclamationTriangle className="mr-2" />
          <div>
            <p className="font-medium">No certificates found</p>
            <p className="text-sm mt-1">
              Try using the "SQL Query" button to bypass RLS restrictions or "Create Function" to create a database
              function that can access all certificates.
            </p>
          </div>
        </div>
      )}

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
                  File
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
              {filteredCertificates.length > 0 ? (
                filteredCertificates.map((cert) => (
                  <tr key={cert.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {cert.user?.full_name || "Unknown User"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {cert.user?.email || "unknown@example.com"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {cert.user?.student_id || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        UID: {cert.user_id?.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{cert.file_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{cert.file_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(cert.upload_date || cert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(cert.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCertificate(cert)
                            fetchAndPreviewFile(cert.file_url, cert.file_type)
                            setShowViewModal(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                          title="Download"
                        >
                          <FaDownload />
                        </a>
                        {cert.status === "pending" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedCertificate(cert)
                                setShowApproveModal(true)
                              }}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              title="Approve"
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCertificate(cert)
                                setShowRejectModal(true)
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title="Reject"
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No certificates found
                    <div className="mt-2 flex justify-center space-x-4">
                      <button
                        onClick={fetchAllCertificates}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        Try SQL Query
                      </button>
                      <button
                        onClick={createDatabaseFunction}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        Create Database Function
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal with File Preview */}
      {showViewModal && selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Certificate Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left side - Certificate details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Student</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedCertificate.user?.full_name || "Unknown User"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedCertificate.user?.email || "unknown@example.com"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {selectedCertificate.user?.student_id || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User ID: {selectedCertificate.user_id}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">File</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedCertificate.file_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCertificate.file_type}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">URL: {selectedCertificate.file_url}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Upload Date</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedCertificate.upload_date || selectedCertificate.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedCertificate.status)}</div>
                </div>

                {selectedCertificate.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedCertificate.notes}</p>
                  </div>
                )}

                {selectedCertificate.status === "pending" && (
                  <div className="pt-4 space-y-2">
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        setShowApproveModal(true)
                      }}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <FaCheck className="mr-2" /> Approve Certificate
                    </button>
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        setShowRejectModal(true)
                      }}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <FaTimes className="mr-2" /> Reject Certificate
                    </button>
                  </div>
                )}

                <div className="pt-2">
                  <a
                    href={selectedCertificate.file_url}
                    download={selectedCertificate.file_name}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FaDownload className="mr-2" />
                    Download File
                  </a>
                </div>
              </div>

              {/* Right side - File preview */}
              <div className="md:col-span-2 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                <FilePreview url={previewUrl || ""} fileType={selectedCertificate.file_type} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Approve Certificate</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to approve this medical certificate for{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedCertificate.user?.full_name || "Unknown User"}
              </span>
              ?
            </p>

            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                placeholder="Add any notes about this approval"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowApproveModal(false)
                  setNotes("")
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reject Certificate</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to reject this medical certificate for{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedCertificate.user?.full_name || "Unknown User"}
              </span>
              ?
            </p>

            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason for Rejection
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                placeholder="Provide a reason for rejecting this certificate"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false)
                  setNotes("")
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isSubmitting || !notes.trim()}
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
