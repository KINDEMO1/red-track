"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { FileIcon, UploadIcon, FileTextIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

const MedicalCertificateUpload = () => {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [user, setUser] = useState<any>(null)
  const [existingCertificate, setExistingCertificate] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        // Get user data from API
        const response = await fetch("/api/auth/user")
        const data = await response.json()

        if (data.user) {
          setUser(data.user)
          console.log("User data loaded:", data.user)

          // Check if user already has a certificate
          const { data: certData, error } = await supabase
            .from("medical_certificates")
            .select("*")
            .eq("user_id", data.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (certData && !error) {
            setExistingCertificate(certData)
            console.log("Existing certificate found:", certData)
          } else if (error && error.code !== "PGRST116") {
            // PGRST116 means no rows returned, which is fine
            console.error("Error fetching certificate:", error)
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      }
    }

    getUser()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/")) {
        setFile(selectedFile)
        setUploadStatus("")
      } else {
        setUploadStatus("Please upload a PDF or image file")
        setFile(null)
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf" || droppedFile.type.startsWith("image/")) {
        setFile(droppedFile)
        setUploadStatus("")
      } else {
        setUploadStatus("Please upload a PDF or image file")
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file || !user) {
      setUploadStatus("Please select a file first")
      return
    }

    setUploading(true)
    try {
      // Use the new API endpoint for uploading
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-medical-certificate", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload certificate")
      }

      toast({
        title: "Certificate uploaded successfully!",
        description: "Your certificate is pending review.",
      })

      setUploadStatus("Certificate uploaded successfully! Pending review.")
      setFile(null)

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Refresh to show the updated certificate status
      const { data: newCert, error: refreshError } = await supabase
        .from("medical_certificates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (newCert && !refreshError) {
        setExistingCertificate(newCert)
      }

      // Refresh the dashboard
      router.refresh()
    } catch (error: any) {
      console.error("Upload error:", error)
      const errorMessage = error.message || "Unknown error occurred"

      setUploadStatus(`Error uploading certificate: ${errorMessage}`)
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const getCertificateStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium flex items-center">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Approved
          </span>
        )
      case "rejected":
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-xs font-medium flex items-center">
            <AlertCircleIcon className="w-3 h-3 mr-1" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium flex items-center">
            <AlertCircleIcon className="w-3 h-3 mr-1" />
            Pending Review
          </span>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mt-10">
        <div className="text-center mb-8">
          <FileTextIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Medical Certificate Upload</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Please upload your medical certificate for evaluation</p>
        </div>

        {existingCertificate && (
          <div className="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Your Current Certificate</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{existingCertificate.file_name}</span>
              </div>
              <div>{getCertificateStatusBadge(existingCertificate.status)}</div>
            </div>
            {existingCertificate.notes && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <strong>Admin Notes:</strong> {existingCertificate.notes}
              </div>
            )}
            {existingCertificate.status === "rejected" && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Your certificate was rejected. Please upload a new one.
              </div>
            )}
            {existingCertificate.status === "approved" && (
              <div className="mt-4 text-sm text-green-600 dark:text-green-400">
                Your certificate has been approved. You can now borrow bicycles.
              </div>
            )}
          </div>
        )}

        {(!existingCertificate || existingCertificate.status === "rejected") && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,image/*"
                className="hidden"
                id="certificate-upload"
                ref={fileInputRef}
              />
              <div className="flex flex-col items-center space-y-4">
                <UploadIcon className="w-12 h-12 text-gray-400" />
                <div className="text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">PDF or Image files only (max. 10MB)</div>
              </div>
            </div>

            {file && (
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <FileIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300 flex-1">{file.name}</span>
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            {uploadStatus && (
              <div
                className={`text-sm p-3 rounded-lg ${uploadStatus.includes("successfully") ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}
              >
                {uploadStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center
                ${uploading || !file ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}
                transition-colors duration-200`}
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                "Submit Certificate"
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <h3 className="font-semibold mb-2">Important Notes:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Certificate must be clearly legible</li>
            <li>Must include doctor&apos;s signature and stamp</li>
            <li>Maximum file size: 10MB</li>
            <li>Supported formats: PDF, JPG, PNG</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default MedicalCertificateUpload
