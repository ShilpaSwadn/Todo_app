'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, clearAuthData, isAuthenticated } from '@lib/auth/client'
import { getCurrentUser as getCurrentUserAPI } from '@lib/services/auth'
import { FiUser, FiMail, FiPhone, FiCalendar, FiLogOut, FiEdit2, FiLock} from 'react-icons/fi'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      const localUser = getCurrentUser()
      if (localUser) {
        setUser(localUser)
        
        try {
          const userData = await getCurrentUserAPI()
          setUser(userData)
        } catch (error) {
          clearAuthData()
          router.push('/login')
          return
        }
      } else {
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

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold shadow-lg">
                {getInitials()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/edit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <FiEdit2 className="w-4 h-4" />
                Edit Profile
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Profile Information Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Profile Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    First Name
                  </label>
                </div>
                <p className="text-base text-gray-900 dark:text-white font-medium ml-6">
                  {user.firstName || 'N/A'}
                </p>
              </div>

              {/* Last Name */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Last Name
                  </label>
                </div>
                <p className="text-base text-gray-900 dark:text-white font-medium ml-6">
                  {user.lastName || 'N/A'}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Email Address
                  </label>
                </div>
                <p className="text-base text-gray-900 dark:text-white font-medium ml-6 break-all">
                  {user.email}
                </p>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2">
                  <FiPhone className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Mobile Number
                  </label>
                </div>
                <p className="text-base text-gray-900 dark:text-white font-medium ml-6">
                  {user.mobileNumber || 'N/A'}
                </p>
              </div>

              {/* Password */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2">
                  <FiLock className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Password
                  </label>
                </div>
                <p className="text-base text-gray-900 dark:text-white font-medium ml-6 font-mono">
                  •••••••••••
                </p>
              </div>

              {/* Member Since */}
              {user.createdAt && (
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-gray-400" />
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Member Since
                    </label>
                  </div>
                  <p className="text-base text-gray-900 dark:text-white font-medium ml-6">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
