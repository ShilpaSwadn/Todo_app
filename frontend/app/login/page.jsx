'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiCheckCircle, FiClock, FiZap, FiMail, FiKey, FiArrowLeft } from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { sendOTP, verifyOTP } from '@lib/services/auth'
import { validateEmail } from '@lib/utils/validation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingOTP, setSendingOTP] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    setError('')
  }

  const handleOTPChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(digitsOnly)
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please provide a valid email address')
      return
    }

    setSendingOTP(true)

    try {
      await sendOTP(email.trim().toLowerCase())
      setShowOTP(true)
      setCountdown(60)
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setSendingOTP(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!otp || otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP')
        setLoading(false)
        return
      }

      await verifyOTP(email.trim().toLowerCase(), otp)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to verify OTP. Please try again.')
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setSendingOTP(true)

    try {
      await sendOTP(email.trim().toLowerCase())
      setCountdown(60)
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setSendingOTP(false)
    }
  }

  const goBackToEmail = () => {
    setShowOTP(false)
    setOtp('')
    setError('')
    setCountdown(0)
  }

  return (
    <main className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Left Side - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-md">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4">Welcome Back!</h1>
            <p className="text-xl text-indigo-100">
              Sign in to continue managing your profile. Your productivity journey continues here.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <span className="text-lg">Secure Authentication</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiClock className="w-6 h-6" />
              </div>
              <span className="text-lg">Easy Profile Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiZap className="w-6 h-6" />
              </div>
              <span className="text-lg">Fast & Reliable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 overflow-hidden flex items-center">
        <div className="w-full max-w-lg mx-auto py-[30px] px-4 sm:px-6 lg:px-[50px]">
          {!showOTP ? (
            /* Email Form */
            <>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Sign In
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your email to receive a login code
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={handleEmailChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingOTP || !email}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
                >
                  {sendingOTP ? (
                    <span className="flex items-center justify-center">
                      <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Sending OTP...
                    </span>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link href="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    Create one here
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* OTP Form */
            <>
              <div className="mb-6">
                <button
                  onClick={goBackToEmail}
                  className="mb-4 flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4 mr-2" />
                  Back to email
                </button>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Enter OTP
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We've sent a 6-digit code to <span className="font-semibold">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OTP Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiKey className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      value={otp}
                      onChange={handleOTPChange}
                      required
                      maxLength={6}
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      6-digit code
                    </p>
                    {countdown > 0 ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Resend in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={sendingOTP}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {sendingOTP ? 'Sending...' : 'Resend OTP'}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !otp || otp.length !== 6}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
