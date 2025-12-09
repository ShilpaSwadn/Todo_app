'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, clearAuthData, isAuthenticated } from '../../lib/auth/client'
import { getCurrentUser as getCurrentUserAPI } from '../../lib/services/auth'
import { FiUser, FiMail, FiPhone, FiCalendar, FiLogOut, FiLock, FiEdit2 } from 'react-icons/fi'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is authenticated
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      // Try to get user from localStorage first
      const localUser = getCurrentUser()
      if (localUser) {
        setUser(localUser)
        
        // Optionally verify token with backend
        try {
          const userData = await getCurrentUserAPI()
          setUser(userData)
        } catch (error) {
          // Token invalid, clear auth and redirect
          clearAuthData()
          router.push('/login')
          return
        }
      } else {
        // Try to fetch from API
        try {
          const userData = await getCurrentUserAPI()
          setUser(userData)
        } catch (error) {
          clearAuthData()
          router.push('/login')
          return
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    clearAuthData()
    router.push('/login')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getInitials = () => {
    if (!user) return 'U'
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
  }

  // Show loading state while checking auth
  if (loading || !user) {
    return (
      <main className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-hidden">
      {/* Single Rectangle Profile Card - Wider Design */}
      <div className="w-full max-w-6xl h-full max-h-[95vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Profile Header with Gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 h-28 sm:h-32 flex-shrink-0">
          <div className="absolute inset-0 bg-black/10"></div>
          
          {/* Logout Button - Top Right */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
            >
              <FiLogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Avatar and Name Section */}
          <div className="absolute bottom-0 left-0 right-0 px-3 sm:px-4 lg:px-6 pb-2 sm:pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-1.5 sm:gap-3">
              {/* Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-2xl border-3 border-white dark:border-gray-800">
                {getInitials()}
              </div>
              
              {/* User Name and Email */}
              <div className="flex-1 pb-0.5 sm:pb-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-0.5 drop-shadow-lg">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-white/90 drop-shadow-md">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Section - No scroll */}
        <div className="flex-1 p-3 sm:p-4 lg:p-5 flex flex-col min-h-0">
          <div className="mb-2 sm:mb-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FiUser className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Profile Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">View and manage your account details</p>
            </div>
            <Link
              href="/dashboard/edit"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm shadow-md hover:shadow-lg"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          </div>

          {/* Information Grid - 2 columns on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 flex-1">
            {/* First Name */}
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-700/50 hover:shadow-lg transition-all duration-200 flex items-center">
              <div className="p-2 bg-indigo-500 rounded-lg shadow-md flex-shrink-0">
                <FiUser className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 ml-2.5">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-0.5">First Name</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                  {user.firstName || 'N/A'}
                </p>
              </div>
            </div>

            {/* Last Name */}
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700/50 hover:shadow-lg transition-all duration-200 flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg shadow-md flex-shrink-0">
                <FiUser className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 ml-2.5">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">Last Name</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                  {user.lastName || 'N/A'}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700/50 hover:shadow-lg transition-all duration-200 flex items-center">
              <div className="p-2 bg-purple-500 rounded-lg shadow-md flex-shrink-0">
                <FiMail className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 ml-2.5">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-0.5">Email Address</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white break-all">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Mobile Number */}
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border border-pink-200 dark:border-pink-700/50 hover:shadow-lg transition-all duration-200 flex items-center">
              <div className="p-2 bg-pink-500 rounded-lg shadow-md flex-shrink-0">
                <FiPhone className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 ml-2.5">
                <p className="text-xs font-medium text-pink-600 dark:text-pink-400 mb-0.5">Mobile Number</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {user.mobileNumber || 'N/A'}
                </p>
              </div>
            </div>

            {/* Password - Hidden */}
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700/50 hover:shadow-lg transition-all duration-200 flex items-center">
              <div className="p-2 bg-red-500 rounded-lg shadow-md flex-shrink-0">
                <FiLock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 ml-2.5">
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">Password</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-mono">
                  •••••••••••••••
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hidden for security</p>
              </div>
            </div>

            {/* Account Created */}
            {user.createdAt && (
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700/50 hover:shadow-lg transition-all duration-200 flex items-center">
                <div className="p-2 bg-green-500 rounded-lg shadow-md flex-shrink-0">
                  <FiCalendar className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 ml-2.5">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-0.5">Member Since</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

