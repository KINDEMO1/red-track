"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"
import Image from "next/image"
import { FaBicycle, FaMapMarkerAlt, FaPlus, FaEdit, FaTrash, FaSearch, FaUpload } from "react-icons/fa"
import { toast } from "react-hot-toast"

type Bicycle = {
  id: string
  name: string
  type: string
  location: string
  is_available: boolean
  image_url: string | null
  last_maintenance?: string | null
  next_maintenance?: string | null
  notes?: string | null
}

export default function AdminBicyclesPage() {
  const [bicycles, setBicycles] = useState<Bicycle[]>([])
  const [filteredBicycles, setFilteredBicycles] = useState<Bicycle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [currentBicycle, setCurrentBicycle] = useState<Bicycle | null>(null)
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    type: "",
    location: "",
    is_available: true,
    image_url: "",
    last_maintenance: "",
    next_maintenance: "",
    notes: "",
  })
  const [error, setError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBicycles()
  }, [])

  useEffect(() => {
    // Filter and search bicycles
    let result = bicycles

    // Apply availability filter
    if (filter === "available") {
      result = result.filter((bike) => bike.is_available)
    } else if (filter === "unavailable") {
      result = result.filter((bike) => !bike.is_available)
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (bike) =>
          bike.name.toLowerCase().includes(term) ||
          bike.type.toLowerCase().includes(term) ||
          bike.location.toLowerCase().includes(term),
      )
    }

    setFilteredBicycles(result)
  }, [bicycles, filter, searchTerm])

  const fetchBicycles = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Use our new API endpoint
      const response = await fetch("/api/bicycles")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch bicycles")
      }

      const data = await response.json()

      setBicycles(data || [])
      setFilteredBicycles(data || [])
    } catch (err: any) {
      console.error("Error fetching bicycles:", err)
      setError(err.message)
      toast.error(`Error fetching bicycles: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const target = e.target as HTMLInputElement
      setFormData({
        ...formData,
        [name]: target.checked,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleAddBicycle = () => {
    setCurrentBicycle(null)
    setFormData({
      id: "",
      name: "",
      type: "",
      location: "",
      is_available: true,
      image_url: "",
      last_maintenance: "",
      next_maintenance: "",
      notes: "",
    })
    setImagePreview(null)
    setShowModal(true)
  }

  const handleEditBicycle = (bike: Bicycle) => {
    setCurrentBicycle(bike)
    setFormData({
      id: bike.id,
      name: bike.name,
      type: bike.type,
      location: bike.location,
      is_available: bike.is_available,
      image_url: bike.image_url || "",
      last_maintenance: bike.last_maintenance || "",
      next_maintenance: bike.next_maintenance || "",
      notes: bike.notes || "",
    })
    setImagePreview(bike.image_url)
    setShowModal(true)
  }

  const handleDeleteBicycle = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this bicycle?")) {
      try {
        // Use our new API endpoint
        const response = await fetch(`/api/bicycles?id=${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to delete bicycle")
        }

        setBicycles(bicycles.filter((bike) => bike.id !== id))
        toast.success("Bicycle deleted successfully")
      } catch (err: any) {
        console.error("Error deleting bicycle:", err)
        toast.error(`Error deleting bicycle: ${err.message}`)
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid image file (JPEG, PNG, GIF, WebP)")
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be less than 5MB")
      return
    }

    setUploadError("")
    setIsUploading(true)
    setUploadProgress(10)

    try {
      // Create a preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      setUploadProgress(30)

      // Create a FormData object for the upload
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      // Use the simple endpoint
      const response = await fetch("/api/simple-upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      setUploadProgress(80)

      const result = await response.json()

      // Update the form data with the new URL
      setFormData({ ...formData, image_url: result.url })
      setUploadProgress(100)
    } catch (error: any) {
      console.error("Error uploading file:", error)
      setUploadError(error.message || "Failed to upload image")
      setImagePreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (currentBicycle) {
        // Update existing bicycle using our API
        const response = await fetch("/api/bicycles", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: currentBicycle.id,
            name: formData.name,
            type: formData.type,
            location: formData.location,
            is_available: formData.is_available,
            image_url: formData.image_url || null,
            last_maintenance: formData.last_maintenance || null,
            next_maintenance: formData.next_maintenance || null,
            notes: formData.notes || null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to update bicycle")
        }

        const updatedBicycle = await response.json()

        setBicycles(bicycles.map((bike) => (bike.id === currentBicycle.id ? updatedBicycle : bike)))

        toast.success("Bicycle updated successfully")
      } else {
        // Add new bicycle using our API
        const response = await fetch("/api/bicycles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            type: formData.type,
            location: formData.location,
            is_available: formData.is_available,
            image_url: formData.image_url || null,
            last_maintenance: formData.last_maintenance || null,
            next_maintenance: formData.next_maintenance || null,
            notes: formData.notes || null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to add bicycle")
        }

        const newBicycle = await response.json()

        setBicycles([...bicycles, newBicycle])
        toast.success("Bicycle added successfully")
      }

      setShowModal(false)
    } catch (err: any) {
      console.error("Error saving bicycle:", err)
      toast.error(`Error saving bicycle: ${err.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-md mb-4">{error}</div>
        <button
          onClick={() => (window.location.href = "/api/fix-bicycles-rls")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Fix RLS Policies
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Bicycles</h1>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search bicycles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white w-full"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === "all"
                  ? "bg-red-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("available")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === "available"
                  ? "bg-red-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setFilter("unavailable")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === "unavailable"
                  ? "bg-red-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              In Use
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleAddBicycle}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <FaPlus className="mr-2 -ml-1" />
          Add New Bicycle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBicycles.length > 0 ? (
          filteredBicycles.map((bike) => (
            <div key={bike.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="h-48 w-full overflow-hidden relative">
                <Image
                  src={bike.image_url || "/placeholder.svg?height=200&width=300"}
                  alt={bike.name}
                  fill
                  unoptimized={bike.image_url ? true : false}
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{bike.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bike.is_available
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                    }`}
                  >
                    {bike.is_available ? "Available" : "In Use"}
                  </span>
                </div>

                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center mt-1">
                    <FaBicycle className="mr-2" />
                    <span>{bike.type}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <FaMapMarkerAlt className="mr-2" />
                    <span>{bike.location}</span>
                  </div>
                  {bike.last_maintenance && (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Last maintenance: {bike.last_maintenance}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleEditBicycle(bike)}
                    className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    <FaEdit className="inline mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBicycle(bike.id)}
                    className="flex-1 py-2 px-3 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    <FaTrash className="inline mr-1" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-10 text-gray-500 dark:text-gray-400">
            No bicycles found matching your criteria
          </div>
        )}
      </div>

      {/* Add/Edit Bicycle Modal - Redesigned to be more compact */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4">
            <form onSubmit={handleSubmit}>
              <div className="px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {currentBicycle ? "Edit Bicycle" : "Add New Bicycle"}
                  </h3>
                </div>

                {/* Two-column layout for form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bicycle Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Type
                      </label>
                      <select
                        id="type"
                        name="type"
                        required
                        value={formData.type}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select Type</option>
                        <option value="Mountain">Mountain</option>
                        <option value="City">City</option>
                        <option value="Road">Road</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        id="location"
                        required
                        value={formData.location}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="image_upload"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Bicycle Image
                      </label>
                      <div className="mt-1 flex items-center">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <FaUpload className="mr-2 -ml-1 h-4 w-4" />
                          {formData.image_url ? "Change Image" : "Upload Image"}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="image_upload"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        {formData.image_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, image_url: "" })
                              setImagePreview(null)
                            }}
                            className="ml-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Upload progress */}
                      {isUploading && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Uploading: {uploadProgress}%</p>
                        </div>
                      )}

                      {/* Error message */}
                      {uploadError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>}

                      {/* Hidden input to store the image URL */}
                      <input type="hidden" name="image_url" value={formData.image_url} />
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    {/* Image preview */}
                    {imagePreview && (
                      <div className="mb-3">
                        <div className="relative h-32 w-full overflow-hidden rounded border border-gray-300 dark:border-gray-600">
                          <Image
                            src={imagePreview || "/placeholder.svg"}
                            alt="Bicycle preview"
                            fill
                            unoptimized={true}
                            className="object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="last_maintenance"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Last Maintenance Date
                      </label>
                      <input
                        type="date"
                        name="last_maintenance"
                        id="last_maintenance"
                        value={formData.last_maintenance}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="next_maintenance"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Next Maintenance Date
                      </label>
                      <input
                        type="date"
                        name="next_maintenance"
                        id="next_maintenance"
                        value={formData.next_maintenance}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        id="notes"
                        rows={2}
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      ></textarea>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_available"
                        id="is_available"
                        checked={formData.is_available}
                        onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Available for borrowing
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : currentBicycle ? "Save Changes" : "Add Bicycle"}
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
