'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthData, isAuthenticated } from '@/lib/auth/client'
import { getCurrentUser as getCurrentUserAPI, logout } from '@/lib/services/auth'
import { FiLogOut, FiActivity, FiUser, FiSettings, FiShoppingBag, FiCheck, FiX } from 'react-icons/fi'
import MealSelector from '@/components/MealSelector'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const dropdownRef = useRef(null)

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
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      try {
        const userData = await getCurrentUserAPI()
        setUser(userData)
      } catch (error) {
        clearAuthData()
        router.push('/login')
        return
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading your profile...</p>
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign Out</h3>
              <p className="text-gray-500 text-sm mb-8 px-4">Are you sure you want to end your SkyDining session?</p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
                >
                  Confirm
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
              <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">SkyDining</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Pre-Flight Booking</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="hidden sm:block text-sm font-black uppercase tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
            >
              Sign Out
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
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Premium Member</p>
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
                  </div>
                  <div className="px-4 space-y-1">
                    <button className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all">
                      <FiUser className="w-5 h-5 opacity-50" /> View Account
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all">
                      <FiSettings className="w-5 h-5 opacity-50" /> System Settings
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all">
                      <FiShoppingBag className="w-5 h-5 opacity-50" /> Order History
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
              Welcome, {user?.firstName || 'Guest'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
              Customize your in-flight culinary experience with absolute precision.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Flight Identity</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums uppercase">AI-902-SKY</p>
          </div>
        </div>

        {/* Meal Selection System */}
        <MealSelector />
      </div>
    </main>
  )
}
