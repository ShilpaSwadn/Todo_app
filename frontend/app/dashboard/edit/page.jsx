'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthData, isAuthenticated, saveAuthData } from '@/lib/auth/client'
import { getCurrentUser as getCurrentUserAPI, updateProfile, resetPassword, sendOTP, sendMobileOTP, setupRecaptcha, clearRecaptcha } from '@/lib/services/auth'
import { validatePassword, validateMobileNumber } from '@/lib/utils/validation'
import { FiSave, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'
import PhoneInput from '@/components/ui/PhoneInput'
import { countries } from '@/lib/data/countries'

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
    fullMobileNumber: '',
    mobileCountryCode: 'IN',
    oldPassword: '',
    password: ''
  })
  const [forgotPwdLoading, setForgotPwdLoading] = useState(false)
  const [forgotPwdSuccess, setForgotPwdSuccess] = useState('')

  // Check if form is dirty (has changes)
  const isDirty = user ? (
    formData.firstName !== (user.firstName || '') ||
    formData.lastName !== (user.lastName || '') ||
    (formData.password && formData.password.trim() !== '')
  ) : false

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
          fullMobileNumber: userData.mobileNumber || '',
          mobileCountryCode: 'IN',
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
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const [verificationMode, setVerificationMode] = useState('none'); // 'none', 'email', 'mobile', 'confirm'
  const [otp, setOtp] = useState('');
  const [otpHash, setOtpHash] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => setResendCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const ensureRecaptcha = async () => {
    try {
      const container = document.getElementById('recaptcha-container');
      if (!container) return null;
      clearRecaptcha();
      container.innerHTML = `<div id="recaptcha-verifier"></div>`;
      return await setupRecaptcha('recaptcha-verifier');
    } catch (err) {
      console.error("Recaptcha init failed:", err);
      setError(err.message || "Security check failed. Please refresh.");
      return null;
    }
  };

  const handleStartVerification = async () => {
    setError('');
    setSaving(true);

    try {
      // Validate mobile number if provided
      if (formData.fullMobileNumber && formData.fullMobileNumber !== (user.mobileNumber || '')) {
        if (!validateMobileNumber(formData.fullMobileNumber, formData.mobileCountryCode)) {
          const country = countries.find(c => c.code === formData.mobileCountryCode);
          setError(country ? `Mobile number must be exactly ${country.maxLength} digits for ${country.name}` : 'Invalid mobile number');
          setSaving(false);
          return;
        }
      }

      if (formData.password && formData.password.trim() !== '') {
        if (!formData.oldPassword || formData.oldPassword.trim() === '') {
          setError('Current password is required to set a new password');
          setSaving(false);
          return;
        }
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.valid) {
          setError(passwordValidation.message);
          setSaving(false);
          return;
        }
      }

      const passwordChanged = formData.password && formData.password.trim() !== '';

      if (passwordChanged) {
        // Password solo change - ask for final confirmation
        setVerificationMode('confirm');
        setSaving(false);
      } else {
        // No sensitive changes (just name), proceed normally
        await proceedWithUpdate();
      }
    } catch (err) {
      setError(err.message || 'Verification failed to start');
      setSaving(false);
    }
  };

  const handleVerifyAndProceed = async () => {
    setError('');
    setSaving(true);
    try {
      if (verificationMode === 'email') {
        const { verifyOTP } = require('@/lib/services/auth');
        // We use a simplified check here or just proceed if hash matches? 
        // Actually we should call an endpoint that validates the OTP for this specific user.
        // For now, let's assume if it doesn't throw, it's verified.
        // Note: verifyOTP in our lib signs in the user, we need to be careful.
        // However, the user is already logged in.
        await api.post('/auth/otp/verify-only', {
          email: formData.email,
          otp,
          hash: otpHash
        });
      } else if (verificationMode === 'mobile') {
        await confirmationResult.confirm(otp);
      }

      await proceedWithUpdate();
    } catch (err) {
      setError(err.message || 'OTP verification failed');
      setSaving(false);
    }
  };

  const proceedWithUpdate = async () => {
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
      };
      const passwordChanged = formData.password && formData.password.trim() !== '';

      if (passwordChanged) {
        updateData.password = formData.password;
        updateData.oldPassword = formData.oldPassword;
      }

      const updatedUser = await updateProfile(updateData);

      if (passwordChanged) {
        clearAuthData();
        router.push('/login');
        return;
      }

      const token = localStorage.getItem('token');
      if (token) saveAuthData(updatedUser, token);

      router.push('/dashboard/profile');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleStartVerification();
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setForgotPwdLoading(true);
    setError('');
    setForgotPwdSuccess('');
    try {
      await resetPassword(user.email);
      setForgotPwdSuccess('Reset link sent to your email!');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setForgotPwdLoading(false);
    }
  };

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
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/profile"
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

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
              {error && (
                <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all text-sm font-medium"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all text-sm font-medium"
                      placeholder="Enter last name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      readOnly
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 cursor-not-allowed transition-all text-sm font-medium"
                      placeholder="Enter email address"
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 ml-1 font-bold uppercase tracking-wider">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                      Mobile Number
                    </label>
                    <div className="relative group/phone">
                      <div className="absolute inset-0 z-10 cursor-not-allowed" title="Mobile number cannot be changed"></div>
                      <PhoneInput
                        value={formData.fullMobileNumber || formData.mobileNumber}
                        onChange={() => { }} // No-op
                        className="w-full opacity-60 grayscale-[0.5]"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 ml-1 font-bold uppercase tracking-wider">Mobile number cannot be changed</p>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        id="oldPassword"
                        name="oldPassword"
                        value={formData.oldPassword}
                        onChange={handleChange}
                        className="w-full px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        disabled={forgotPwdLoading}
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${forgotPwdLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {showOldPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-1.5 px-1">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={forgotPwdLoading}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {forgotPwdLoading ? 'Sending...' : 'Forgot password?'}
                      </button>
                      {forgotPwdSuccess && (
                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                          {forgotPwdSuccess}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        minLength={6}
                        className="w-full px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors text-sm"
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

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/profile')}
                  className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors font-medium text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-bold flex items-center justify-center gap-2 text-sm shadow-md active:scale-95"
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
      {/* Verification Overlay */}
      {verificationMode !== 'none' && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-8">
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FiKey className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {verificationMode === 'email' && 'Verify New Email'}
                  {verificationMode === 'mobile' && 'Verify New Mobile'}
                  {verificationMode === 'confirm' && 'Confirm password change'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  {verificationMode === 'email' && `We've sent a 6-digit code to ${formData.email}`}
                  {verificationMode === 'mobile' && `We've sent a 6-digit code to ${formData.fullMobileNumber}`}
                  {verificationMode === 'confirm' && 'Are you sure you want to change your password? This will log you out.'}
                </p>
              </div>

              {verificationMode !== 'confirm' ? (
                <div className="space-y-6">
                  <div className="relative group">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000 000"
                      className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-indigo-500 focus:outline-none dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={handleVerifyAndProceed}
                    disabled={saving || otp.length !== 6}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      'Verify & Save'
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setVerificationMode('none')}
                    className="py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl font-black text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={proceedWithUpdate}
                    className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                  >
                    Yes, Change It
                  </button>
                </div>
              )}

              {verificationMode !== 'confirm' && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setVerificationMode('none')}
                    className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Cancel and go back
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recaptcha Container (Keep in DOM but low profile) */}
      <div id="recaptcha-container" className="fixed bottom-0 right-0 opacity-0 pointer-events-none"></div>
    </main>
  )
}

function FiKey(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4.1a1 1 0 0 0-1.4 0l-2.1 2.1a1 1 0 0 0 0 1.4Z" />
      <path d="m15.5 7.5-3 3" />
      <path d="M15.5 7.5 14 6" />
      <circle cx="7" cy="17" r="5" />
      <path d="M12 17h10" />
      <path d="m18 17 4 4" />
      <path d="m18 17 4-4" />
    </svg>
  )
}
