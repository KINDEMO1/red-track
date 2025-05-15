/**
 * Utility function to properly log Supabase errors with more detail
 */
export function logSupabaseError(context: string, error: any): void {
  // Check if error is a response object
  if (error && error.response) {
    console.error(`❌ ${context}:`, {
      status: error.response.status,
      statusText: error.response.statusText,
      url: error.response.url,
      message: error.message,
    })
    return
  }

  // Check if error is a fetch error
  if (error && error.name === "FetchError") {
    console.error(`❌ ${context} (Fetch Error):`, {
      message: error.message,
      cause: error.cause,
    })
    return
  }

  // Standard Supabase error object
  console.error(`❌ ${context}:`, {
    message: error?.message || "Unknown error",
    details: error?.details,
    code: error?.code,
    hint: error?.hint,
    status: error?.status,
    // Log the full error for debugging
    error: JSON.stringify(error, null, 2),
  })
}

/**
 * Format error for returning in responses
 */
export function formatError(error: any): any {
  // Check if error is a response object
  if (error && error.response) {
    return {
      status: error.response.status,
      statusText: error.response.statusText,
      url: error.response.url,
      message: error.message,
    }
  }

  // Check if error is a fetch error
  if (error && error.name === "FetchError") {
    return {
      message: error.message,
      cause: error.cause,
    }
  }

  // Standard Supabase error object
  return {
    message: error?.message || "Unknown error",
    details: error?.details,
    code: error?.code,
    hint: error?.hint,
    status: error?.status,
  }
}
