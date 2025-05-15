import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// GET all bicycles
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data, error } = await supabase.from("bicycles").select("*").order("name")

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching bicycles:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// POST to create a new bicycle
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: `Authentication error: ${authError.message}` }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized: No user found" }, { status: 401 })
    }

    // Get the bicycle data from the request
    const bicycleData = await request.json()
    console.log("Received bicycle data:", bicycleData)

    // Insert the bicycle
    const { data, error } = await supabase.from("bicycles").insert([bicycleData]).select()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No data returned after insert" }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Error creating bicycle:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// PUT to update a bicycle
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: `Authentication error: ${authError.message}` }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized: No user found" }, { status: 401 })
    }

    // Get the bicycle data from the request
    const bicycleData = await request.json()
    console.log("Received bicycle update data:", bicycleData)

    const { id, ...updateData } = bicycleData

    if (!id) {
      return NextResponse.json({ error: "Bicycle ID is required" }, { status: 400 })
    }

    // Update the bicycle
    const { data, error } = await supabase.from("bicycles").update(updateData).eq("id", id).select()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No data returned after update" }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Error updating bicycle:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// DELETE to remove a bicycle
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: `Authentication error: ${authError.message}` }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized: No user found" }, { status: 401 })
    }

    // Get the bicycle ID from the URL
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Bicycle ID is required" }, { status: 400 })
    }

    // Delete the bicycle
    const { error } = await supabase.from("bicycles").delete().eq("id", id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bicycle:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
