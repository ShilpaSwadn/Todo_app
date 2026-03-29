'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthData, isAuthenticated, saveAuthData } from '@/lib/auth/client'
import { getCurrentUser as getCurrentUserAPI, updateProfile } from '@/lib/services/auth'
import {
  FiArrowLeft,
  FiSave,
  FiCheck,
  FiAlertCircle,
  FiUser,
  FiHome,
  FiHeart,
  FiLock,
  FiShoppingBag,
  FiActivity,
  FiTarget,
  FiCoffee,
  FiChevronUp,
  FiLayout,
  FiMap,
  FiTrendingUp,
  FiBox,
  FiCalendar,
  FiZap,
  FiEye,
  FiSettings,
  FiDatabase,
  FiMoon
} from 'react-icons/fi'
import Link from 'next/link'
import DynamicProfileForm from '@/components/DynamicProfileForm'
import { profileConfig } from '@/lib/utils/profileConfig'
import { formatFirebaseError } from '@/lib/utils/error-handler'

export default function DynamicPortal() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState(profileConfig.categories[0]?.id || '')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    languagePreference: '',
    timeZone: '',
    email: '',
    mobileNumber: ''
  })
  const [profileData, setProfileData] = useState({})

  // Fetch user data
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
          languagePreference: userData.languagePreference || '',
          timeZone: userData.timeZone || '',
          email: userData.email || '',
          mobileNumber: userData.mobileNumber || ''
        })

        // Normalize profileData: if it's flat, group it by category
        const rawProfileData = userData.profileData || {};
        const normalizedProfileData = {};

        // If the data is already grouped (contains any category ID as a key with a list), keep it
        const isAlreadyGrouped = profileConfig.categories.some(cat => 
          Array.isArray(rawProfileData[cat.id])
        );

        if (isAlreadyGrouped) {
          setProfileData(rawProfileData);
        } else {
          // It's flat data, group it by category
          profileConfig.categories.forEach(cat => {
            if (cat.id === 'personal_account') return;
            const catData = {};
            cat.fields.forEach(f => {
              // Try to find the value in rawProfileData or core userData
              const value = rawProfileData[f.id] !== undefined ? rawProfileData[f.id] : userData[f.id];
              if (value !== undefined) {
                catData[f.id] = value;
              }
            });
            if (Object.keys(catData).length > 0) {
              normalizedProfileData[cat.id] = [catData];
            }
          });
          setProfileData(normalizedProfileData);
        }
      } catch (error) {
        clearAuthData()
        router.push('/login')
        return
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Scroll Tracking Logic for Sidebar Highlight
  useEffect(() => {
    const handleScroll = () => {
      const sections = profileConfig.categories.map(cat => document.getElementById(cat.id));
      const scrollPosition = window.scrollY + 250;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && scrollPosition >= section.offsetTop) {
          setActiveTab(profileConfig.categories[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // Action Logic
  const handleChange = (name, value) => {
    const isCore = profileConfig.categories
      .find(cat => cat.id === 'personal_account')
      .fields.some(f => f.id === name);

    // Find the category this field belongs to
    const category = profileConfig.categories.find(cat => 
      cat.fields.some(f => f.id === name)
    );
    const catId = category ? category.id : 'others';

    if (isCore) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      // For all other categories, update the list-of-objects structure
      setProfileData(prev => {
        const catId = category ? category.id : 'others';
        const currentList = prev[catId] || [{}];
        const currentObj = currentList[0] || {};
        
        // No need to store 'id' within the JSON for the category groups
        const updatedObj = { 
          ...currentObj, 
          [name]: value
        };
        
        return { ...prev, [catId]: [updatedObj] };
      });
    }

    setError('');
  }

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        languagePreference: formData.languagePreference,
        timeZone: formData.timeZone,
        profileData
      };

      const updatedUser = await updateProfile(updateData);
      const token = localStorage.getItem('token');
      if (token) saveAuthData(updatedUser, token);

      setUser(updatedUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setSaving(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      formData.firstName !== (user.firstName || '') ||
      formData.lastName !== (user.lastName || '') ||
      formData.languagePreference !== (user.languagePreference || '') ||
      formData.timeZone !== (user.timeZone || '') ||
      JSON.stringify(profileData) !== JSON.stringify(user.profileData || {})
    );
  }, [user, formData, profileData]);

  // Comprehensive Icon Map for all 16 categories
  const categoryIcons = {
    personal_account: <FiUser />,
    household_family: <FiHome />,
    dietary_religious: <FiHeart />,
    allergies_intolerances: <FiActivity />,
    health_medical: <FiActivity />,
    nutrition_goals: <FiTarget />,
    taste_preferences: <FiCoffee />,
    seasonal_regional: <FiLayout />,
    shopping_preferences: <FiShoppingBag />,
    pantry_kitchen: <FiBox />,
    meal_planning: <FiCalendar />,
    integrations: <FiZap />,
    accessibility_ui: <FiEye />,
    behavioral_data: <FiTrendingUp />,
    privacy_consent: <FiLock />,
    business_kiosk: <FiSettings />,
  };

  if (loading || !user) {
    return (
      <main className="h-screen bg-white dark:bg-[#020617] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent shadow-2xl"></div>
        <p className="mt-6 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.5em] animate-pulse">
          Opening Secure Vault
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDFDFD] dark:bg-[#020617] flex flex-col">

      {/* Dynamic Top Bar */}
      <nav className="sticky top-0 z-[500] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/50 px-6 sm:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[1.25rem] transition-all transform active:scale-90"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
          </Link>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Identity Model
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Live Dynamic Synchronization
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {success && (
            <div className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest">
              <FiCheck className="w-4 h-4" /> Securely Synchronized
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-[11px] transition-all duration-500 transform tracking-widest uppercase active:scale-95 shadow-xl ${isDirty
                ? 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:-translate-y-0.5 opacity-100 scale-100 translate-x-0'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-0 scale-90 translate-x-4 pointer-events-none'
              }`}
          >
            {saving ? 'Saving...' : (
              <>
                <FiSave className={isDirty ? 'w-4 h-4' : 'w-0'} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-6 sm:p-12 gap-10 lg:items-start">

        {/* Dynamic Navigation Sidebar */}
        <aside className="lg:w-[320px] shrink-0 sticky top-32 group">
          <div className="space-y-5">
            <div className="mb-8 px-6">
              <h4 className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em] mb-4">
                Identity Directory
              </h4>
              <div className="h-1.5 w-full bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full w-[100%] opacity-20" />
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-[80vh] overflow-y-auto pr-3 custom-scrollbar">
              {profileConfig.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToSection(cat.id)}
                  className={`w-full flex items-center justify-between px-8 py-5 rounded-[2rem] transition-all duration-300 group ${activeTab === cat.id
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none translate-x-2 z-10'
                      : 'text-gray-500 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-100 dark:hover:border-gray-800'
                    }`}
                >
                  <div className="flex items-center gap-6 overflow-hidden">
                    <span className={`text-xl transition-transform group-hover:scale-110 ${activeTab === cat.id ? 'text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                      {categoryIcons[cat.id] || <FiActivity />}
                    </span>
                    <span className={`text-[11px] font-black uppercase tracking-widest text-left truncate`}>
                      {cat.title}
                    </span>
                  </div>
                  {activeTab === cat.id && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Global Scalable Form */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-12 p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-[3rem] flex items-center gap-6 animate-shake">
              <FiAlertCircle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <h5 className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest leading-none">Synchronization Locked</h5>
                <p className="text-xs font-bold text-red-500/80 mt-2">{error}</p>
              </div>
            </div>
          )}

          <DynamicProfileForm
            categories={profileConfig.categories}
            data={{ ...formData, ...profileData }}
            onChange={handleChange}
          />

          {/* Return to Top Hub */}
          <div className="mt-24 p-12 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-[4rem] text-center shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-8 transform hover:rotate-12 transition-transform shadow-lg shadow-indigo-100 dark:shadow-none">
              <FiDatabase className="w-8 h-8" />
            </div>
            <h6 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.4em]">
              Data Modeling Vault
            </h6>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 mt-4 max-w-sm mx-auto leading-relaxed uppercase tracking-[0.2em]">
              All parameters are securely stored. Scroll back to review or push changes instantly.
            </p>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-10 group flex items-center gap-3 mx-auto px-10 py-5 bg-gray-50 dark:bg-gray-800 rounded-[2rem] hover:bg-white dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-700 shadow-sm"
            >
              <div className="w-8 h-8 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-sm group-hover:-translate-y-1 transition-transform">
                <FiChevronUp className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Return to Control Center
              </span>
            </button>
          </div>
        </div>
      </div>

      <footer className="py-20 text-center opacity-30">
        <p className="text-[9px] font-black text-gray-400 dark:text-gray-700 uppercase tracking-[1em]">
          Identity Engine v5.0.0 Alpha
        </p>
      </footer>
    </main>
  )
}
