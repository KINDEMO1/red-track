import type React from "react"
import AuthCheck from "@/components/auth-check"
import Sidebar from "@/components/sidebar"

export default function MedicalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthCheck>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 md:ml-64 pt-16 md:pt-8">{children}</main>
      </div>
    </AuthCheck>
  )
}
