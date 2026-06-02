'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiLock, FiUser, FiMail, FiPhone, FiChevronDown, FiArrowLeft, FiKey, FiAlertCircle } from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { FcGoogle } from 'react-icons/fc'
import { RiTwitterXFill } from 'react-icons/ri'
import { register, loginWithGoogle, loginWithTwitter, setupRecaptcha, clearRecaptcha, sendMobileLinkingOTP, verifyMobileLinkingOTP, resendVerificationEmail, sanitizePhoneNumber } from '@/lib/services/auth'
import { validateRegisterForm } from '@/lib/utils/validation'
import PhoneInput from '@/components/ui/PhoneInput'
import { countries } from '@/lib/data/countries'
import { formatFirebaseError } from '@/lib/utils/error-handler'

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
  const [showMobileEntry, setShowMobileEntry] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [sendingOTP, setSendingOTP] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [socialMobile, setSocialMobile] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false)

  // Ultimate fix: Generate a unique ID for every single request
  const ensureRecaptcha = async () => {
    try {
      const wrapper = document.getElementById('recaptcha-wrapper');
      if (!wrapper) return null;

      // Always wipe and create a brand new ID
      const uniqueId = `recaptcha-container-${Date.now()}`;
      console.log("Generating fresh reCAPTCHA with ID:", uniqueId);

      clearRecaptcha();
      wrapper.innerHTML = `<div id="${uniqueId}"></div>`;

      return await setupRecaptcha(uniqueId);
    } catch (err) {
      console.error("Recaptcha initialization failed:", err);
      setError("Security check failed. Please refresh the page.");
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

  // Auto-clear error message
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('')
      }, 7000)
      return () => clearTimeout(timer)
    }
  }, [error])



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
        if (result.needsMobile) {
          setShowMobileEntry(true)
          setLoading(false)
          return
        }
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    } catch (err) {
      setError(formatFirebaseError(err))
      setLoading(false)
    }
  }

  const handleTwitterLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithTwitter()
      if (result.success) {
        if (result.needsMobile) {
          setShowMobileEntry(true)
          setLoading(false)
          return
        }
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    } catch (err) {
      setError(formatFirebaseError(err))
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

      // STOPS SUCCESS REDIRECT if account already exists
      if (!response.success || response.message?.includes('already registered')) {
        throw new Error(response.message || 'Registration failed');
      }

      setSuccessMsg(response.message || 'Registration successful! Please check your email for the activation link.')
      setResendCountdown(60)
      setLoading(false)
    } catch (err) {
      console.error('Registration submit error:', err);
      // Use the global error formatter for consistent, professional messages
      const friendlyMessage = formatFirebaseError(err);

      setError(friendlyMessage);
      setLoading(false);
      // Ensure we stay on the registration form
      setSuccessMsg('');
    }
  }

  const handleSendSocialMobileVerify = async (e) => {
    e.preventDefault()
    if (!socialMobile || socialMobile.length < 5) {
      setError('Please enter a valid mobile number')
      return
    }

    setError('')
    setSendingOTP(true)

    try {
      const sanitizedPhone = sanitizePhoneNumber(socialMobile, selectedCountry);

      // 1. Check if this mobile is already in use
      try {
        const checkRes = await fetch('/api/auth/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: sanitizedPhone })
        });
        const status = await checkRes.json();
        if (status.success && status.exists) {
          setError('This mobile number is already registered in our local system. Please login directly using this number.');
          setSendingOTP(false);
          return;
        }
      } catch (checkErr) {
        console.warn("Pre-link check failed, continuing anyway:", checkErr);
      }

      console.log("Requesting Linking OTP for:", sanitizedPhone);

      const appVerifier = await ensureRecaptcha();
      if (!appVerifier) return;

      const result = await sendMobileLinkingOTP(sanitizedPhone, appVerifier);
      setConfirmationResult(result);
      setShowOTP(true);
      setCountdown(60);
    } catch (err) {
      setError(formatFirebaseError(err))
    } finally {
      setSendingOTP(false)
    }
  }

  const handleVerifySocialOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!otp || otp.length !== 6) {
        setError('Please enter a 6-digit code')
        setLoading(false)
        return
      }

      await verifyMobileLinkingOTP(confirmationResult, otp)
      window.location.href = '/dashboard';
    } catch (err) {
      setError(formatFirebaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const goBackFromMobileEntry = () => {
    setShowMobileEntry(false)
    setShowOTP(false)
    setError('')
  }

  const [resendCountdown, setResendCountdown] = useState(0)

  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  if (successMsg) {
    return (
      <main className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiMail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm">
            {successMsg}
          </p>

          <div className="space-y-3">
            <button
              onClick={async () => {
                if (resendCountdown > 0) return;
                try {
                  setLoading(true);
                  setError('');
                  await resendVerificationEmail(formData.email);
                  setSuccessMsg('A new activation link has been sent to your email.');
                  setResendCountdown(60);
                } catch (err) {
                  const msg = err.message || '';
                  if (msg.includes('TOO_MANY_ATTEMPTS')) {
                    setError('Too many attempts. Please wait a few minutes before trying again.');
                  } else {
                    setError(msg || 'Failed to resend email. Please try again later.');
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || resendCountdown > 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <ImSpinner2 className="animate-spin h-5 w-5" />
              ) : resendCountdown > 0 ? (
                `Wait ${resendCountdown}s for resend code`
              ) : (
                'Resend Code'
              )}
            </button>

            <Link
              href="/login"
              className="inline-block w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-md"
            >
              Go to Login
            </Link>

            <button
              type="button"
              onClick={() => {
                setSuccessMsg('');
                setError('');
              }}
              className="w-full px-6 py-3 bg-transparent border-2 border-dashed border-gray-300 hover:border-indigo-500 dark:border-gray-600 dark:hover:border-indigo-400 text-gray-600 dark:text-gray-400 font-semibold rounded-lg transition-all text-sm"
            >
              Wrong email or mobile? Go back & edit
            </button>
          </div>

          {error && (
            <p className="mt-4 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
        <div className="p-6 lg:p-8">
          {showOTP ? (
            /* OTP Verification UI for Social Login */
            <>
              <div className="mb-8">
                <button
                  onClick={() => setShowOTP(false)}
                  className="mb-4 flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Verify Your Phone
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter the code sent to <span className="font-bold text-gray-900 dark:text-white">{socialMobile}</span>
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifySocialOTP} className="space-y-6">
                <div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiKey className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500" />
                    </div>
                    <input
                      type="text"
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      autoFocus
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all text-xl tracking-[0.3em] font-mono"
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    {countdown > 0 ? (
                      <span className="text-xs font-bold text-gray-400 italic">
                        Resend in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendSocialMobileVerify}
                        disabled={sendingOTP}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:text-gray-300"
                      >
                        {sendingOTP ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Finish'
                  )}
                </button>
              </form>
            </>
          ) : showMobileEntry ? (
            /* Mobile Entry UI for Social Login */
            <>
              <div className="mb-8">
                <button
                  onClick={goBackFromMobileEntry}
                  className="mb-4 flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4 mr-1" />
                  Cancel
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Complete Your Profile
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  To keep your account secure, please verify a mobile number.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendSocialMobileVerify} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCountrySelectorOpen(!isCountrySelectorOpen)}
                        className="flex items-center gap-1 px-3 py-3 bg-gray-50 dark:bg-gray-800/50 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors h-full"
                      >
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{selectedCountry.dialCode}</span>
                        <FiChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isCountrySelectorOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isCountrySelectorOpen && (
                        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                          {countries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => { setSelectedCountry(country); setIsCountrySelectorOpen(false); }}
                              className="w-full flex items-center justify-between px-4 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              <span>{country.name}</span>
                              <span className="text-gray-400 font-mono text-xs">{country.dialCode}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      id="social-mobile"
                      value={socialMobile}
                      onChange={(e) => setSocialMobile(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingOTP || !socialMobile}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                >
                  {sendingOTP ? (
                    <span className="flex items-center justify-center">
                      <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Sending OTP...
                    </span>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Standard Registration Form */
            <>
              <div className="mb-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                  Create Account
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Fill in your details to get started
                </p>
              </div>

              {error && (
                <div className="mb-6 p-5 bg-rose-500/10 dark:bg-rose-500/5 backdrop-blur-xl border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-between gap-4 animate-shake shadow-lg shadow-rose-500/5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-rose-500/20 rounded-xl shrink-0 mt-0.5">
                      <FiAlertCircle className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold leading-relaxed tracking-tight">
                      {error.includes('Login directly using mobile number') ? (
                        <div>
                          {error.split('Login')[0]}
                          <Link
                            href="/login"
                            className="text-indigo-600 dark:text-indigo-400 font-black hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors mx-1 underline decoration-2 underline-offset-4"
                          >
                            Login
                          </Link>
                          {error.split('Login')[1]}
                        </div>
                      ) : (
                        <span>{error}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setError('')} className="p-2 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0">
                    <HiX className="w-4 h-4" />
                  </button>
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
                        disabled={loading}
                        className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={loading}
                        className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={loading}
                      className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                    error={null}
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
                        disabled={loading}
                        className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={loading}
                        className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:transform-none text-sm disabled:cursor-not-allowed"
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
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg transition-all duration-200 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FcGoogle className="w-4 h-4" />
                    Google
                  </button>

                  <button
                    type="button"
                    onClick={handleTwitterLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-700 hover:border-black dark:hover:border-white rounded-lg transition-all duration-200 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
            </>
          )}
        </div>
      </div>

      <div id="recaptcha-wrapper">
        <div id="recaptcha-container"></div>
      </div>
    </main>
  )
}
