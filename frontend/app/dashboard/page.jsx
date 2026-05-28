'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthData } from '@/lib/auth/client'
import { logout } from '@/lib/services/auth'
import { useAuth } from '@/context/AuthContext'
import { FiLogOut, FiActivity, FiUser, FiSettings, FiShoppingBag, FiCheck, FiX, FiSun, FiMoon } from 'react-icons/fi'
import MealSelector from '@/components/MealSelector'
import { useTheme } from '@/context/ThemeContext'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { user: authUser, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showIncompleteModal, setShowIncompleteModal] = useState(false)
  const dropdownRef = useRef(null)

  const profileCompletion = user ? [
    user.firstName,

    user.lastName,
    user.mobileNumber,
    user.email
  ].filter(Boolean).length : 0;

  const completionPercentage = (profileCompletion / 4) * 100;

  useEffect(() => {
    if (!loading && user) {
      const timer = setTimeout(() => {
        // Check if essential details are missing
        const isIncomplete = profileCompletion < 4;
        if (isIncomplete) {
          setShowIncompleteModal(true);
        }
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [loading, user, profileCompletion]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileOpen])

  useEffect(() => {
    if (!authLoading) {
      if (!authUser) {
        router.push('/login')
      } else {
        setUser(authUser)
        setLoading(false)

        // Sync the token cookie for the backend
        const syncCookie = async () => {
          try {
            const token = await authUser.token || localStorage.getItem('token');
            if (token) {
              document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; ${window.location.protocol === 'https:' ? 'secure' : ''}; samesite=lax`;
            }
          } catch (e) {
            console.error("Cookie sync failed:", e);
          }
        }
        syncCookie();
      }
    }
  }, [authLoading, authUser, router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{t('dashboard.loading_profile')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-700 max-w-sm w-full mx-4 transform animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-600 mb-4">
                <FiLogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.sign_out_confirm.title')}</h3>
              <p className="text-gray-500 text-sm mb-8 px-4">{t('dashboard.sign_out_confirm.text')}</p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {t('dashboard.sign_out_confirm.cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 disabled:bg-rose-400"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>{t('dashboard.sign_out_confirm.logging_out')}</span>
                    </>
                  ) : (
                    t('dashboard.sign_out_confirm.confirm')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Profile Prompt Modal */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 max-w-sm w-full mx-4 transform animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                <FiUser className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.profile_incomplete.title')}</h3>
              <p className="text-gray-500 text-sm mb-8 px-4">
                {t('dashboard.profile_incomplete.text')}
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowIncompleteModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('dashboard.profile_incomplete.later')}
                </button>
                <button
                  onClick={() => {
                    setShowIncompleteModal(false);
                    router.push('/dashboard/edit');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  {t('dashboard.profile_incomplete.complete_now')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <FiActivity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Swadn</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{t('dashboard.pre_flight_booking', 'Pre-Flight Booking')}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm flex items-center justify-center relative group overflow-hidden"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <div className="relative w-5 h-5">
                <FiSun className={`w-5 h-5 absolute transition-all duration-500 scale-100 rotate-0 dark:scale-0 dark:-rotate-90 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`} />
                <FiMoon className={`w-5 h-5 absolute transition-all duration-500 scale-0 rotate-90 dark:scale-100 dark:rotate-0 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </button>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="hidden sm:block text-sm font-black uppercase tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
            >
              {t('dashboard.sign_out')}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-3 p-1 pr-4 rounded-full border-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${isProfileOpen ? 'border-indigo-600 ring-4 ring-indigo-500/10' : 'border-gray-100 dark:border-gray-700'}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-inner">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase tracking-tighter">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-4 w-72 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 py-6 z-20 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-8 pb-6 border-b border-gray-100 dark:border-gray-700 mb-4 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 mb-4 flex items-center justify-center text-white text-2xl font-black shadow-xl rotate-3">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover rounded-3xl" />
                      ) : (
                        <span>{user?.firstName?.[0]}</span>
                      )}
                    </div>
                    <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-1">{user?.email}</p>

                    {/* Completion Progress */}
                    <div className="w-full mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.completion', 'Completion')}</span>
                        <span className="text-[10px] font-black text-indigo-600">{completionPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pb-4 pt-1 space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        router.push('/dashboard/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all uppercase tracking-wider group whitespace-nowrap"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors shadow-sm shrink-0">
                        <FiSettings className="w-4 h-4 opacity-70" />
                      </div>
                      <span>{t('dashboard.account_settings')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all uppercase tracking-wider group whitespace-nowrap"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-rose-900/30 transition-colors shadow-sm shrink-0">
                        <FiLogOut className="w-4 h-4 opacity-70" />
                      </div>
                      <span>{t('dashboard.sign_out')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
              {t('dashboard.welcome', { name: user?.firstName || 'Guest' })}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
              {t('dashboard.sub_welcome')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">{t('dashboard.flight_identity')}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums uppercase">AI-902-SKY</p>
          </div>
        </div>

        {/* Meal Selection System */}
        <MealSelector />
      </div>
    </main>
  )
}
