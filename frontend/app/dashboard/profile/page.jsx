'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthData, isAuthenticated } from '@/lib/auth/client'
import { getCurrentUser as getCurrentUserAPI } from '@/lib/services/auth'
import { FiArrowLeft, FiEdit2, FiUser, FiMail, FiPhone } from 'react-icons/fi'
import Link from 'next/link'

export default function ViewProfile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      try {
        const userData = await getCurrentUserAPI()
        setUser(userData)
      } catch (error) {
        clearAuthData()
        router.push('/login')
        return
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading || !user) {
    return (
      <main className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95"
              >
                <FiArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  Profile Information
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  View your account details
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/edit"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
            >
              <FiEdit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </Link>
          </div>

          {/* Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-8 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* First Name */}
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <FiUser className="w-4 h-4 text-indigo-500" />
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                      First Name
                    </label>
                  </div>
                  <p className={`text-lg font-bold px-6 py-4 rounded-2xl border transition-all ${user.firstName
                      ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50'
                      : 'text-gray-300 dark:text-gray-600 bg-gray-50/30 dark:bg-gray-900/20 border-dashed border-gray-200 dark:border-gray-800 italic'
                    }`}>
                    {user.firstName || 'Not provided'}
                  </p>
                </div>

                {/* Last Name */}
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <FiUser className="w-4 h-4 text-indigo-500" />
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                      Last Name
                    </label>
                  </div>
                  <p className={`text-lg font-bold px-6 py-4 rounded-2xl border transition-all ${user.lastName
                      ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50'
                      : 'text-gray-300 dark:text-gray-600 bg-gray-50/30 dark:bg-gray-900/20 border-dashed border-gray-200 dark:border-gray-800 italic'
                    }`}>
                    {user.lastName || 'Not provided'}
                  </p>
                </div>

                {/* Email */}
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <FiMail className="w-4 h-4 text-indigo-500" />
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                      Email Address
                    </label>
                  </div>
                  <p className={`text-lg font-bold px-6 py-4 rounded-2xl border transition-all ${user.email
                      ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50'
                      : 'text-gray-300 dark:text-gray-600 bg-gray-50/30 dark:bg-gray-900/20 border-dashed border-gray-200 dark:border-gray-800 italic'
                    }`}>
                    {user.email || 'Not provided'}
                  </p>
                </div>

                {/* Mobile Number */}
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <FiPhone className="w-4 h-4 text-indigo-500" />
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                      Mobile Number
                    </label>
                  </div>
                  <p className={`text-lg font-bold px-6 py-4 rounded-2xl border transition-all ${user.mobileNumber
                      ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50'
                      : 'text-gray-300 dark:text-gray-600 bg-gray-50/30 dark:bg-gray-900/20 border-dashed border-gray-200 dark:border-gray-800 italic'
                    }`}>
                    {user.mobileNumber || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
