'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiMail, FiKey, FiArrowLeft, FiEye, FiEyeOff, FiLock, FiUser, FiPhone, FiSun, FiMoon } from 'react-icons/fi'
import { useTheme } from '@/context/ThemeContext'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { FcGoogle } from 'react-icons/fc'
import { RiTwitterXFill } from 'react-icons/ri'
import { setupRecaptcha, sendOTP, verifyOTP, verifyMobileOTP, sendMobileOTP, loginWithPasswordDirect, loginWithGoogle, loginWithTwitter } from '@/lib/services/auth'
import { validateEmail, validateIdentifier } from '@/lib/utils/validation'

export default function Login() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingOTP, setSendingOTP] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loginMode, setLoginMode] = useState('password') // 'password' or 'otp'
  const [isMobile, setIsMobile] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [otpHash, setOtpHash] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('')

  // Re-initialize or reset Recaptcha if needed
  const ensureRecaptcha = (forceReset = false) => {
    try {
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        console.error("recaptcha-container not found in DOM");
        return null;
      }

      // If we already have a functional verifier and don't need a reset, reuse it
      if (window.recaptchaVerifier && !forceReset) {
        return window.recaptchaVerifier;
      }

      // Otherwise setup a fresh one
      return setupRecaptcha('recaptcha-container');
    } catch (err) {
      console.error("Recaptcha initialization failed:", err);
      return null;
    }
  };

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value)
    setError('')
  }

  const handleOTPChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(digitsOnly)
    setError('')
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithGoogle()
      if (result.success) {
        console.log('Google login successful, redirecting to dashboard...');
        // Force redirect to ensure state is fresh
        window.location.href = '/dashboard';
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
        console.log('Twitter login successful, redirecting to dashboard...');
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.message || 'Twitter login failed. Please try again.')
    } finally {
      setLoading(false)
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

      if (isMobile && confirmationResult) {
        await verifyMobileOTP(confirmationResult, otp)
      } else {
        await verifyOTP(identifier.trim().toLowerCase(), otp, otpHash)
      }
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
      if (!identifier || !password) {
        setError('Email/Mobile and Password are required. If you don\'t have an account, please register.')
        setLoading(false)
        return
      }

      if (!validateIdentifier(identifier)) {
        setError('Please enter a valid email or 10-digit mobile number')
        setLoading(false)
        return
      }

      // Direct login with password and verification check
      await loginWithPasswordDirect(identifier.trim().toLowerCase(), password)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier || !validateIdentifier(cleanIdentifier)) {
      setError('Please enter a valid email or 10-digit mobile number')
      return
    }

    setError('')
    setSendingOTP(true)

    try {
      // Improved phone detection: Only treat as phone if it's not an email and has digits
      const isPhone = !cleanIdentifier.includes('@') && (/^\d+$/.test(cleanIdentifier.replace(/\D/g, '')));
      setIsMobile(isPhone);

      // Check user existence first (Consistency with Email flow)
      const userStatusRes = await fetch('/api/auth/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanIdentifier })
      });

      const userStatus = await userStatusRes.json();

      if (!userStatus.success || !userStatus.exists) {
        setSendingOTP(false);
        setError('No account found for this ' + (isPhone ? 'mobile number' : 'email') + '. Please register for an account first.');
        return;
      }

      if (isPhone) {
        let formattedPhone = cleanIdentifier;
        // If it doesn't start with +, assume Indian number (+91)
        if (!formattedPhone.startsWith('+')) {
          if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
            formattedPhone = `+${formattedPhone}`;
          } else {
            formattedPhone = `+91${formattedPhone}`;
          }
        }

        const appVerifier = ensureRecaptcha(true); // Force fresh recaptcha for mobile
        if (!appVerifier) {
          throw new Error('Security check (reCAPTCHA) failed to initialize. Please refresh.');
        }

        const result = await sendMobileOTP(formattedPhone, appVerifier);
        setConfirmationResult(result);
        setShowOTP(true)
        setCountdown(60)
      } else {
        const response = await sendOTP(cleanIdentifier);
        if (response && response.hash) {
          setOtpHash(response.hash);
        }

        if (response.messageId && !response.isLoggedOnly) {
          // Poll for delivery status
          setDeliveryStatus('Queued...');
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            try {
              const statusRes = await fetch(`/api/auth/otp/status?id=${response.messageId}`);
              const statusData = await statusRes.json();

              if (statusData.status === 'SUCCESS') {
                clearInterval(pollInterval);
                setDeliveryStatus('Delivered!');
                setTimeout(() => {
                  setShowOTP(true);
                  setCountdown(60);
                  setDeliveryStatus('');
                }, 1000);
              } else if (statusData.status === 'ERROR') {
                clearInterval(pollInterval);
                setError(`Email delivery failed: ${statusData.error || 'Unknown error'}`);
                setDeliveryStatus('');
              } else if (attempts > 15) {
                // Timeout after 30 seconds
                clearInterval(pollInterval);
                setDeliveryStatus('Taking longer than usual...');
                setTimeout(() => {
                  setShowOTP(true);
                  setCountdown(60);
                }, 1000);
              } else {
                setDeliveryStatus('Delivering...');
              }
            } catch (e) {
              console.error("Polling error:", e);
            }
          }, 2000);
        } else {
          // Dev mode or logged only
          setShowOTP(true)
          setCountdown(60)
        }
      }
    } catch (err) {
      console.error("OTP send error:", err);
      let friendlyError = err.message || 'Failed to send OTP. Please try again.';

      if (err.code === 'auth/too-many-requests') {
        friendlyError = 'Too many attempts. If this is a test number, ensure it is added to Firebase Console EXACTLY as entered (including +91). Otherwise, please wait a few minutes.';
        // Reset recaptcha on this specific error
        ensureRecaptcha(true);
      } else if (err.code === 'auth/invalid-phone-number') {
        friendlyError = 'The phone number entered is invalid. Please check the format.';
      } else if (err.code === 'auth/quota-exceeded') {
        friendlyError = 'SMS quota exceeded for today. Please try again tomorrow.';
      } else if (err.message?.includes('UNSUPPORTED_FIRST_FACTOR') || err.code === 'auth/unsupported-first-factor') {
        friendlyError = 'OTP Login is not enabled for this phone number. It may be set up for Multi-Factor Authentication (MFA) instead. Please use Password Login.';
      }

      setError(friendlyError)
    } finally {
      setSendingOTP(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setSendingOTP(true)
    const cleanIdentifier = identifier.trim().toLowerCase();

    try {
      if (isMobile) {
        let formattedPhone = cleanIdentifier;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = `+91${formattedPhone}`;
        }
        const appVerifier = window.recaptchaVerifier;
        const result = await sendMobileOTP(formattedPhone, appVerifier);
        setConfirmationResult(result);
        setCountdown(60)
      } else {
        const response = await sendOTP(cleanIdentifier);
        if (response && response.hash) {
          setOtpHash(response.hash);
        }

        if (response.messageId && !response.isLoggedOnly) {
          setDeliveryStatus('Resending...');
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            try {
              const statusRes = await fetch(`/api/auth/otp/status?id=${response.messageId}`);
              const statusData = await statusRes.json();

              if (statusData.status === 'SUCCESS') {
                clearInterval(pollInterval);
                setDeliveryStatus('Resent!');
                setCountdown(60);
                setTimeout(() => setDeliveryStatus(''), 2000);
              } else if (statusData.status === 'ERROR') {
                clearInterval(pollInterval);
                setError(`Resend failed: ${statusData.error || 'Unknown error'}`);
                setDeliveryStatus('');
              } else if (attempts > 15) {
                clearInterval(pollInterval);
                setCountdown(60);
                setDeliveryStatus('');
              }
            } catch (e) {
              console.error("Resend polling error:", e);
            }
          }, 2000);
        } else {
          setCountdown(60)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setSendingOTP(false)
    }
  }

  const goBackToIdentifier = () => {
    setShowOTP(false)
    setOtp('')
    setError('')
    setCountdown(0)
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
        <div className="p-6 lg:p-8">
          {!showOTP ? (
            /* Main Login Form */
            <>
              <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Sign In
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose your preferred login method
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
                <button
                  onClick={() => { setLoginMode('password'); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'password'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  Password Login
                </button>
                <button
                  onClick={() => { setLoginMode('otp'); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'otp'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  OTP Login
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
                  <form onSubmit={handlePasswordLogin} className="space-y-3">
                    <div>
                      <label htmlFor="identifier" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email or Mobile Number
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          {/^\d+$/.test(identifier) ? (
                            <FiPhone className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          ) : (
                            <FiUser className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          )}
                        </div>
                        <input
                          type="text"
                          id="identifier"
                          name="identifier"
                          value={identifier}
                          onChange={handleIdentifierChange}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
                          placeholder="Email or mobile number"
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
                      disabled={loading || !identifier || !password}
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
                  <form onSubmit={handleSendOTP} className="space-y-3">
                    <div>
                      <label htmlFor="identifier-otp" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email or Mobile Number
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          {/^\d+$/.test(identifier) ? (
                            <FiPhone className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          ) : (
                            <FiUser className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          )}
                        </div>
                        <input
                          type="text"
                          id="identifier-otp"
                          name="identifier"
                          value={identifier}
                          onChange={handleIdentifierChange}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
                          placeholder="Email or mobile number"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingOTP || !identifier}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
                    >
                      {sendingOTP ? (
                        <span className="flex items-center justify-center">
                          <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                          {deliveryStatus || 'Sending Code...'}
                        </span>
                      ) : (
                        'Get Login Code'
                      )}
                    </button>
                  </form>
                )}

                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl transition-all duration-200 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
                    >
                      <FcGoogle className="w-4 h-4" />
                      Google
                    </button>

                    <button
                      onClick={handleTwitterLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white rounded-xl transition-all duration-200 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
                    >
                      <RiTwitterXFill className="w-4 h-4 text-black dark:text-white" />
                      Twitter
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
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
                  onClick={goBackToIdentifier}
                  className="mb-4 flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4 mr-1" />
                  Back to login
                </button>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Verify Code
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  We sent a code to <span className="font-bold text-gray-900 dark:text-white">{identifier}</span>
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

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center z-50 overflow-hidden"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <div className="relative w-6 h-6">
          <FiSun className={`w-6 h-6 absolute transition-all duration-500 scale-100 rotate-0 dark:scale-0 dark:-rotate-90 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`} />
          <FiMoon className={`w-6 h-6 absolute transition-all duration-500 scale-0 rotate-90 dark:scale-100 dark:rotate-0 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </button>

      <div id="recaptcha-container"></div>
    </main >
  )
}
