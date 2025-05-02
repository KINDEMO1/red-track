import type React from "react"
import Sidebar from "../components/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 md:ml-64 p-4 overflow-y-auto">
        <main className="max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
