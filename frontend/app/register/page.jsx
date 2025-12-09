'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiCheck, FiLock, FiZap, FiUser, FiMail, FiPhone, FiShield } from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { register } from '@lib/services/auth'
import { validateRegisterForm, validateMobileNumber } from '@lib/utils/validation'

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Format mobile number - only allow digits, max 10
    if (name === 'mobileNumber') {
      const digitsOnly = value.replace(/\D/g, '')
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
    setLoading(true)

    try {
      // Validate form
      const validation = validateRegisterForm(formData)
      
      if (!validation.isValid) {
        // Show first error message
        const firstError = Object.values(validation.errors)[0]
        setError(firstError)
        setLoading(false)
        return
      }

      // Validate mobile number if provided
      if (formData.mobileNumber && formData.mobileNumber.trim() !== '') {
        if (!validateMobileNumber(formData.mobileNumber)) {
          setError('Mobile number must be exactly 10 digits')
          setLoading(false)
          return
        }
      }

      // Call API to register user
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName ? formData.lastName.trim() : '',
        email: formData.email.trim().toLowerCase(),
        mobileNumber: formData.mobileNumber.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      })

      // Redirect to dashboard on success
      setLoading(false)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Left Side - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-md">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4">Welcome!</h1>
            <p className="text-xl text-indigo-100">
              Join us and start organizing your tasks today. Create your account and get started with our amazing todo app.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiCheck className="w-6 h-6" />
              </div>
              <span className="text-lg">Easy task management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiLock className="w-6 h-6" />
              </div>
              <span className="text-lg">Secure and private</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiZap className="w-6 h-6" />
              </div>
              <span className="text-lg">Fast and reliable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 overflow-hidden flex items-center">
        <div className="w-full max-w-lg mx-auto py-[30px] px-4 sm:px-6 lg:px-[50px]">
          <div className="mb-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Create Account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fill in your details to get started
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-r-lg">
              <div className="flex items-center">
                <HiX className="w-4 h-4 mr-2" />
                <span className="text-xs font-medium">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name Fields - Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm"
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Last Name <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm"
                  placeholder="john.doe@example.com"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="mobileNumber" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="mobileNumber"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  maxLength={10}
                  className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm"
                  placeholder="Enter 10 digit mobile number"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formData.mobileNumber.length > 0 && `${formData.mobileNumber.length}/10 digits`}
              </p>
            </div>

            {/* Password Fields - Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm"
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiShield className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:transform-none text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <ImSpinner2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

