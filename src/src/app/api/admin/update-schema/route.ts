import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if the medical_certificate_status column exists
    const { data: columnExists, error: columnCheckError } = await supabase.rpc("column_exists", {
      table_name: "users",
      column_name: "medical_certificate_status",
    })

    if (columnCheckError) {
      console.error("Error checking if column exists:", columnCheckError)
      return NextResponse.json({ error: "Failed to check if column exists" }, { status: 500 })
    }

    // If the column doesn't exist, add it
    if (!columnExists) {
      // Execute raw SQL to add the column
      const { error: alterTableError } = await supabase.rpc("execute_sql", {
        sql: `ALTER TABLE users ADD COLUMN medical_certificate_status TEXT CHECK (medical_certificate_status IN ('approved', 'pending', 'rejected'))`,
      })

      if (alterTableError) {
        console.error("Error adding medical_certificate_status column:", alterTableError)
        return NextResponse.json({ error: "Failed to add medical_certificate_status column" }, { status: 500 })
      }

      console.log("Added medical_certificate_status column to users table")
    } else {
      console.log("medical_certificate_status column already exists")
    }

    return NextResponse.json({
      success: true,
      message: "Schema updated successfully",
      columnAdded: !columnExists,
    })
  } catch (error: any) {
    console.error("Unhandled error in update schema API:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
