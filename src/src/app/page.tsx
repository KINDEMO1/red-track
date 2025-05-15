"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FaBicycle, FaUser, FaMoon, FaSun, FaQuestionCircle, FaLanguage } from "react-icons/fa"
import Image from "next/image"

const LandingPage = () => {
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      if (user.isLoggedIn) {
        setIsLoggedIn(true)
      }
    }

    // Check system preference for dark mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true)
    }
  }, [])

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode)

  const handleLoginClick = () => {
    router.push("/login")
  }

  const handleRegisterClick = () => {
    router.push("/signup")
  }

  const handleDashboardClick = () => {
    router.push("/dashboard")
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
      <nav className="px-6 py-4 flex items-center justify-between bg-red-600 text-white">
        <div className="flex items-center space-x-2">
          <FaBicycle className="text-2xl" />
          <span className="text-xl font-bold">RED Track</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-red-700 transition-colors">
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>
          <button className="p-2 rounded-full hover:bg-red-700 transition-colors">
            <FaLanguage />
          </button>
          <button className="p-2 rounded-full hover:bg-red-700 transition-colors">
            <FaQuestionCircle />
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="lg:w-1/2 space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold">Welcome to RED Track</h1>
            <p className="text-lg opacity-90">
              Your university&apos;s smart bike borrowing system. Easily reserve, track, and manage bicycle rentals
              across campus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isLoggedIn ? (
                <button
                  onClick={handleDashboardClick}
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={handleLoginClick}
                    className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleRegisterClick}
                    className="px-8 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold dark:hover:bg-red-900"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="lg:w-1/2 relative h-[400px]">
            <Image
              src="/images/campus.png"
              alt="Students riding bikes on campus"
              fill
              className="rounded-xl shadow-2xl object-cover"
            />
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl shadow-lg dark:bg-gray-800">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FaBicycle className="text-2xl text-red-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
            <p className="opacity-75">Reserve your bike with just a few clicks and start riding immediately.</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-lg dark:bg-gray-800">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FaUser className="text-2xl text-red-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Student Friendly</h3>
            <p className="opacity-75">Designed specifically for university students with valid ID cards.</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-lg dark:bg-gray-800">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FaBicycle className="text-2xl text-red-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
            <p className="opacity-75">Monitor bike availability and location in real-time across campus.</p>
          </div>
        </div>
      </main>

      <footer className="mt-24 bg-gray-100 dark:bg-gray-800 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="opacity-75">&copy; {new Date().getFullYear()} RED Track - University Bike Borrowing System</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
