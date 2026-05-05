'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiMapPin, FiTrash2, FiChevronRight, FiEdit2, FiCheck, FiX } from 'react-icons/fi'
import api from '@/lib/api/client'
import { LoadingOverlay } from '@/components/ui/LoadingSpinner'

export default function GroupAddressSection({ user, config, setError, setSuccess }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  
  const [editingGroupId, setEditingGroupId] = useState(null)

  const [formData, setFormData] = useState({
    groupId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: ''
  })

  useEffect(() => {
    fetchGroups()
  }, [])

  // Filter groups where user can manage addresses
  const authorizedGroups = groups.filter(g => {
    const userId = user?.id || user?.uid;
    const isOwner = g.ownerId === userId;
    const hasManageRole = (g.userRoles || []).some(r => ['GROUP_ADMIN', 'GROUP_ADDRESS_ADMIN'].includes(r));
    return isOwner || hasManageRole;
  });

  // Auto-select first authorized group for form
  useEffect(() => {
    if (authorizedGroups.length > 0 && !formData.groupId) {
      // Prioritize default group if authorized
      const defaultGroup = authorizedGroups.find(g => g.is_default);
      if (defaultGroup && !defaultGroup.address) {
        setFormData(prev => ({ ...prev, groupId: defaultGroup.id }));
      } else {
        const withoutAddr = authorizedGroups.find(g => !g.address);
        if (withoutAddr) setFormData(prev => ({ ...prev, groupId: withoutAddr.id }));
      }
    }
  }, [authorizedGroups, formData.groupId])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await api.get('/groups')
      if (response.success) {
        setGroups(response.groups || [])
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      groupId: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateProvince: '',
      postalCode: '',
      country: ''
    })
    setEditingGroupId(null)
  }

  const handleSubmitAddress = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const { groupId, addressLine1, addressLine2, city, stateProvince, postalCode, country } = formData;
    
    if (!groupId || !addressLine1 || !city || !stateProvince || !postalCode || !country) {
      setError('Please fill in all the required address details.');
      return;
    }

    if (addressLine1.length < 5 || addressLine1.length > 100) {
      setError('Address Line 1 must be between 5 and 100 characters.'); return;
    }
    if (city.length < 2 || city.length > 50) {
      setError('City must be between 2 and 50 characters.'); return;
    }
    if (stateProvince.length < 2 || stateProvince.length > 50) {
      setError('State/Province must be between 2 and 50 characters.'); return;
    }
    if (country.length < 2 || country.length > 50) {
      setError('Country must be between 2 and 50 characters.'); return;
    }
    if (!/^[a-zA-Z0-9 -]{3,10}$/.test(postalCode)) {
      setError('Invalid Postal Code format.'); return;
    }

    try {
      setSavingLabel(editingGroupId ? 'Updating address...' : 'Adding address...')
      setSaving(true)
      
      const response = await api.put(`/groups/${groupId}/address`, {
        address: { addressLine1, addressLine2, city, stateProvince, postalCode, country }
      })

      if (response.success) {
        setGroups(groups.map(g => g.id === groupId ? { ...g, address: { addressLine1, addressLine2, city, stateProvince, postalCode, country } } : g))
        setShowForm(false)
        resetForm()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Failed to save address:", err)
      setError("We ran into a problem saving your address. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAddress = async (groupId) => {
    setError('');
    
    try {
      setSavingLabel('Removing address...');
      setSaving(true);
      const response = await api.put(`/groups/${groupId}/address`, {
        address: null
      });

      if (response.success) {
        setGroups(groups.map(g => g.id === groupId ? { ...g, address: null } : g));
        setConfirmDeleteId(null);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      setError('Failed to remove address.');
    } finally {
      setSaving(false);
    }
  }

  const groupsWithAddress = groups.filter(g => g.address && Object.keys(g.address).length > 0);

  const isFormValid = formData.groupId && 
                      formData.addressLine1 && 
                      formData.city && 
                      formData.stateProvince && 
                      formData.postalCode && 
                      formData.country;

  return (
    <div className="relative space-y-12">
      <LoadingOverlay active={saving} label={savingLabel} />

      {/* Header Add Button */}
      {!showForm && authorizedGroups.length > groupsWithAddress.length && (
        <div className="flex justify-end -mt-20 mb-8 relative z-10">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Group Address</span>
          </button>
        </div>
      )}

      {showForm ? (
        <form
          noValidate
          onSubmit={handleSubmitAddress}
          className="p-10 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 space-y-8 animate-in zoom-in-95 duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">
              {editingGroupId ? 'Edit Group Address' : config.categories[0].title}
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError('');
                resetForm();
              }}
              className="text-[10px] font-black text-gray-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
            >
              Cancel Entry
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {config.categories[0].fields.map(field => {
              if (field.id === 'groupId') {
                return (
                  <div key={field.id} className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{field.label}</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.groupId}
                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                        disabled={!!editingGroupId}
                        className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                      >
                        {!formData.groupId && <option value="">{field.placeholder}</option>}
                        {authorizedGroups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name} {group.is_default ? '(SYSTEM DEFAULT)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <FiChevronRight className="rotate-90" />
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={field.id} className="space-y-3">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{field.label}</label>
                  <input
                    type={field.type}
                    required={field.required}
                    value={formData[field.id]}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    placeholder={field.placeholder}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    pattern={field.pattern}
                    className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 outline-none uppercase tracking-widest"
                  />
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            disabled={saving || !isFormValid}
            className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-[0.98] ${
              saving || !isFormValid 
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800/50 dark:text-gray-600 shadow-none cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none'
            }`}
          >
            {saving ? (editingGroupId ? 'UPDATING...' : 'ADDING...') : (editingGroupId ? 'UPDATE ADDRESS' : 'ADD ADDRESS')}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-20 animate-pulse">
              <LoadingOverlay active={true} label="Loading addresses..." />
            </div>
          ) : groupsWithAddress.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
              <FiMapPin className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No Group Addresses Found</p>
            </div>
          ) : (
            groupsWithAddress.map(group => (
              <div
                key={group.id}
                className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner overflow-hidden">
                    <FiMapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                        {group.name} {group.is_default ? '(DEFAULT GROUP)' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-white mt-1 uppercase tracking-tight">
                      {group.address?.addressLine1} {group.address?.addressLine2 && `, ${group.address.addressLine2}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{group.address?.city}</p>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{group.address?.stateProvince} {group.address?.postalCode}</p>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <p className="text-[8px] font-black text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 px-2 py-0.5 rounded uppercase tracking-[0.1em]">
                        {group.address?.country}
                      </p>
                    </div>
                  </div>
                </div>
                {(() => {
                  const isOwner = group.ownerId === user?.id || group.ownerId === user?.uid;
                  const hasManageRole = (group.userRoles || []).some(r => ['GROUP_ADMIN', 'GROUP_ADDRESS_ADMIN'].includes(r));
                  
                  if (isOwner || hasManageRole) {
                    return (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {confirmDeleteId === group.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemoveAddress(group.id)}
                              className="px-4 py-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 dark:shadow-none"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-[9px] font-black uppercase tracking-widest"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingGroupId(group.id);
                                setFormData({
                                  groupId: group.id,
                                  addressLine1: group.address.addressLine1 || '',
                                  addressLine2: group.address.addressLine2 || '',
                                  city: group.address.city || '',
                                  stateProvince: group.address.stateProvince || '',
                                  postalCode: group.address.postalCode || '',
                                  country: group.address.country || ''
                                });
                                setShowForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-4 bg-white dark:bg-indigo-900/20 text-indigo-500 rounded-2xl hover:bg-indigo-500 hover:text-white shadow-xl transition-all"
                              title="Edit Address"
                            >
                              <FiEdit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(group.id)}
                              className="p-4 bg-white dark:bg-rose-900/20 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white shadow-xl transition-all"
                              title="Delete Address"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
