'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiMail, FiKey, FiArrowLeft, FiEye, FiEyeOff, FiLock, FiUser, FiPhone, FiSun, FiMoon, FiAlertCircle } from 'react-icons/fi'
import { useTheme } from '@/context/ThemeContext'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { FcGoogle } from 'react-icons/fc'
import { RiTwitterXFill } from 'react-icons/ri'
import { setupRecaptcha, clearRecaptcha, sendOTP, verifyOTP, verifyMobileOTP, sendMobileOTP, loginWithPasswordDirect, loginWithGoogle, loginWithTwitter, resendVerificationEmail, sendMobileLinkingOTP, verifyMobileLinkingOTP, sanitizePhoneNumber } from '@/lib/services/auth'
import { useAuth } from '@/context/AuthContext'
import { validateEmail, validateIdentifier } from '@/lib/utils/validation'
import { countries } from '@/lib/data/countries'
import { FiChevronDown } from 'react-icons/fi'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { formatFirebaseError } from '@/lib/utils/error-handler'

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
  const [resendingVerification, setResendingVerification] = useState(false)
  const [resendSuccess, setResendSuccess] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false)
  const [showMobileEntry, setShowMobileEntry] = useState(false)
  const { user: authUser, loading: authLoading } = useAuth()
  const [verificationType, setVerificationType] = useState('login') // 'login', 'social-link'

  useEffect(() => {
    if (!authLoading && authUser) {
      router.push('/dashboard')
    }
  }, [authLoading, authUser, router])

  // Ultimate fix: Generate a unique ID for every single request
  const ensureRecaptcha = async () => {
    try {
      const wrapper = document.getElementById('recaptcha-wrapper');
      if (!wrapper) {
        console.error("Recaptcha wrapper div missing from DOM");
        return null;
      }

      // Always wipe and create a brand new ID to prevent "already rendered" issues
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



  const handleIdentifierChange = (e) => {
    let value = e.target.value

    // If it looks like a phone number (start with digits or +), enforce maxLength
    const isPotentiallyPhone = value.startsWith('+') || /^\d+$/.test(value.replace(/\s/g, ''))

    if (isPotentiallyPhone && !value.includes('@')) {
      // Remove non-digits to check length
      const digits = value.replace(/\D/g, '')
      if (digits.length > selectedCountry.maxLength && !value.startsWith('+')) {
        value = digits.slice(0, selectedCountry.maxLength)
      }
    }

    setIdentifier(value)

    // Auto-detect country if typed with +
    if (value.startsWith('+')) {
      for (const country of countries) {
        if (value.startsWith(country.dialCode)) {
          setSelectedCountry(country)
          break
        }
      }
    }

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
        if (result.needsMobile) {
          setVerificationType('social-link');
          setShowMobileEntry(true);
          setIdentifier(''); // Clear for phone entry
          setLoading(false);
          return;
        }
        console.log('Google login successful, redirecting to dashboard...');
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    } catch (err) {
      setError(formatFirebaseError(err));
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
          setVerificationType('social-link');
          setShowMobileEntry(true);
          setIdentifier(''); // Clear for phone entry
          setLoading(false);
          return;
        }
        console.log('Twitter login successful, redirecting to dashboard...');
        router.push('/dashboard');
      } else {
        setLoading(false)
      }
    } catch (err) {
      setError(formatFirebaseError(err));
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

      if (verificationType === 'social-link') {
        await verifyMobileLinkingOTP(confirmationResult, otp)
        window.location.href = '/dashboard';
        return;
      }

      if (isMobile && confirmationResult) {
        await verifyMobileOTP(confirmationResult, otp)
      } else {
        await verifyOTP(identifier.trim().toLowerCase(), otp, otpHash)
      }
      router.push('/dashboard')
    } catch (err) {
      setError(formatFirebaseError(err))
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

      if (!validateIdentifier(identifier, selectedCountry.code)) {
        setError(`Please enter a valid email or ${selectedCountry.maxLength}-digit mobile number`)
        setLoading(false)
        return
      }

      // Check length specifically if it's a mobile number
      if (!identifier.includes('@')) {
        const digits = identifier.replace(/\D/g, '');
        if (digits.length !== selectedCountry.maxLength && !identifier.startsWith('+')) {
          setError(`Mobile number must be exactly ${selectedCountry.maxLength} digits for ${selectedCountry.name}`);
          setLoading(false);
          return;
        }
      }

      // Sanitize identifier if it's a phone number
      let finalIdentifier = identifier.trim().toLowerCase();
      if (!finalIdentifier.includes('@')) {
        finalIdentifier = sanitizePhoneNumber(finalIdentifier, selectedCountry);
      }

      // Direct login with password and verification check
      await loginWithPasswordDirect(finalIdentifier, password)
      router.push('/dashboard')
    } catch (err) {
      setLoading(false);
      setError(formatFirebaseError(err));
    }
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier || !validateIdentifier(cleanIdentifier, selectedCountry.code)) {
      setError(`Please enter a valid email or ${selectedCountry.maxLength}-digit mobile number`)
      return
    }

    // Explicit check for mobile number length
    if (!cleanIdentifier.includes('@')) {
      const digits = cleanIdentifier.replace(/\D/g, '');
      if (digits.length !== selectedCountry.maxLength && !cleanIdentifier.startsWith('+')) {
        setError(`Mobile number must be exactly ${selectedCountry.maxLength} digits for ${selectedCountry.name}`);
        return;
      }
    }

    setError('')
    setSendingOTP(true)

    try {
      // Improved phone detection: Only treat as phone if it's not an email and has digits
      const isPhone = !cleanIdentifier.includes('@') && (/^\d+$/.test(cleanIdentifier.replace(/\D/g, '')));
      setIsMobile(isPhone);

      // Check user existence first (Consistency with Email flow)
      const identifierForStatus = isPhone ? sanitizePhoneNumber(cleanIdentifier, selectedCountry) : cleanIdentifier;

      const userStatusRes = await fetch('/api/auth/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifierForStatus })
      });

      const userStatus = await userStatusRes.json();

      if (!userStatus.success || !userStatus.exists) {
        setSendingOTP(false);
        setError(`No account found for this ${isPhone ? 'mobile number' : 'email'}. Please Register for an account first.`);
        return;
      }

      if (isPhone) {
        // Use the new robust sanitization logic
        const sanitizedPhone = sanitizePhoneNumber(cleanIdentifier, selectedCountry);

        console.log("Requesting SMS for number:", sanitizedPhone);

        const appVerifier = await ensureRecaptcha();
        if (!appVerifier) return; // Error handled inside ensureRecaptcha

        const result = await sendMobileOTP(sanitizedPhone, appVerifier);
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
          await new Promise((resolve) => {
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
                    resolve();
                  }, 1000);
                } else if (statusData.status === 'ERROR') {
                  clearInterval(pollInterval);
                  setError(`Email delivery failed: ${statusData.error || 'Unknown error'}`);
                  setDeliveryStatus('');
                  resolve();
                } else if (attempts > 15) {
                  // Timeout after 30 seconds
                  clearInterval(pollInterval);
                  setDeliveryStatus('Taking longer than usual...');
                  setTimeout(() => {
                    setShowOTP(true);
                    setCountdown(60);
                    resolve();
                  }, 1000);
                } else {
                  setDeliveryStatus('Delivering...');
                }
              } catch (e) {
                console.error("Polling error:", e);
              }
            }, 2000);
          });
        } else {
          // Dev mode or logged only
          setShowOTP(true)
          setCountdown(60)
        }
      }
    } catch (err) {
      console.error("OTP send error:", err);
      setError(formatFirebaseError(err))
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
        const sanitizedPhone = sanitizePhoneNumber(cleanIdentifier, selectedCountry);
        const appVerifier = await ensureRecaptcha();
        if (!appVerifier) return;
        const result = await sendMobileOTP(sanitizedPhone, appVerifier);
        setConfirmationResult(result);
        setCountdown(60)
      } else {
        const response = await sendOTP(cleanIdentifier);
        if (response && response.hash) {
          setOtpHash(response.hash);
        }

        if (response.messageId && !response.isLoggedOnly) {
          await new Promise((resolve) => {
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
                  setTimeout(() => {
                    setDeliveryStatus('');
                    resolve();
                  }, 2000);
                } else if (statusData.status === 'ERROR') {
                  clearInterval(pollInterval);
                  setError(`Resend failed: ${statusData.error || 'Unknown error'}`);
                  setDeliveryStatus('');
                  resolve();
                } else if (attempts > 15) {
                  clearInterval(pollInterval);
                  setCountdown(60);
                  setDeliveryStatus('');
                  resolve();
                }
              } catch (e) {
                console.error("Resend polling error:", e);
              }
            }, 2000);
          });
        } else {
          setCountdown(60)
        }
      }
    } catch (err) {
      setError(formatFirebaseError(err))
    } finally {
      setSendingOTP(false)
    }
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

  const handleResendVerification = async () => {
    if (resendCountdown > 0) return;
    if (!identifier || !identifier.includes('@')) {
      setError('Please enter your registered email address.')
      return
    }

    setResendingVerification(true)
    setError('')
    setResendSuccess('')

    try {
      const response = await resendVerificationEmail(identifier.trim().toLowerCase())
      if (response.success) {
        setResendSuccess('A new verification link has been sent to your email.')
        setResendCountdown(60)
      } else {
        setError(response.message || 'Failed to resend verification link.')
      }
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setResendingVerification(false)
    }
  }

  const handleSendMobileVerify = async (e) => {
    e.preventDefault()
    const digits = identifier.replace(/\D/g, '');
    if (digits.length !== selectedCountry.maxLength && !identifier.startsWith('+')) {
      setError(`Mobile number must be exactly ${selectedCountry.maxLength} digits for ${selectedCountry.name}`);
      setSendingOTP(false);
      return;
    }

    setError('')
    setSendingOTP(true)

    try {
      const sanitizedPhone = sanitizePhoneNumber(identifier, selectedCountry);

      // 1. Check if this mobile is already in use
      try {
        const checkRes = await fetch('/api/auth/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: sanitizedPhone })
        });
        const status = await checkRes.json();
        if (status.success && status.exists) {
          setError('This mobile number is already linked to another account. Please use a different number or login directly.');
          setSendingOTP(false);
          return;
        }
      } catch (checkErr) {
        console.warn("Pre-link check failed, continuing anyway:", checkErr);
      }

      console.log("Linking mobile number:", sanitizedPhone);

      const appVerifier = await ensureRecaptcha();
      if (!appVerifier) return;

      const result = await sendMobileLinkingOTP(sanitizedPhone, appVerifier);
      setConfirmationResult(result);
      setShowOTP(true);
      setCountdown(60);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setSendingOTP(false)
    }
  }

  const goBackFromMobileEntry = () => {
    setShowMobileEntry(false)
    setVerificationType('login')
    setError('')
  }

  const goBackToIdentifier = () => {
    setShowOTP(false)
    setOtp('')
    setError('')
    setCountdown(0)
  }


  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
        <div className="p-6 lg:p-8">
          {showOTP ? (
            /* OTP Form Section */
            <>
              <div className="mb-8">
                <button
                  onClick={goBackToIdentifier}
                  className="mb-4 flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4 mr-1" />
                  Back to {verificationType === 'social-link' ? 'profile completion' : 'login'}
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
                    'Verify & Finish'
                  )}
                </button>
              </form>
            </>
          ) : showMobileEntry ? (
            /* Mobile Entry Section (for Social Linking) */
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
                  Complete Profile
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Almost there! Please verify your mobile number to complete your registration.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendMobileVerify} className="space-y-4">
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
                      id="mobile-verify"
                      value={identifier}
                      onChange={handleIdentifierChange}
                      required
                      maxLength={identifier.startsWith('+') ? 20 : selectedCountry.maxLength}
                      autoFocus
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
                      placeholder={`${selectedCountry.maxLength}-digit mobile number`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingOTP || !identifier}
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
                  onClick={() => { if (!loading && !sendingOTP) { setLoginMode('password'); setError(''); } }}
                  disabled={loading || sendingOTP}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'password'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Password Login
                </button>
                <button
                  onClick={() => { if (!loading && !sendingOTP) { setLoginMode('otp'); setError(''); } }}
                  disabled={loading || sendingOTP}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'otp'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  OTP Login
                </button>
              </div>

              {error && (
                <div className="mb-6 p-5 bg-rose-500/10 dark:bg-rose-500/5 backdrop-blur-xl border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-between gap-4 animate-shake shadow-lg shadow-rose-500/5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-rose-500/20 rounded-xl shrink-0 mt-0.5">
                        <FiAlertCircle className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold leading-relaxed tracking-tight flex-1">
                        {error.includes('Register') ? (
                          <div>
                            {error.split('Register')[0]}
                            <Link
                              href="/register"
                              className="text-indigo-600 dark:text-indigo-400 font-black hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors mx-1 underline decoration-2 underline-offset-4"
                            >
                              Register
                            </Link>
                            {error.split('Register')[1]}
                          </div>
                        ) : error.includes('Google OAuth') ? (
                          <div>
                            {error.split('Google OAuth')[0]}
                            <button
                              type="button"
                              onClick={handleGoogleLogin}
                              className="text-indigo-600 dark:text-indigo-400 font-black hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors mx-1 underline decoration-2 underline-offset-4"
                            >
                              Google OAuth
                            </button>
                            {error.split('Google OAuth')[1].includes('OTP login') ? (
                              <>
                                {error.split('Google OAuth')[1].split('OTP login')[0]}
                                <button
                                  type="button"
                                  onClick={() => { setLoginMode('otp'); setError(''); }}
                                  className="text-indigo-600 dark:text-indigo-400 font-black hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors mx-1 underline decoration-2 underline-offset-4"
                                >
                                  OTP login
                                </button>
                                {error.split('OTP login')[1]}
                              </>
                            ) : (
                              error.split('Google OAuth')[1]
                            )}
                          </div>
                        ) : (
                          <span>{error}</span>
                        )}
                      </div>
                    </div>
                    
                    {(error.toLowerCase().includes('not verified') || error.toLowerCase().includes('verification link') || error.toLowerCase().includes('activate it')) && identifier.includes('@') && (
                      <button
                        onClick={handleResendVerification}
                        disabled={resendingVerification || resendCountdown > 0}
                        className="ml-14 text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-2 w-fit transition-all hover:translate-x-1 disabled:opacity-50 disabled:translate-x-0"
                      >
                        {resendingVerification ? (
                          <ImSpinner2 className="animate-spin h-3 w-3" />
                        ) : null}
                        {resendingVerification
                          ? 'Resending...'
                          : resendCountdown > 0
                            ? `Wait ${resendCountdown}s`
                            : 'Resend Verification Link →'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => setError('')} className="p-2 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              )}

              {resendSuccess && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">{resendSuccess}</p>
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
                        <div className="flex">
                          {/* Country Selector - Only show if it looks like phone and no + typed manually */}
                          {(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) && (
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
                          )}
                          <div className="relative flex-1">
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
                              disabled={loading || sendingOTP}
                              maxLength={(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) ? selectedCountry.maxLength : 100}
                              className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 ${(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) ? 'rounded-r-xl border-l-0' : 'rounded-xl'} focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all`}
                              placeholder={(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) ? `${selectedCountry.maxLength}-digit mobile number` : "Email or mobile number"}
                            />
                          </div>
                        </div>
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
                          disabled={loading || sendingOTP}
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
                      disabled={loading || sendingOTP || !identifier || !password}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
                    >
                      {loading || sendingOTP ? (
                        <span className="flex items-center justify-center">
                          <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                          {sendingOTP ? 'Sending Code...' : 'Signing In...'}
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
                        <div className="flex">
                          {/* Country Selector - Only show if it looks like phone and no + typed manually */}
                          {(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) && (
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
                          )}
                          <div className="relative flex-1">
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
                              disabled={loading || sendingOTP}
                              maxLength={(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) ? selectedCountry.maxLength : 100}
                              className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 ${(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) ? 'rounded-r-xl border-l-0' : 'rounded-xl'} focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all`}
                              placeholder={(!identifier.includes('@') && !identifier.startsWith('+') && /^\d+/.test(identifier.replace(/\s/g, ''))) ? `${selectedCountry.maxLength}-digit mobile number` : "Email or mobile number"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingOTP || loading || !identifier}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
                    >
                      {sendingOTP || loading ? (
                        <span className="flex items-center justify-center">
                          <ImSpinner2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                          {sendingOTP ? (deliveryStatus || 'Sending Code...') : 'Signing In...'}
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
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading || sendingOTP}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl transition-all duration-200 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FcGoogle className="w-4 h-4" />
                      Google
                    </button>

                    <button
                      type="button"
                      onClick={handleTwitterLogin}
                      disabled={loading || sendingOTP}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white rounded-xl transition-all duration-200 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
          )}
        </div>
      </div>

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

      <div id="recaptcha-wrapper">
        <div id="recaptcha-container"></div>
      </div>
    </main>
  )
}
