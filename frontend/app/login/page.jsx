'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiMail, FiKey, FiArrowLeft, FiEye, FiEyeOff, FiLock } from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { sendOTP, verifyOTP, loginWithPasswordDirect } from '@/lib/services/auth'
import { validateEmail } from '@/lib/utils/validation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingOTP, setSendingOTP] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loginMode, setLoginMode] = useState('password') // 'password' or 'otp'

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    setError('')
  }

  const handleOTPChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(digitsOnly)
    setError('')
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

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        setError('Email and Password are required')
        setLoading(false)
        return
      }

      // Direct login with password and verification check
      await loginWithPasswordDirect(email.trim().toLowerCase(), password)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setError('')
    setSendingOTP(true)

    try {
      await sendOTP(email.trim().toLowerCase())
      setShowOTP(true)
      setCountdown(60)
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setSendingOTP(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setSendingOTP(true)

    try {
      await sendOTP(email.trim().toLowerCase())
      setCountdown(60)
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
        <div className="p-8 lg:p-10">
          {!showOTP ? (
            /* Main Login Form */
            <>
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Sign In
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose your preferred login method
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8">
                <button
                  onClick={() => { setLoginMode('password'); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'password'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  Email + Password
                </button>
                <button
                  onClick={() => { setLoginMode('otp'); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'otp'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  Email Only
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <div className="flex items-center">
                    <HiX className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {loginMode === 'password' ? (
                  <form onSubmit={handlePasswordLogin} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={email}
                          onChange={handleEmailChange}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
                          placeholder="name@company.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiLock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-500 transition-colors"
                        >
                          {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                        </button>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Link
                          href="/forgot-password"
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                          Signing In...
                        </span>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSendOTP} className="space-y-5">
                    <div>
                      <label htmlFor="email-otp" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="email"
                          id="email-otp"
                          name="email"
                          value={email}
                          onChange={handleEmailChange}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
                          placeholder="name@company.com"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingOTP || !email}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
                    >
                      {sendingOTP ? (
                        <span className="flex items-center justify-center">
                          <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                          Sending Code...
                        </span>
                      ) : (
                        'Get Login Code'
                      )}
                    </button>
                  </form>
                )}

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    New here?{' '}
                    <Link href="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                      Create an account
                    </Link>
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* OTP Form Section */
            <>
              <div className="mb-8">
                <button
                  onClick={goBackToEmail}
                  className="mb-4 flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4 mr-1" />
                  Back to email
                </button>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Verify Code
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  We sent a code to <span className="font-bold text-gray-900 dark:text-white">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiKey className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500" />
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
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all text-2xl tracking-[0.5em] font-mono font-bold"
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                      6-digit code
                    </p>
                    {countdown > 0 ? (
                      <span className="text-xs font-bold text-gray-400">
                        Resend in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={sendingOTP}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:text-gray-300 transition-colors"
                      >
                        {sendingOTP ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !otp || otp.length !== 6}
                  className="w-full px-4 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div >
    </main >
  )
}
