'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, clearAuthData, isAuthenticated, saveAuthData } from '../../../lib/auth/client'
import { getCurrentUser as getCurrentUserAPI, updateProfile } from '../../../lib/services/auth'
import { validatePassword } from '../../../lib/utils/validation'
import { FiUser, FiMail, FiPhone, FiSave, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import Link from 'next/link'

export default function EditProfile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    oldPassword: '',
    password: ''
  })

  // Check authentication and load user data
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      try {
        const userData = await getCurrentUserAPI()
        setUser(userData)
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          mobileNumber: userData.mobileNumber || '',
          oldPassword: '',
          password: ''
        })
      } catch (error) {
        clearAuthData()
        router.push('/login')
        return
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Validate password if provided
      if (formData.password && formData.password.trim() !== '') {
        // Check if old password is provided when updating password
        if (!formData.oldPassword || formData.oldPassword.trim() === '') {
          setError('Old password is required to update password')
          setSaving(false)
          return
        }

        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid) {
          setError(passwordValidation.message)
          setSaving(false)
          return
        }
      }

      // Only include password fields if new password is provided
      const updateData = { ...formData }
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password
        delete updateData.oldPassword
      }

      const updatedUser = await updateProfile(updateData)
      
      // Update localStorage with new user data
      const token = localStorage.getItem('token')
      if (token) {
        saveAuthData(updatedUser, token)
      }
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
      setSaving(false)
    }
  }

  const getInitials = () => {
    if (!user) return 'U'
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
  }

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
      <div className="w-full max-w-6xl h-full max-h-[95vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Profile Header with Gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 h-28 sm:h-32 flex-shrink-0">
          <div className="absolute inset-0 bg-black/10"></div>

          {/* Avatar and Title Section */}
          <div className="absolute bottom-0 left-0 right-0 px-3 sm:px-4 lg:px-6 pb-2 sm:pb-3">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-2xl border-3 border-white dark:border-gray-800 flex-shrink-0">
                {getInitials()}
              </div>
              
              {/* Edit Profile Title */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                  Edit Profile
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 p-3 sm:p-4 lg:p-5 flex flex-col min-h-0">
          {error && (
            <div className="mb-2 sm:mb-3 p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-r-lg flex-shrink-0">
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 flex-1 min-h-0">
              {/* First Name */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-700/50">
                <label htmlFor="firstName" className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                  <FiUser className="w-3.5 h-3.5" />
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors text-sm sm:text-base font-semibold"
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700/50">
                <label htmlFor="lastName" className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5">
                  <FiUser className="w-3.5 h-3.5" />
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-2 border-blue-200 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors text-sm sm:text-base font-semibold"
                  placeholder="Enter last name"
                />
              </div>

              {/* Email */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700/50">
                <label htmlFor="email" className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1.5">
                  <FiMail className="w-3.5 h-3.5" />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-purple-200 dark:border-purple-700 rounded-lg focus:outline-none focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-colors text-sm sm:text-base font-semibold"
                  placeholder="Enter email address"
                />
              </div>

              {/* Mobile Number */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border border-pink-200 dark:border-pink-700/50">
                <label htmlFor="mobileNumber" className="block text-xs font-medium text-pink-600 dark:text-pink-400 mb-1 flex items-center gap-1.5">
                  <FiPhone className="w-3.5 h-3.5" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  id="mobileNumber"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-2 border-pink-200 dark:border-pink-700 rounded-lg focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:text-white transition-colors text-sm sm:text-base font-semibold"
                  placeholder="Enter mobile number"
                />
              </div>

              {/* Old Password */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700/50">
                <label htmlFor="oldPassword" className="block text-xs font-medium text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                  <FiLock className="w-3.5 h-3.5" />
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    id="oldPassword"
                    name="oldPassword"
                    value={formData.oldPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border-2 border-orange-200 dark:border-orange-700 rounded-lg focus:outline-none focus:border-orange-500 dark:bg-gray-700 dark:text-white transition-colors text-sm sm:text-base font-semibold"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                  >
                    {showOldPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-orange-500 dark:text-orange-400 mt-0.5">Required only if changing password</p>
              </div>

              {/* New Password */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700/50">
                <label htmlFor="password" className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
                  <FiLock className="w-3.5 h-3.5" />
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border-2 border-red-200 dark:border-red-700 rounded-lg focus:outline-none focus:border-red-500 dark:bg-gray-700 dark:text-white transition-colors text-sm sm:text-base font-semibold"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-red-500 dark:text-red-400 mt-0.5">Leave blank to keep current password</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 sm:gap-3 pt-2 sm:pt-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/dashboard"
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-200 font-medium text-sm sm:text-base shadow-md hover:shadow-lg disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
