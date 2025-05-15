"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { FaSave, FaCog, FaBell, FaBicycle, FaFileAlt } from "react-icons/fa"

type Settings = {
  systemName: string
  maxBorrowingHours: number
  maintenanceInterval: number
  emailNotifications: boolean
  automaticSuspension: boolean
  defaultLocation: string
  requireMedicalCertificate: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    systemName: "RED Track",
    maxBorrowingHours: 24,
    maintenanceInterval: 90,
    emailNotifications: true,
    automaticSuspension: true,
    defaultLocation: "North Campus",
    requireMedicalCertificate: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    // In a real app, fetch settings from an API
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const target = e.target as HTMLInputElement
      setSettings({
        ...settings,
        [name]: target.checked,
      })
    } else if (type === "number") {
      setSettings({
        ...settings,
        [name]: Number.parseInt(value),
      })
    } else {
      setSettings({
        ...settings,
        [name]: value,
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // In a real app, save settings to an API
    setTimeout(() => {
      setSuccessMessage("Settings saved successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    }, 500)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 p-4 rounded-md">
          <div className="flex items-center">
            <FaSave className="text-green-400 mr-3" />
            <p className="text-green-800 dark:text-green-400">{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <FaCog className="text-gray-400 mr-3" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">General Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label htmlFor="systemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                System Name
              </label>
              <input
                type="text"
                name="systemName"
                id="systemName"
                value={settings.systemName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This name will be displayed throughout the application
              </p>
            </div>

            <div>
              <label htmlFor="maxBorrowingHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Maximum Borrowing Hours
              </label>
              <input
                type="number"
                name="maxBorrowingHours"
                id="maxBorrowingHours"
                min="1"
                max="72"
                value={settings.maxBorrowingHours}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Maximum time a student can borrow a bicycle (in hours)
              </p>
            </div>

            <div>
              <label htmlFor="defaultLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Default Location
              </label>
              <input
                type="text"
                name="defaultLocation"
                id="defaultLocation"
                value={settings.defaultLocation}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Default location for new bicycles</p>
            </div>
          </div>
        </div>

        {/* Bicycle Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <FaBicycle className="text-gray-400 mr-3" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Bicycle Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Battery threshold removed as bicycles are not electric */}

            <div>
              <label
                htmlFor="maintenanceInterval"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Maintenance Interval (days)
              </label>
              <input
                type="number"
                name="maintenanceInterval"
                id="maintenanceInterval"
                min="30"
                max="365"
                value={settings.maintenanceInterval}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Number of days between scheduled maintenance for bicycles
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <FaBell className="text-gray-400 mr-3" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Notification Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="emailNotifications"
                  name="emailNotifications"
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={handleChange}
                  className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="emailNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                  Email Notifications
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Send email notifications for borrowing, returns, and overdue bicycles
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="automaticSuspension"
                  name="automaticSuspension"
                  type="checkbox"
                  checked={settings.automaticSuspension}
                  onChange={handleChange}
                  className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="automaticSuspension" className="font-medium text-gray-700 dark:text-gray-300">
                  Automatic Suspension
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Automatically suspend users who have overdue bicycles
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Certificate Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <FaFileAlt className="text-gray-400 mr-3" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Medical Certificate Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="requireMedicalCertificate"
                  name="requireMedicalCertificate"
                  type="checkbox"
                  checked={settings.requireMedicalCertificate}
                  onChange={handleChange}
                  className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="requireMedicalCertificate" className="font-medium text-gray-700 dark:text-gray-300">
                  Require Medical Certificate
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Require users to have an approved medical certificate before borrowing bicycles
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FaSave className="mr-2 -ml-1" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}
