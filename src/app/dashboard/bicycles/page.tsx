"use client"
import { useState, useEffect } from "react"
import { FaBicycle, FaMapMarkerAlt, FaBatteryFull, FaBatteryHalf, FaBatteryQuarter } from "react-icons/fa"
import Image from "next/image"

type Bicycle = {
  id: string
  name: string
  type: string
  location: string
  batteryLevel: number
  isAvailable: boolean
  imageUrl: string
}

export default function BicyclesPage() {
  const [bicycles, setBicycles] = useState<Bicycle[]>([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    // In a real app, fetch bicycles from an API
    const mockBicycles: Bicycle[] = [
      {
        id: "1",
        name: "Mountain Bike A",
        type: "Mountain",
        location: "North Campus",
        batteryLevel: 90,
        isAvailable: true,
        imageUrl: "/images/bike-1.png",
      },
      {
        id: "2",
        name: "City Bike B",
        type: "City",
        location: "Library",
        batteryLevel: 75,
        isAvailable: true,
        imageUrl: "/images/bike-2.png",
      },
      {
        id: "3",
        name: "Road Bike C",
        type: "Road",
        location: "Sports Center",
        batteryLevel: 30,
        isAvailable: true,
        imageUrl: "/images/bike-3.png",
      },
      {
        id: "4",
        name: "Hybrid Bike D",
        type: "Hybrid",
        location: "Student Center",
        batteryLevel: 60,
        isAvailable: false,
        imageUrl: "/images/bike-4.png",
      },
      {
        id: "5",
        name: "Mountain Bike E",
        type: "Mountain",
        location: "South Campus",
        batteryLevel: 85,
        isAvailable: true,
        imageUrl: "/images/bike-5.png",
      },
      {
        id: "6",
        name: "City Bike F",
        type: "City",
        location: "Main Building",
        batteryLevel: 45,
        isAvailable: false,
        imageUrl: "/images/bike-6.png",
      },
    ]
    setBicycles(mockBicycles)
  }, [])

  const filteredBicycles =
    filter === "all"
      ? bicycles
      : filter === "available"
        ? bicycles.filter((bike) => bike.isAvailable)
        : bicycles.filter((bike) => !bike.isAvailable)

  const handleReserveBike = (id: string) => {
    setBicycles(bicycles.map((bike) => (bike.id === id ? { ...bike, isAvailable: false } : bike)))
  }

  const getBatteryIcon = (level: number) => {
    if (level > 70) return <FaBatteryFull className="text-green-500" />
    if (level > 30) return <FaBatteryHalf className="text-yellow-500" />
    return <FaBatteryQuarter className="text-red-500" />
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBicycles.map((bike) => (
          <div key={bike.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="h-48 w-full overflow-hidden relative">
              <Image src={bike.imageUrl || "/placeholder.svg"} alt={bike.name} fill className="object-cover" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{bike.name}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    bike.isAvailable
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                  }`}
                >
                  {bike.isAvailable ? "Available" : "In Use"}
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
                <div className="flex items-center mt-1">
                  {getBatteryIcon(bike.batteryLevel)}
                  <span className="ml-2">Battery: {bike.batteryLevel}%</span>
                </div>
              </div>

              <button
                onClick={() => handleReserveBike(bike.id)}
                disabled={!bike.isAvailable}
                className={`mt-4 w-full py-2 px-4 rounded-md text-sm font-medium ${
                  bike.isAvailable
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                {bike.isAvailable ? "Reserve Bike" : "Currently In Use"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
