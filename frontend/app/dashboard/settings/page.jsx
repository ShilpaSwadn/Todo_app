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
  FiSettings,
  FiGlobe,
  FiCreditCard,
  FiDatabase,
  FiTrash2,
  FiPlus,
  FiChevronRight,
  FiLock,
  FiBell,
  FiActivity,
  FiSearch,
  FiUsers,
  FiEdit2
} from 'react-icons/fi'
import {
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover,
  FaCcDinersClub,
  FaCcStripe,
  FaCcPaypal,
  FaApplePay,
  FaGooglePay,
  FaCreditCard as FaDefaultCard
} from 'react-icons/fa'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import Link from 'next/link'
import DynamicProfileForm from '@/components/DynamicProfileForm'
import { profileConfig } from '@/lib/utils/profileConfig'
import { formatFirebaseError } from '@/lib/utils/error-handler'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')

  // Initial states for change detection
  const [initialFormData, setInitialFormData] = useState({})
  const [initialProfileData, setInitialProfileData] = useState({})

  // States for Personal Information
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

  // Change detection
  const hasChanges = useMemo(() => {
    if (!user) return false;
    const formDataChanged = Object.keys(formData).some(key => formData[key] !== initialFormData[key]);
    if (formDataChanged) return true;
    return JSON.stringify(profileData) !== JSON.stringify(initialProfileData);
  }, [formData, profileData, initialFormData, initialProfileData, user]);

  // Groups State
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [showCreateInline, setShowCreateInline] = useState(false)
  const [selectedInitialMembers, setSelectedInitialMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDesc, setEditGroupDesc] = useState('')

  // States for Payment
  const [payments, setPayments] = useState([])
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    provider: 'Stripe',
    fundingType: 'credit card'
  })

  // Fetch user data & payments
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
        const isAlreadyGrouped = profileConfig.categories.some(cat =>
          Array.isArray(rawProfileData[cat.id])
        );

        if (isAlreadyGrouped) {
          setProfileData(rawProfileData);
          setInitialProfileData(rawProfileData);
        } else {
          profileConfig.categories.forEach(cat => {
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

        // Fetch payments & groups
        fetchPayments()
        fetchGroups()
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

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true)
      const response = await api.get('/groups')
      if (response.success) {
        setGroups(response.groups || [])
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err)
    } finally {
      setGroupsLoading(false)
    }
  }

  const fetchPayments = async () => {
    try {
      setPaymentLoading(true)
      const response = await api.get('/payment-info')
      setPayments(Array.isArray(response) ? response : [])
    } catch (err) {
      console.error("Failed to fetch payments:", err)
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    setError('')

    // Professional check for empty fields (since we use noValidate)
    const { cardholderName, cardNumber, expiryDate, cvv } = paymentFormData;
    if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
      setError('Please complete all fields before registering your payment identity.');
      return;
    }

    try {
      setPaymentLoading(true)
      const response = await api.post('/payment-info', paymentFormData)
      setPayments([...payments, response])
      setShowPaymentForm(false)
      setPaymentFormData({
        cvv: '',
        provider: 'Stripe',
        fundingType: 'credit card'
      })
    } catch (err) {
      console.error("Failed to add payment:", err)
      if (err.details && Array.isArray(err.details)) {
        setError(`Validation Failed: ${err.details.join(' ')}`)
      } else {
        setError(err.message || "Failed to register payment method.")
      }
    } finally {
      setPaymentLoading(false)
    }
  }

  const createGroup = async () => {
    if (groups.length >= 5) {
      setError('System threshold attained: Maximum of 5 identity clusters allowed per account.')
      return
    }

    if (!newGroupName.trim() || selectedInitialMembers.length === 0) {
      setError('A group name and at least one initial member are mandatory.')
      return
    }

    try {
      setSaving(true)
      const response = await api.post('/groups', {
        name: newGroupName,
        description: newGroupDesc,
        memberIds: selectedInitialMembers.map(m => m.id)
      })

      if (response.success) {
        setGroups([response.group, ...groups])
        setNewGroupName('')
        setNewGroupDesc('')
        setSelectedInitialMembers([])
        setShowCreateInline(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Group creation failed:", err)
      setError(err.message || "Failed to establish new identity cluster.")
    } finally {
      setSaving(false)
    }
  }

  const updateGroup = async (groupId) => {
    if (!editGroupName.trim()) {
      setError('Group name is mandatory.')
      return
    }

    try {
      setSaving(true)
      const response = await api.put(`/groups/${groupId}`, {
        name: editGroupName,
        description: editGroupDesc
      })

      if (response.success) {
        setGroups(groups.map(g => g.id === groupId ? { ...g, name: editGroupName, description: editGroupDesc } : g))
        setEditingGroupId(null)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Group update failed:", err)
      setError(err.message || "Failed to update identity cluster.")
    } finally {
      setSaving(false)
    }
  }

  const deleteGroup = async (groupId) => {
    if (!confirm('Are you absolutely certain you wish to decommissioning this identity cluster? This action is irreversible.')) return;

    try {
      setGroupsLoading(true)
      const response = await api.delete(`/groups/${groupId}`)

      if (response.success) {
        setGroups(groups.filter(g => g.id !== groupId))
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Failed to delete group:", err)
      setError(err.message || "Failed to decommissioning cluster.")
    } finally {
      setGroupsLoading(false)
    }
  }

  const handleMemberSearch = async (val) => {
    setMemberSearch(val);
    
    // We remove the length requirement so empty query shows available users
    setIsSearching(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
      if (response.success) {
        setSearchResults(response.users || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
      // If unauthorized, redirect to login
      if (err.status === 401) {
        clearAuthData();
        router.push('/login');
      }
    } finally {
      setIsSearching(false);
    }
  }

  const addMemberToGroup = async (groupId, member) => {
    try {
      setGroupsLoading(true)
      const response = await api.post(`/groups/${groupId}/members`, {
        userId: member.id,
        role: 'member'
      })

      if (response.success) {
        setGroups(groups.map(g => {
          if (g.id === groupId) {
            return { ...g, members: response.members };
          }
          return g;
        }));
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Failed to add member:", err)
      setError(err.message || "Failed to add member to cluster.")
    } finally {
      setGroupsLoading(false)
      setSearchResults([]);
      setMemberSearch('');
    }
  }

  const removeMemberFromGroup = async (groupId, memberId) => {
    try {
      setGroupsLoading(true)
      const response = await api.delete(`/groups/${groupId}/members?userId=${memberId}`)

      if (response.success) {
        setGroups(groups.map(g => {
          if (g.id === groupId) {
            return { ...g, members: response.members };
          }
          return g;
        }));
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Failed to remove member:", err)
      setError(err.message || "Failed to remove member from cluster.")
    } finally {
      setGroupsLoading(false)
    }
  }

  const removePayment = async (id) => {
    try {
      setPaymentLoading(true)
      await api.delete(`/payment-info/delete?id=${id}`)
      setPayments(payments.filter(p => p.payment_details_id !== id))
    } catch (err) {
      console.error("Failed to remove payment:", err)
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePersonalChange = (name, value) => {
    const isCore = ['firstName', 'lastName', 'languagePreference', 'timeZone', 'currency'].includes(name);
    if (isCore) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      const category = profileConfig.categories.find(cat =>
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

      // Update initial states after save
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

  const sections = [
    { id: 'personal', title: 'Personal Information', icon: <FiUser />, description: 'Identity Directory & Profile Content' },
    { id: 'groups', title: 'Group Management', icon: <FiUsers />, description: 'Collaborative Identity Clusters' },
    { id: 'language', title: 'Language & Currency', icon: <FiGlobe />, description: 'Localization & Economic Parameters' },
    { id: 'payment', title: 'Payment Methods', icon: <FiCreditCard />, description: 'Transaction Vault & Billing Identity' },
  ]

  if (loading || !user) {
    return (
      <main className="h-screen bg-white dark:bg-[#020617] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent"></div>
        <p className="mt-6 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.5em] animate-pulse">
          Accessing Neural Settings
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDFDFD] dark:bg-[#020617] flex flex-col">
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
              Account Architecture
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Encrypted Session Active
              </span>
            </div>
          </div>
        </div>

        {activeSection === 'personal' && (
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all transform active:scale-95 shadow-xl ${saving || !hasChanges
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none'
              }`}
          >
            {saving ? 'Syncing...' : (
              <>
                <FiSave className="w-4 h-4" />
                <span>Save the changes</span>
              </>
            )}
          </button>
        )}
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-6 sm:p-12 gap-10">
        {/* Settings Navigation */}
        <aside className="lg:w-[380px] shrink-0 space-y-8">
          <div className="p-8 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-[3rem] shadow-sm">
            <h4 className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em] mb-8 px-2">
              Configuration Menu
            </h4>
            <div className="space-y-3">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
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
                    <div>
                      <p className={`text-[11px] font-black uppercase tracking-widest ${activeSection === section.id ? 'text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                        {section.title}
                      </p>
                      <p className={`text-[9px] font-bold mt-1 uppercase ${activeSection === section.id ? 'text-white/60' : 'text-gray-400 dark:text-gray-600'
                        }`}>
                        {section.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Analytics Card */}
          <div className="p-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3.5rem] text-white shadow-2xl overflow-hidden relative">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <FiActivity className="w-10 h-10 mb-6 opacity-40" />
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">System Health</h5>
            <p className="text-2xl font-black mt-2 tracking-tighter uppercase leading-none">Security Peak</p>
            <div className="mt-8 flex items-center gap-3">
              <div className="px-4 py-2 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">TLS 1.3</div>
              <div className="px-4 py-2 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">AES-256</div>
            </div>
          </div>
        </aside>

        {/* Main Section Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-[4rem] p-8 sm:p-14 shadow-sm min-h-[600px]">
            {activeSection === 'personal' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-sm">
                    <FiUser className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Identity Directory</h2>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Core Personal Parameters</p>
                  </div>
                </div>

                <div className="w-full">
                  {success && (
                    <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 text-emerald-600 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
                      <FiCheck className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Settings Synchronized Successfully</span>
                    </div>
                  )}

                  {error && (
                    <div className="mb-8 p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 text-rose-600 rounded-[2rem] flex items-center gap-4 animate-shake">
                      <FiAlertCircle className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                    </div>
                  )}
                </div>
                <DynamicProfileForm
                  categories={profileConfig.categories}
                  data={{ ...formData, ...profileData }}
                  onChange={handlePersonalChange}
                />
              </div>
            )}

            {activeSection === 'groups' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-sm"><FiUsers className="w-8 h-8" /></div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Group Management</h2>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Identity Clusters & Collaborative Access</p>
                    </div>
                  </div>
                  {!showCreateInline && (
                    <button 
                      onClick={() => setShowCreateInline(true)} 
                      disabled={groups.length >= 5}
                      className={`p-4 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-2 ${groups.length >= 5 ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none'}`}
                    >
                      <FiPlus className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest px-2">
                        {groups.length >= 5 ? 'Threshold Attained' : 'New Cluster'}
                      </span>
                    </button>
                  )}
                </div>

                {showCreateInline && (
                  <div className="bg-gray-50/50 dark:bg-gray-800/30 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 space-y-8 animate-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Initialize New Cluster</h3>
                      <button onClick={() => {
                        setShowCreateInline(false);
                        setSelectedInitialMembers([]);
                        setMemberSearch('');
                      }} className="text-gray-400 hover:text-rose-500 transition-colors">
                        <HiX className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Group Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. FAMILY HUB"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full px-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white text-xs font-bold uppercase"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">System Description</label>
                        <input
                          type="text"
                          placeholder="Purpose of this group..."
                          value={newGroupDesc}
                          onChange={(e) => setNewGroupDesc(e.target.value)}
                          className="w-full px-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Add Initial Membership (Mandatory)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          {isSearching ? <ImSpinner2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <FiSearch className="w-4 h-4 text-gray-400" />}
                        </div>
                        <input
                          type="text"
                          placeholder="Search colleagues to add..."
                          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white text-sm"
                          value={memberSearch}
                          onChange={(e) => handleMemberSearch(e.target.value)}
                          onFocus={() => handleMemberSearch(memberSearch)}
                          onBlur={() => setTimeout(() => setSearchResults([]), 200)}
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                            {searchResults.map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent input onBlur from firing before this
                                  if (!selectedInitialMembers.find(m => m.id === result.id)) {
                                    setSelectedInitialMembers([...selectedInitialMembers, result]);
                                  }
                                  setSearchResults([]);
                                  setMemberSearch('');
                                }}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors"
                              >
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{result.name}</p>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{result.email}</p>
                                </div>
                                <FiPlus className="w-4 h-4 text-indigo-600" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Selected Area */}
                      {selectedInitialMembers.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-4">
                          {selectedInitialMembers.map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 rounded-full">
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">{m.name}</span>
                              <button onClick={() => setSelectedInitialMembers(selectedInitialMembers.filter(sm => sm.id !== m.id))} className="text-indigo-600 hover:text-rose-500">
                                <HiX className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={createGroup}
                      disabled={saving || !newGroupName || selectedInitialMembers.length === 0}
                      className="w-full py-5 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400"
                    >
                      {saving ? 'Synchronizing Cluster...' : 'Establish Identity Cluster'}
                    </button>
                  </div>
                )}

                <div className="space-y-8">
                  {groupsLoading ? (
                    <div className="flex flex-col items-center py-20 animate-pulse">
                      <ImSpinner2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Retrieving Neural Clusters</p>
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
                      <FiUsers className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic opacity-40">No identity clusters defined in your ecosystem</p>
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.id} className="p-8 bg-white dark:bg-gray-900/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-6">
                            {editingGroupId === group.id ? (
                              <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                <input
                                  type="text"
                                  value={editGroupName}
                                  onChange={(e) => setEditGroupName(e.target.value)}
                                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900 rounded-xl text-sm font-black uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                  placeholder="Group Name"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  value={editGroupDesc}
                                  onChange={(e) => setEditGroupDesc(e.target.value)}
                                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:text-white"
                                  placeholder="System Descriptor"
                                />
                              </div>
                            ) : (
                              <>
                                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">{group.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 italic tracking-widest opacity-60">{group.description || ''}</p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="hidden sm:inline-block text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full uppercase tracking-widest leading-none">{group.members.length} Identifiers</span>
                            
                            {group.ownerId === user?.id ? (
                              editingGroupId === group.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateGroup(group.id)}
                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none animate-pulse"
                                    title="Commit Changes"
                                  >
                                    <FiCheck className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingGroupId(null)}
                                    className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                    title="Cancel Operation"
                                  >
                                    <HiX className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingGroupId(group.id);
                                      setEditGroupName(group.name);
                                      setEditGroupDesc(group.description || '');
                                    }}
                                    className="p-3 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all transform active:scale-95"
                                    title="Modify Cluster Metadata"
                                  >
                                    <FiEdit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteGroup(group.id)}
                                    className="p-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all transform active:scale-95"
                                    title="Decommission Cluster"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )
                            ) : (
                              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Member Access Only</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {group.ownerId === user?.id && (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">{isSearching ? <ImSpinner2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <FiSearch className="w-4 h-4 text-gray-400" />}</div>
                            <input 
                              type="text" 
                              placeholder="Search database identities by Email or Name..." 
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white text-sm" 
                              value={memberSearch} 
                              onChange={(e) => handleMemberSearch(e.target.value)}
                              onFocus={() => handleMemberSearch(memberSearch)}
                              onBlur={() => setTimeout(() => setSearchResults([]), 200)}
                            />
                            {searchResults.length > 0 && (
                              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                                {searchResults.map((result) => (
                                  <button 
                                    key={result.id} 
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      addMemberToGroup(group.id, result);
                                    }} 
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors"
                                  >
                                    <div><p className="text-sm font-bold text-gray-900 dark:text-white">{result.name}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">{result.email}</p></div><FiPlus className="w-4 h-4 text-indigo-600" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-2xl">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
                                <th className="px-6 py-4 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {group.members.length === 0 ? (
                                <tr><td colSpan="3" className="px-6 py-12 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No members assigned to this cluster</td></tr>
                              ) : (
                                group.members.map((member) => (
                                  <tr key={member.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-black text-indigo-600">
                                          {member.name[0]}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</p>
                                            {member.id === group.ownerId && (
                                              <span className="text-[7px] font-black text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Creator</span>
                                            )}
                                          </div>
                                          <p className="text-[9px] text-gray-400 font-medium">{member.email}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      {group.ownerId === user?.id && (
                                        <button onClick={() => removeMemberFromGroup(group.id, member.id)} className="p-2 text-gray-400 hover:text-rose-600 transition-colors">
                                          <FiTrash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeSection === 'language' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-sm">
                    <FiGlobe className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Localization</h2>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Regional & Economic Engine</p>
                  </div>
                </div>

                {success && (
                  <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 text-emerald-600 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
                    <FiCheck className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Settings Synchronized Successfully</span>
                  </div>
                )}

                {error && (
                  <div className="mb-8 p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 text-rose-600 rounded-[2rem] flex items-center gap-4 animate-shake">
                    <FiAlertCircle className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Primary Language</label>
                    <select
                      value={formData.languagePreference}
                      onChange={(e) => handlePersonalChange('languagePreference', e.target.value)}
                      className="w-full h-16 px-8 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {['English', 'Spanish', 'French', 'German', 'Hindi', 'Tamil', 'Japanese', 'Mandarin'].map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Local Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handlePersonalChange('currency', e.target.value)}
                      className="w-full h-16 px-8 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'AED'].map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'payment' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-[1.5rem] flex items-center justify-center text-purple-600 shadow-sm">
                      <FiCreditCard className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Transaction Vault</h2>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Payment Method Registry</p>
                    </div>
                  </div>

                  {!showPaymentForm && (
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="flex items-center gap-3 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Add New Method</span>
                    </button>
                  )}
                </div>

                <div className="w-full">
                  {success && (
                    <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 text-emerald-600 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
                      <FiCheck className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Settings Synchronized Successfully</span>
                    </div>
                  )}

                  {error && (
                    <div className="mb-8 p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 text-rose-600 rounded-[2rem] flex items-center gap-4 animate-shake">
                      <FiAlertCircle className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                    </div>
                  )}
                </div>

                {showPaymentForm ? (
                  <form
                    noValidate
                    onSubmit={handleAddPayment}
                    className="p-10 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 space-y-8 animate-in zoom-in-95 duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">New Payment Identity</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentForm(false);
                          setError('');
                        }}
                        className="text-[10px] font-black text-gray-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                      >
                        Cancel Entry
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Cardholder Name</label>
                        <input
                          type="text"
                          required
                          value={paymentFormData.cardholderName}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, cardholderName: e.target.value })}
                          placeholder="AS APPEARS ON CARD"
                          className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Card Number</label>
                        <input
                          type="text"
                          required
                          value={paymentFormData.cardNumber}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, cardNumber: e.target.value.replace(/\D/g, '') })}
                          placeholder="0000 0000 0000 0000"
                          className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold tracking-[0.2em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Expiry Date</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={paymentFormData.expiryDate}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '')
                            if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4)
                            setPaymentFormData({ ...paymentFormData, expiryDate: val })
                          }}
                          placeholder="MM/YY"
                          className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">CVV</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={paymentFormData.cvv}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, cvv: e.target.value.replace(/\D/g, '') })}
                          placeholder="•••"
                          className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold tracking-[0.5em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Payment Gateway / Provider</label>
                        <div className="relative">
                          <select
                            value={paymentFormData.provider}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, provider: e.target.value })}
                            className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="Stripe">Stripe (Default)</option>
                            <option value="PayPal">PayPal Holdings</option>
                            <option value="Apple Pay">Apple Pay</option>
                            <option value="Google Pay">Google Pay</option>
                            <option value="Square">Square Financial</option>
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <FiChevronRight className="rotate-90" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Funding Source / Type</label>
                        <div className="relative">
                          <select
                            value={paymentFormData.fundingType}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, fundingType: e.target.value })}
                            className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="debit">Debit Card</option>
                            <option value="credit card">Credit Card</option>
                            <option value="amex card">Amex Card</option>
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <FiChevronRight className="rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={paymentLoading}
                      className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98]"
                    >
                      {paymentLoading ? 'PROVISIONING...' : 'REGISTER PAYMENT IDENTITY'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {payments.length === 0 ? (
                      <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
                        <FiCreditCard className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No Payment Methods Registered</p>
                      </div>
                    ) : (
                      payments.map(payment => (
                        <div
                          key={payment.payment_details_id}
                          className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner overflow-hidden">
                              {(() => {
                                const brand = (payment.card_brand || '').toLowerCase();
                                if (brand.includes('visa')) return <FaCcVisa className="w-10 h-10" />;
                                if (brand.includes('mastercard')) return <FaCcMastercard className="w-10 h-10" />;
                                if (brand.includes('american express') || brand.includes('amex')) return <FaCcAmex className="w-10 h-10" />;
                                if (brand.includes('discover')) return <FaCcDiscover className="w-10 h-10" />;
                                if (brand.includes('diners')) return <FaCcDinersClub className="w-10 h-10" />;
                                return <FaDefaultCard className="w-8 h-8 opacity-40" />;
                              })()}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                                  {payment.provider || 'Verified Gateway'}
                                </p>
                                <span className="text-[8px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full font-black text-gray-400 uppercase tracking-widest">
                                  {payment.funding_type || 'Standard'}
                                </span>
                              </div>
                              <p className="text-sm font-black text-gray-900 dark:text-white mt-1 uppercase tracking-tight">
                                •••• •••• •••• {payment.card_number}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{payment.cardholder_name}</p>
                                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{payment.expiry_date}</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removePayment(payment.payment_details_id)}
                            className="p-4 bg-white dark:bg-rose-900/20 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white shadow-xl"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
