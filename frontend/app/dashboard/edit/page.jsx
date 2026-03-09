'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthData, isAuthenticated, saveAuthData } from '@/lib/auth/client'
import { getCurrentUser as getCurrentUserAPI, updateProfile } from '@/lib/services/auth'
import { validateMobileNumber } from '@/lib/utils/validation'
import { FiSave, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'
import PhoneInput from '@/components/ui/PhoneInput'
import { countries } from '@/lib/data/countries'
import { formatFirebaseError } from '@/lib/utils/error-handler'

export default function EditProfile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    fullMobileNumber: '',
    mobileCountryCode: 'IN'
  })

  // Determine if sensitive fields should be editable (if they are missing or trivial)
  const isEmailMissing = !user?.email ||
    user.email.trim() === '' ||
    user.email.trim().toLowerCase() === 'null';

  const isMobileMissing = !user?.mobileNumber ||
    user.mobileNumber.trim() === '' ||
    user.mobileNumber.trim().toLowerCase() === 'null' ||
    user.mobileNumber.trim().length < 8;

  const isEmailEditable = isEmailMissing;
  const isMobileEditable = isMobileMissing;

  // Check if form is dirty (has changes)
  const isDirty = user ? (
    formData.firstName !== (user.firstName || '') ||
    formData.lastName !== (user.lastName || '') ||
    (isEmailEditable && formData.email?.trim() !== '' && formData.email?.trim() !== (user.email || '')) ||
    (isMobileEditable && !!formData.fullMobileNumber && formData.fullMobileNumber !== (user.mobileNumber || ''))
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
          mobileCountryCode: 'IN'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validate mobile number if provided
      const mergedMobile = formData.fullMobileNumber || formData.mobileNumber;
      if (isMobileEditable && mergedMobile && mergedMobile !== (user.mobileNumber || '')) {
        if (!validateMobileNumber(mergedMobile, formData.mobileCountryCode)) {
          const country = countries.find(c => c.code === formData.mobileCountryCode);
          setError(country ? `Mobile number must be exactly ${country.maxLength} digits for ${country.name}` : 'Invalid mobile number');
          setSaving(false);
          return;
        }
      }

      await proceedWithUpdate();
    } catch (err) {
      setError(formatFirebaseError(err));
      setSaving(false);
    }
  };

  const proceedWithUpdate = async () => {
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
      };

      if (isEmailEditable && formData.email?.trim() !== '' && formData.email?.trim() !== (user.email || '')) {
        updateData.email = formData.email.trim();
      }

      const mergedMobile = formData.fullMobileNumber || formData.mobileNumber;
      if (isMobileEditable && mergedMobile && mergedMobile !== (user.mobileNumber || '')) {
        updateData.mobileNumber = mergedMobile;
      }

      const updatedUser = await updateProfile(updateData);

      const token = localStorage.getItem('token');
      if (token) saveAuthData(updatedUser, token);

      router.push('/dashboard/profile');
    } catch (err) {
      setError(formatFirebaseError(err));
      setSaving(false);
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
                      First Name
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
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                      <span>Email Address {isEmailEditable && <span className="text-red-500">*</span>}</span>
                      {isEmailEditable && <span className="text-[10px] text-indigo-500 lowercase font-normal italic">(Add your email now)</span>}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      readOnly={!isEmailEditable}
                      disabled={!isEmailEditable}
                      className={`w-full px-4 py-2.5 border rounded-xl transition-all text-sm font-medium ${!isEmailEditable ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white cursor-text'}`}
                      placeholder={isEmailEditable ? "Add your email address" : "Enter email address"}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                      <span>Mobile Number {isMobileEditable && <span className="text-red-500">*</span>}</span>
                      {isMobileEditable && <span className="text-[10px] text-indigo-500 lowercase font-normal italic">(Add your mobile now)</span>}
                    </label>
                    <div className="relative group/phone">
                      <PhoneInput
                        value={formData.fullMobileNumber || formData.mobileNumber}
                        disabled={!isMobileEditable}
                        onChange={(fullNumber, digitsOnly, countryCode) => {
                          if (isMobileEditable) {
                            setFormData(prev => ({
                              ...prev,
                              fullMobileNumber: fullNumber,
                              mobileCountryCode: countryCode || prev.mobileCountryCode
                            }));
                            setError('');
                          }
                        }}
                        className="w-full"
                      />
                    </div>
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
    </main>
  )
}
