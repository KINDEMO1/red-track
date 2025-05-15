// Define common error type
interface AppError extends Error {
  code?: string | number
  status?: number
  details?: unknown
}

// Define common types to avoid using 'any'
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string | number
    details?: unknown
  }
}

// Define common status enums
declare global {
  type UserRole = "admin" | "user" | "guest"

  type CertificateStatus = "pending" | "approved" | "rejected"

  type BorrowingStatus = "active" | "returned" | "overdue"

  // This helps with indexing objects when the key is not known at compile time
  interface Record<K extends keyof any, T> {
    [P in K]: T
  }

  // Empty interface is allowed for extension purposes
  interface EmptyObject {}
}

export {}
