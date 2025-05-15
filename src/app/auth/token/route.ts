import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const accessToken = requestUrl.searchParams.get("access_token")
  const refreshToken = requestUrl.searchParams.get("refresh_token")
  const type = requestUrl.searchParams.get("type") || "bearer"
  const expiresIn = Number.parseInt(requestUrl.searchParams.get("expires_in") || "3600", 10)

  console.log("Token handler called with access token:", accessToken ? "present" : "missing")

  if (!accessToken) {
    console.error("No access token found in the URL")
    return NextResponse.redirect(new URL("/login?error=Missing access token", requestUrl.origin))
  }

  try {
    // Instead of using Supabase client, we'll manually set cookies
    const cookieStore = await cookies()

    // Calculate expiry date
    const expires = new Date()
    expires.setSeconds(expires.getSeconds() + expiresIn)

    // Set cookies manually
    cookieStore.set("sb-access-token", accessToken, {
      expires,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    if (refreshToken) {
      cookieStore.set("sb-refresh-token", refreshToken, {
        expires,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }

    // Store token type
    cookieStore.set("sb-token-type", type, {
      expires,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
  } catch (error: any) {
    console.error("Token handler error:", error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Authentication error: " + error.message)}`, requestUrl.origin),
    )
  }
}
