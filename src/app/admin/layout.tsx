import type { ReactNode } from "react"
import AdminSidebar from "../components/admin-sidebar"
import AuthCheck from "@/components/auth-check"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthCheck adminOnly>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 md:ml-64 pt-16 md:pt-6">{children}</main>
      </div>
    </AuthCheck>
  )
}
