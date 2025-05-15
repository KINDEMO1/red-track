// Define common error and response types to avoid using 'any'
type AppError = {
  message: string
  code?: string | number
  details?: unknown
}

type ApiResponse<T = unknown> = {
  data?: T
  error?: AppError
  success?: boolean
  message?: string
}

// Define common status types
type BorrowingStatus = "active" | "returned" | "overdue"
type UserStatus = "active" | "suspended" | "pending"
type CertificateStatus = "pending" | "approved" | "rejected" | "none"

// Define empty interface to fix the no-empty-object-type error
interface EmptyObject {
  [key: string]: unknown
}
