"use client"
import { useState, useEffect } from "react"
import { FaBicycle, FaMapMarkerAlt, FaClock } from "react-icons/fa"
import Image from "next/image"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { logSupabaseError } from "@/lib/error-utils"

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

export default function BicyclesPage() {
  const [bicycles, setBicycles] = useState<Bicycle[]>([])
  const [filter, setFilter] = useState("all")
  const [showBorrowModal, setShowBorrowModal] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedBike, setSelectedBike] = useState<Bicycle | null>(null)
  const [borrowingHours, setBorrowingHours] = useState<number | string>(12)
  const [customHours, setCustomHours] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [hasCertificate, setHasCertificate] = useState(false)
  const [certificateStatus, setCertificateStatus] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [hasActiveBorrowing, setHasActiveBorrowing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClientComponentClient()

        // First check if we have a session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          logSupabaseError("Session error", sessionError)
          setError("Authentication error. Please try logging in again.")
          setIsLoading(false)
          return
        }

        if (!sessionData.session) {
          console.log("No session found")
          setError("You must be logged in to view bicycles")
          setIsLoading(false)
          return
        }

        setIsAuthenticated(true)

        // Now fetch the user
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) {
          logSupabaseError("User error", userError)
          setError("Failed to get user information. Please try again.")
          setIsLoading(false)
          return
        }

        if (!userData.user) {
          setError("User information not found. Please try logging in again.")
          setIsLoading(false)
          return
        }

        setUser(userData.user)

        // Check user status
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("status")
          .eq("id", userData.user.id)
          .single()

        if (profileError) {
          logSupabaseError("Profile error", profileError)
          // Don't return here, we can still show bicycles even if we can't get the user status
        }

        if (userProfile?.status === "suspended") {
          setError("Your account is suspended. Please upload a new medical certificate.")
          setIsLoading(false)
          return
        }

        // Check if user has an approved medical certificate
        try {
          const { data: certificate, error: certificateError } = await supabase
            .from("medical_certificates")
            .select("status")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (certificateError) {
            // This might be a "No rows found" error which is expected if the user has no certificates
            if (certificateError.code !== "PGRST116") {
              logSupabaseError("Certificate error", certificateError)
            }
            // Don't return here, we can still show bicycles even if we can't get the certificate status
          } else {
            setHasCertificate(!!certificate)
            setCertificateStatus(certificate?.status || null)
          }
        } catch (certError) {
          console.error("Certificate fetch error:", certError)
          // Continue execution
        }

        // Check if user has an active borrowing
        try {
          const { data: activeBorrowing, error: borrowingError } = await supabase
            .from("borrowings")
            .select("id")
            .eq("user_id", userData.user.id)
            .eq("status", "active")
            .limit(1)

          if (borrowingError) {
            logSupabaseError("Borrowing error", borrowingError)
            // Don't return here, we can still show bicycles even if we can't get the borrowing status
          } else {
            // Fix: Use !! to convert to boolean
            setHasActiveBorrowing(!!(activeBorrowing && activeBorrowing.length > 0))
          }
        } catch (borrowError) {
          console.error("Borrowing fetch error:", borrowError)
          // Continue execution
        }

        // Fetch bicycles
        try {
          const { data: bicyclesData, error: bicyclesError } = await supabase.from("bicycles").select("*").order("name")

          if (bicyclesError) {
            logSupabaseError("Bicycles error", bicyclesError)
            setError("Failed to load bicycles. Please try again.")
            setIsLoading(false)
            return
          }

          setBicycles(bicyclesData || [])
        } catch (bikeError) {
          console.error("Bicycles fetch error:", bikeError)
          setError("Failed to load bicycles. Please try again.")
        }
      } catch (error: any) {
        console.error("Unexpected error:", error)
        setError("An unexpected error occurred. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredBicycles =
    filter === "all"
      ? bicycles
      : filter === "available"
        ? bicycles.filter((bike) => bike.is_available)
        : bicycles.filter((bike) => !bike.is_available)

  const handleReserveBike = (bike: Bicycle) => {
    // Check if user has an approved medical certificate
    if (certificateStatus !== "approved") {
      setShowCertificateModal(true)
      return
    }

    // Check if user already has an active borrowing
    if (hasActiveBorrowing) {
      alert("You already have an active bicycle borrowing. Please return it before borrowing another one.")
      return
    }

    setSelectedBike(bike)
    setBorrowingHours(12)
    setCustomHours(1)
    setShowBorrowModal(true)
  }

  const handleConfirmReservation = async () => {
    if (!selectedBike || !user) return

    try {
      const supabase = createClientComponentClient()

      // Calculate the actual hours to borrow
      const hoursToReserve = borrowingHours === "custom" ? customHours : Number(borrowingHours)

      // Calculate expected return date
      const expectedReturnDate = new Date()
      expectedReturnDate.setHours(expectedReturnDate.getHours() + hoursToReserve)

      // Create borrowing record
      const { error: borrowingError } = await supabase.from("borrowings").insert([
        {
          bicycle_id: selectedBike.id,
          user_id: user.id,
          expected_return_date: expectedReturnDate.toISOString(),
          status: "active",
        },
      ])

      if (borrowingError) {
        logSupabaseError("Borrowing error", borrowingError)
        alert(`Error reserving bicycle: ${borrowingError.message || "Unknown error"}`)
        return
      }

      // Update bicycle availability
      const { error: updateError } = await supabase
        .from("bicycles")
        .update({ is_available: false })
        .eq("id", selectedBike.id)

      if (updateError) {
        logSupabaseError("Update error", updateError)
        alert(`Error updating bicycle availability: ${updateError.message || "Unknown error"}`)
        return
      }

      // Update local state
      setBicycles(bicycles.map((bike) => (bike.id === selectedBike.id ? { ...bike, is_available: false } : bike)))
      setHasActiveBorrowing(true)
      setShowBorrowModal(false)

      alert(`You have successfully reserved ${selectedBike.name} for ${hoursToReserve} hours.`)
    } catch (error: any) {
      console.error("Reservation error:", error)
      alert(`Error reserving bicycle: ${error.message || "Unknown error"}`)
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
        <p>{error}</p>
        {!isAuthenticated && (
          <Link href="/login" className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Go to Login
          </Link>
        )}
        {error.includes("suspended") && (
          <Link
            href="/medical"
            className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Upload New Medical Certificate
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rest of the component remains the same */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Available Bicycles</h1>

        <div className="flex space-x-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "all" ? "bg-red-600 text-white" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
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

      {filteredBicycles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No bicycles found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBicycles.map((bike) => (
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
                </div>

                <button
                  onClick={() => handleReserveBike(bike)}
                  disabled={!bike.is_available}
                  className={`mt-4 w-full py-2 px-4 rounded-md text-sm font-medium ${
                    bike.is_available
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {bike.is_available ? "Reserve Bike" : "Currently In Use"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medical Certificate Required Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Medical Certificate Required</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {!hasCertificate
                ? "You need to upload a medical certificate before borrowing a bicycle."
                : certificateStatus === "pending"
                  ? "Your medical certificate is still pending approval."
                  : "Your medical certificate was rejected. Please upload a new one."}
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <Link
                href="/medical"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Upload Medical Certificate
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Borrowing Time Modal */}
      {showBorrowModal && selectedBike && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Reserve Bicycle</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              You are about to reserve <span className="font-medium">{selectedBike.name}</span>. Please select how long
              you would like to borrow it.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Borrowing Duration
              </label>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="12hours"
                    name="borrowingTime"
                    value="12"
                    checked={borrowingHours === 12}
                    onChange={() => setBorrowingHours(12)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="12hours" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    12 hours
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="24hours"
                    name="borrowingTime"
                    value="24"
                    checked={borrowingHours === 24}
                    onChange={() => setBorrowingHours(24)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="24hours" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    24 hours (maximum)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="custom"
                    name="borrowingTime"
                    value="custom"
                    checked={borrowingHours === "custom"}
                    onChange={() => setBorrowingHours("custom")}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="custom" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Custom duration
                  </label>
                </div>

                {borrowingHours === "custom" && (
                  <div className="ml-6 mt-2 flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={customHours}
                      onChange={(e) => setCustomHours(Math.min(24, Math.max(1, Number.parseInt(e.target.value) || 1)))}
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">hours</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mb-4">
              <div className="flex">
                <FaClock className="text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium">Important Note:</p>
                  <p>Borrowing time should not exceed 24 hours. Late returns may result in penalties.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowBorrowModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReservation}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Confirm Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
