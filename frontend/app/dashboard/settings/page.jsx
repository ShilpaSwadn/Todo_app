'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthData, isAuthenticated, saveAuthData } from '@/lib/auth/client'
import { getCurrentUser as getCurrentUserAPI, updateProfile } from '@/lib/services/auth'
import api from '@/lib/api/client'
import {
  FiArrowLeft,
  FiSave,
  FiCheck,
  FiAlertCircle,
  FiUser,
  FiGlobe,
  FiCreditCard,
  FiActivity,
  FiUsers,
  FiX,
  FiMap,
  FiChevronDown
} from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import Link from 'next/link'
import PersonalSection from '@/components/settings/PersonalSection'
import GroupsSection from '@/components/settings/GroupsSection'
import LanguageSection from '@/components/settings/LanguageSection'
import PaymentSection from '@/components/settings/PaymentSection'
import GroupAddressSection from '@/components/settings/GroupAddressSection'
import { personalConfig } from '@/lib/utils/personalConfig'
import { groupsConfig } from '@/lib/utils/groupsConfig'
import { languageConfig } from '@/lib/utils/languageConfig'
import { paymentConfig } from '@/lib/utils/paymentConfig'
import { groupAddressConfig } from '@/lib/utils/groupAddressConfig'
import { formatFirebaseError } from '@/lib/utils/error-handler'
import { LoadingOverlay } from '@/components/ui/LoadingSpinner'
import { accessConfig } from '@/lib/utils/accessConfig'
import AccessSection from '@/components/settings/AccessSection'
import { FiShield } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

// Maps the human-readable language name (stored in DB) → i18next language code
const LANG_CODE_MAP = {
  English: 'en',
  German: 'de',
  Hindi: 'hi',
  Tamil: 'ta',
  Spanish: 'en',
  French: 'en',
  Japanese: 'en',
  Mandarin: 'en',
}


export default function SettingsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')
  const [expandedSections, setExpandedSections] = useState({})

  // Initial states for change detection
  const [initialFormData, setInitialFormData] = useState({})
  const [initialProfileData, setInitialProfileData] = useState({})

  // States for Personal & Language (shared because they use the same form handler)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    languagePreference: '',
    timeZone: '',
    currency: 'USD',
    email: '',
    mobileNumber: ''
  })
  const [profileData, setProfileData] = useState({})
  const [userGroups, setUserGroups] = useState([])

  // Change detection
  const hasChanges = useMemo(() => {
    if (!user) return false;
    const formDataChanged = Object.keys(formData).some(key => formData[key] !== initialFormData[key]);
    if (formDataChanged) return true;
    return JSON.stringify(profileData) !== JSON.stringify(initialProfileData);
  }, [formData, profileData, initialFormData, initialProfileData, user]);

  // Fetch initial user data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      try {
        const userData = await getCurrentUserAPI()
        setUser(userData)

        const initialForm = {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          languagePreference: userData.languagePreference || 'English',
          timeZone: userData.timeZone || 'UTC',
          currency: userData.currency || 'USD',
          email: userData.email || '',
          mobileNumber: userData.mobileNumber || ''
        };
        setFormData(initialForm)
        setInitialFormData(initialForm)

        // Normalize profileData
        const rawProfileData = userData.profileData || {};
        const normalizedProfileData = {};
        const isAlreadyGrouped = personalConfig.categories.some(cat =>
          Array.isArray(rawProfileData[cat.id])
        );

        if (isAlreadyGrouped) {
          setProfileData(rawProfileData);
          setInitialProfileData(rawProfileData);
        } else {
          personalConfig.categories.forEach(cat => {
            if (cat.id === 'personal_account') return;
            const catData = {};
            cat.fields.forEach(f => {
              const value = rawProfileData[f.id] !== undefined ? rawProfileData[f.id] : userData[f.id];
              if (value !== undefined) catData[f.id] = value;
            });
            if (Object.keys(catData).length > 0) normalizedProfileData[cat.id] = [catData];
          });
          setProfileData(normalizedProfileData);
          setInitialProfileData(normalizedProfileData);
        }

        // Fetch groups to determine section visibility
        const groupsResponse = await api.get('/groups');
        if (groupsResponse.success) {
          setUserGroups(groupsResponse.groups || []);
        }
      } catch (error) {
        console.error("Fetch data error:", error)
        clearAuthData()
        router.push('/login')
      }
      setLoading(false)
    }

    fetchData()
  }, [router])

  // Clear messages when switching sections
  useEffect(() => {
    setError('')
    setSuccess(false)
  }, [activeSection])

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const handlePersonalChange = (name, value) => {
    const isCore = ['firstName', 'lastName', 'languagePreference', 'timeZone', 'currency'].includes(name);
    if (isCore) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      const category = personalConfig.categories.find(cat =>
        cat.fields.some(f => f.id === name)
      );
      const catId = category ? category.id : 'others';
      setProfileData(prev => {
        const currentList = prev[catId] || [{}];
        const updatedObj = { ...currentList[0], [name]: value };
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
        currency: formData.currency,
        profileData
      };
      const updatedUser = await updateProfile(updateData);
      const token = localStorage.getItem('token');
      if (token) saveAuthData(updatedUser, token);
      setUser(updatedUser);

      // Apply language change immediately — don't wait for AuthContext to re-sync
      const langCode = LANG_CODE_MAP[formData.languagePreference] || 'en';
      i18n.changeLanguage(langCode);

      setInitialFormData({ ...formData });
      setInitialProfileData({ ...profileData });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setSaving(false);
    }
  };

  const availableSections = useMemo(() => {
    const allSections = [
      { ...personalConfig, icon: <FiUser /> },
      { ...groupsConfig, icon: <FiUsers /> },
      { ...groupAddressConfig, icon: <FiMap /> },
      { ...accessConfig, icon: <FiShield /> },
      { ...languageConfig, icon: <FiGlobe /> },
      { ...paymentConfig, icon: <FiCreditCard /> },
    ];

    // All sections are always visible; role filtering happens inside each component
    return allSections;
  }, [userGroups, user]);

  // Ensure active section is valid
  useEffect(() => {
    if (!loading && user && availableSections.length > 0) {
      const isValid = availableSections.some(s => s.id === activeSection);
      if (!isValid) setActiveSection('personal');
    }
  }, [availableSections, activeSection, loading, user]);

  if (loading || !user) {
    return (
      <main className="h-screen bg-white dark:bg-[#020617] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent"></div>
        <p className="mt-6 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.5em] animate-pulse">
          {t('settings.loading_settings')}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDFDFD] dark:bg-[#020617] flex flex-col relative">

      {/* Top Header */}
      <nav className="sticky top-0 z-[500] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/50 px-6 sm:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[1.25rem] transition-all transform active:scale-90"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
              {t('settings.title')}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t('settings.secure_connection')}
              </span>
            </div>
          </div>
        </div>

        {(activeSection === 'personal' || activeSection === 'language') && (
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all transform active:scale-95 shadow-xl ${saving || !hasChanges
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none'
              }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('settings.saving')}</span>
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                <span>{t('settings.save_changes')}</span>
              </>
            )}
          </button>
        )}
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-6 sm:p-12 gap-10">
        {/* Settings Navigation */}
        <aside className="lg:w-[380px] shrink-0 space-y-8 lg:sticky lg:top-32 lg:self-start lg:h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar pr-2 pb-10">
          <div className="p-8 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-[3rem] shadow-sm">
            <h4 className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em] mb-8 px-2">
              {t('settings.menu_title')}
            </h4>
            <div className="space-y-3">
              {availableSections.map(section => {
                const isPersonal = section.id === 'personal';
                const isExpanded = expandedSections[section.id];
                return (
                  <div key={section.id} className="space-y-2">
                    <button
                      onClick={() => {
                        setActiveSection(section.id);
                        if (isPersonal) {
                          setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }));
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full group text-left p-6 rounded-[2.5rem] transition-all duration-500 relative overflow-hidden ${activeSection === section.id
                        ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 dark:shadow-none'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-100'
                        }`}
                    >
                      <div className="flex items-center gap-5 relative z-10">
                        <div className={`p-3 rounded-2xl transition-colors ${activeSection === section.id
                          ? 'bg-white/20'
                          : 'bg-gray-50 dark:bg-gray-700'
                          }`}>
                          <span className={`text-xl ${activeSection === section.id ? 'text-white' : 'text-indigo-600'}`}>
                            {section.icon}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className={`text-[11px] font-black uppercase tracking-widest ${activeSection === section.id ? 'text-white' : 'text-gray-900 dark:text-white'
                            }`}>
                            {t('settings.sections.' + section.id + '.title', section.title)}
                          </p>
                          <p className={`text-[9px] font-bold mt-1 uppercase ${activeSection === section.id ? 'text-white/60' : 'text-gray-400 dark:text-gray-600'
                            }`}>
                            {t('settings.sections.' + section.id + '.description', section.description)}
                          </p>
                        </div>
                        {isPersonal && (
                          <FiChevronDown
                            className={`w-4 h-4 transition-transform duration-300 shrink-0 ${activeSection === section.id ? 'text-white/70' : 'text-gray-400'} ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Nested Subnav for Personal Information */}
                    {isPersonal && isExpanded && (
                      <div className="pl-6 pr-2 py-2 space-y-1 border-l-2 border-indigo-100 dark:border-indigo-900/50 ml-8 animate-in slide-in-from-top-2 duration-300">
                        {personalConfig.categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              const el = document.getElementById(cat.id);
                              if (el) {
                                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                              }
                            }}
                            className="block w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                          >
                            {t('settings.categories.' + cat.id, cat.title)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Analytics Card */}
          <div className="p-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3.5rem] text-white shadow-2xl overflow-hidden relative">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <FiActivity className="w-10 h-10 mb-6 opacity-40" />
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{t('settings.system_health')}</h5>
            <p className="text-2xl font-black mt-2 tracking-tighter uppercase leading-none">{t('settings.system_status')}</p>
            <div className="mt-8 flex items-center gap-3">
              <div className="px-4 py-2 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">TLS 1.3</div>
              <div className="px-4 py-2 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">AES-256</div>
            </div>
          </div>
        </aside>

        {/* Main Section Content */}
        <div className="flex-1 min-w-0 font-sans">
          <div className="bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-[4rem] p-8 sm:p-14 shadow-sm min-h-[600px] relative">
            <LoadingOverlay active={saving} label={t('settings.saving')} />
            {/* Header for Active Section */}
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-sm ${activeSection === 'personal' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' :
                    activeSection === 'language' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                      activeSection === 'groups' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' :
                        activeSection === 'group_address' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
                          activeSection === 'access' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' :
                            'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                  }`}>
                  {availableSections.find(s => s.id === activeSection)?.icon || <FiShield />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                    {t('settings.sections.' + activeSection + '.title', availableSections.find(s => s.id === activeSection)?.title || 'Settings')}
                  </h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {t('settings.sections.' + activeSection + '.description', availableSections.find(s => s.id === activeSection)?.description || 'Configure your preferences')}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="w-full relative z-[100]">
              {success && (
                <div className="mb-8 p-6 bg-emerald-500/10 dark:bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 shadow-lg shadow-emerald-500/5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                      <FiCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">{t('settings.changes_saved')}</p>
                      <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest mt-1">{t('settings.changes_saved_desc')}</p>
                    </div>
                  </div>
                  <button onClick={() => setSuccess(false)} className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-8 p-6 bg-rose-500/10 dark:bg-rose-500/5 backdrop-blur-xl border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-between gap-4 animate-shake shadow-lg shadow-rose-500/5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-rose-500/20 rounded-xl">
                      <FiAlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">{t('settings.error_title')}</p>
                      <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest mt-1">{error}</p>
                    </div>
                  </div>
                  <button onClick={() => setError('')} className="p-2 hover:bg-rose-500/10 rounded-lg transition-colors">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Section Content Rendering */}
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              {activeSection === 'personal' && (
                <PersonalSection
                  config={personalConfig}
                  data={{ ...formData, ...profileData }}
                  onChange={handlePersonalChange}
                />
              )}

              {activeSection === 'language' && (
                <LanguageSection
                  config={languageConfig}
                  data={formData}
                  onChange={handlePersonalChange}
                />
              )}

              {activeSection === 'groups' && (
                <GroupsSection
                  user={user}
                  config={groupsConfig}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}

              {activeSection === 'group_address' && (
                <GroupAddressSection
                  user={user}
                  config={groupAddressConfig}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}

              {activeSection === 'payment' && (
                <PaymentSection
                  user={user}
                  config={paymentConfig}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}

              {activeSection === 'access' && (
                <AccessSection
                  user={user}
                  config={accessConfig}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
