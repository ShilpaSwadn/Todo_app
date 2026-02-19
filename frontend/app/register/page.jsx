'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiLock, FiUser, FiMail, FiPhone } from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { FcGoogle } from 'react-icons/fc'
import { RiTwitterXFill } from 'react-icons/ri'
import { register, loginWithGoogle, loginWithTwitter } from '@/lib/services/auth'
import { validateRegisterForm } from '@/lib/utils/validation'
import PhoneInput from '@/components/ui/PhoneInput'
import { useEffect } from 'react'

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    fullMobileNumber: '',
    mobileCountryCode: 'IN',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    setError('')
  }

  const handlePhoneChange = (fullNumber, digits, countryCode) => {
    setFormData({
      ...formData,
      mobileNumber: digits,
      fullMobileNumber: fullNumber,
      mobileCountryCode: countryCode
    })
    setError('')
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithGoogle()
      if (result.success) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTwitterLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithTwitter()
      if (result.success) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Twitter login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
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

      // Call API to register user
      const response = await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName ? formData.lastName.trim() : '',
        email: formData.email.trim().toLowerCase(),
        mobileNumber: formData.fullMobileNumber,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      })

      setSuccessMsg(response.message || 'Registration successful! Please check your email for the activation link.')
      setLoading(false)
    } catch (err) {
      let friendlyMessage = err.message || 'We could not create your account. Please try again.';

      if (err.message?.includes('email-already-in-use')) {
        friendlyMessage = 'This email is already in use. Please try logging in instead.';
      } else if (err.message?.includes('weak-password')) {
        friendlyMessage = 'Your password is too weak. Please use at least 6 characters.';
      } else if (err.message?.includes('network-request-failed')) {
        friendlyMessage = 'Connection issue. Please check your internet and try again.';
      }

      setError(friendlyMessage);
      setLoading(false);
    }
  }

  if (successMsg) {
    return (
      <main className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiMail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Check Your Email</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {successMsg}
          </p>
          <Link
            href="/login"
            className="inline-block w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            Go to Login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
        <div className="p-6 lg:p-8">
          <div className="mb-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              Create Account
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
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
                  First Name <span className="text-red-500">*</span>
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
                Email Address <span className="text-red-500">*</span>
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
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                value={formData.mobileNumber}
                onChange={handlePhoneChange}
                error={null} // We show error at the top
              />
            </div>

            {/* Password Fields - Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Password <span className="text-red-500">*</span>
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
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-4 w-4 text-gray-400" />
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
              className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:transform-none text-sm"
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

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg transition-all duration-200 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
              >
                <FcGoogle className="w-4 h-4" />
                Google
              </button>

              <button
                onClick={handleTwitterLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-700 hover:border-black dark:hover:border-white rounded-lg transition-all duration-200 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
              >
                <RiTwitterXFill className="w-4 h-4 text-black dark:text-white" />
                Twitter
              </button>
            </div>
          </div>

          <div className="mt-3 text-center">
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

