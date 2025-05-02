"use client"
import type React from "react"
import { useState } from "react"
import { FaUpload, FaFileAlt } from "react-icons/fa"

const MedicalCertificateUpload = () => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/")) {
        setFile(selectedFile)
        setUploadStatus("")
      } else {
        setUploadStatus("Please upload a PDF or image file")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      setUploadStatus("Please select a file first")
      return
    }

    setUploading(true)
    try {
      // Simulated upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setUploadStatus("Certificate uploaded successfully! Pending review.")
      setFile(null)
    } catch {
      setUploadStatus("Error uploading certificate. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mt-10">
        <div className="text-center mb-8">
          <FaFileAlt className="text-4xl text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Medical Certificate Upload</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Please upload your medical certificate for evaluation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,image/*"
              className="hidden"
              id="certificate-upload"
            />
            <label htmlFor="certificate-upload" className="cursor-pointer flex flex-col items-center space-y-4">
              <FaUpload className="text-4xl text-gray-400" />
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Click to upload</span> or drag and drop
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">PDF or Image files only (max. 10MB)</div>
            </label>
          </div>

          {file && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <FaFileAlt />
              <span>{file.name}</span>
            </div>
          )}

          {uploadStatus && (
            <div className={`text-sm ${uploadStatus.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
              {uploadStatus}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium
              ${uploading || !file ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}
              transition-colors duration-200`}
          >
            {uploading ? "Uploading..." : "Submit Certificate"}
          </button>
        </form>

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
