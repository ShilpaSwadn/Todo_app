'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, clearAuthData, isAuthenticated, saveAuthData } from '@lib/auth/client'
import { getCurrentUser as getCurrentUserAPI, updateProfile } from '@lib/services/auth'
import { validatePassword, validateMobileNumber } from '@lib/utils/validation'
import { FiSave,FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
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
    const { name, value } = e.target
    
    // Format mobile number - only allow digits
    if (name === 'mobileNumber') {
      const digitsOnly = value.replace(/\D/g, '')
      // Limit to 10 digits
      const limitedDigits = digitsOnly.slice(0, 10)
      setFormData({
        ...formData,
        [name]: limitedDigits
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Validate mobile number if provided
      if (formData.mobileNumber && formData.mobileNumber.trim() !== '') {
        if (!validateMobileNumber(formData.mobileNumber)) {
          setError('Mobile number must be exactly 10 digits')
          setSaving(false)
          return
        }
      }

      if (formData.password && formData.password.trim() !== '') {
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

      const updateData = { ...formData }
      const passwordChanged = updateData.password && updateData.password.trim() !== ''
      const emailChanged = user.email.toLowerCase() !== formData.email.trim().toLowerCase()
      
      if (!passwordChanged) {
        delete updateData.password
        delete updateData.oldPassword
      }

      const updatedUser = await updateProfile(updateData)
      
      // If password or email was changed, logout user
      if (passwordChanged || emailChanged) {
        clearAuthData()
        router.push('/login')
        return
      }
      
      // Otherwise, update token and redirect to dashboard
      const token = localStorage.getItem('token')
      if (token) {
        saveAuthData(updatedUser, token)
      }
      
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
      setSaving(false)
    }
  }

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
    <main className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Profile
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Update your account information
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
              {error && (
                <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Profile Information Section */}
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
                      placeholder="Enter first name"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
                      placeholder="Enter last name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
                      placeholder="Enter 10 digit mobile number"
                    />
                    {formData.mobileNumber.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formData.mobileNumber.length}/10 digits
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        id="oldPassword"
                        name="oldPassword"
                        value={formData.oldPassword}
                        onChange={handleChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showOldPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        minLength={6}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
                        placeholder="Min 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Leave blank to keep current password
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors font-medium text-center text-sm"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
