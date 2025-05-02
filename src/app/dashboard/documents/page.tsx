"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { FaFileAlt, FaUpload, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaDownload, FaTrash } from "react-icons/fa"

type Document = {
  id: string
  name: string
  type: string
  status: "pending" | "approved" | "rejected"
  uploadDate: string
  fileSize: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    // In a real app, fetch documents from an API
    const mockDocuments: Document[] = [
      {
        id: "1",
        name: "Medical Certificate.pdf",
        type: "Medical Certificate",
        status: "approved",
        uploadDate: "2024-04-15",
        fileSize: "1.2 MB",
      },
      {
        id: "2",
        name: "Health Declaration.pdf",
        type: "Health Declaration",
        status: "pending",
        uploadDate: "2024-04-28",
        fileSize: "0.8 MB",
      },
      {
        id: "3",
        name: "Vaccination Record.pdf",
        type: "Vaccination Record",
        status: "rejected",
        uploadDate: "2024-03-10",
        fileSize: "2.1 MB",
      },
      {
        id: "4",
        name: "Fitness Assessment.pdf",
        type: "Fitness Assessment",
        status: "pending",
        uploadDate: "2024-04-30",
        fileSize: "1.5 MB",
      },
    ]
    setDocuments(mockDocuments)
  }, [])

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Documents</h1>
        <Link
          href="/medical"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <FaUpload className="mr-2 -ml-1" />
          Upload New Document
        </Link>
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
                  Size
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
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{doc.fileSize}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-3">
                      <FaDownload />
                      <span className="sr-only">Download</span>
                    </button>
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
      </div>
    </div>
  )
}
