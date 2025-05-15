// Define custom error type to avoid using 'any'
interface AppError extends Error {
  code?: string
  details?: string
  hint?: string
  message: string
}

// Define custom API response types
interface ApiResponse<T = unknown> {
  data?: T
  error?: string | null
  message?: string
  success?: boolean
}

// Define common types for the application
type UserRole = "admin" | "student" | "staff"
type CertificateStatus = "pending" | "approved" | "rejected"
type BorrowingStatus = "active" | "returned" | "overdue"
type UserStatus = "active" | "suspended" | "pending"

// Extend Window interface for any global variables
declare global {
  interface Window {
    // Add any global window properties here if needed
  }
}
