'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiMapPin, FiTrash2, FiChevronRight, FiEdit2, FiCheck, FiX, FiLoader } from 'react-icons/fi'
import api from '@/lib/api/client'
import { LoadingOverlay } from '@/components/ui/LoadingSpinner'

export default function GroupAddressSection({ user, config, setError, setSuccess }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [countries, setCountries] = useState([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [addressMetadata, setAddressMetadata] = useState(null)
  const [loadingFormat, setLoadingFormat] = useState(false)
  
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [editingAddressId, setEditingAddressId] = useState(null)

  const [formData, setFormData] = useState({
    groupId: '',
    country: '',
    dynamicFields: {} 
  })

  useEffect(() => {
    fetchGroups()
    fetchCountries()
  }, [])

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true)
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
      const data = await response.json()
      const sorted = data
        .map(c => ({ name: c.name.common, code: c.cca2 }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setCountries(sorted)
    } catch (err) {
      console.error("Failed to fetch countries:", err)
    } finally {
      setLoadingCountries(false)
    }
  }

  // Fetch address format metadata when country changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!formData.country || formData.country === 'OTHER') {
        setAddressMetadata(null)
        return
      }
      try {
        setLoadingFormat(true)
        const response = await fetch(`https://chromium-i18n.appspot.com/ssl-address/data/${formData.country}`)
        const data = await response.json()
        setAddressMetadata(data)
      } catch (err) {
        console.error("Failed to fetch address metadata:", err)
        setAddressMetadata(null)
      } finally {
        setLoadingFormat(false)
      }
    }
    fetchMetadata()
  }, [formData.country])

  const getLabel = (key, metadata) => {
    const labels = {
      'A': 'Address Line 1',
      'C': 'City',
      'S': metadata?.state_name_type === 'state' ? 'State' : 
           metadata?.state_name_type === 'province' ? 'Province' : 'State/Province',
      'Z': metadata?.zip_name_type === 'pin' ? 'PIN Code' :
           metadata?.zip_name_type === 'postal' ? 'Postal Code' : 'ZIP Code',
      'X': 'Address Line 2'
    };
    return labels[key] || key;
  };

  const getDynamicFields = useCallback(() => {
    if (!addressMetadata) return [
      { id: 'addressLine1', label: 'Address Line 1', required: true },
      { id: 'addressLine2', label: 'Address Line 2', required: false },
      { id: 'city', label: 'City', required: true },
      { id: 'stateProvince', label: 'State/Province', required: true },
      { id: 'postalCode', label: 'Postal Code', required: true }
    ];

    const fmt = addressMetadata.fmt || '%A%C%S%Z';
    const fields = [];
    const seen = new Set();
    const requiredStr = addressMetadata.require || 'ACSZ';

    // %A = Address, %C = City, %S = State, %Z = Zip
    const parts = fmt.split('%').filter(Boolean);
    parts.forEach(part => {
      const char = part[0];
      let fieldId = '';
      if (char === 'A') fieldId = 'addressLine1';
      else if (char === 'C') fieldId = 'city';
      else if (char === 'S') fieldId = 'stateProvince';
      else if (char === 'Z') fieldId = 'postalCode';

      if (fieldId && !seen.has(fieldId)) {
        let maxLength = addressMetadata.max_length || null;
        if (char === 'Z') {
          if (formData.country === 'IN') maxLength = 6;
          else if (formData.country === 'DE') maxLength = 5;
          else if (formData.country === 'US') maxLength = 10;
        }

        fields.push({
          id: fieldId,
          label: getLabel(char, addressMetadata),
          required: requiredStr.includes(char),
          placeholder: `Enter ${getLabel(char, addressMetadata).toLowerCase()}`,
          maxLength: maxLength
        });
        seen.add(fieldId);
      }
    });

    // Always ensure Address Line 2 exists if not in format
    if (!seen.has('addressLine2')) {
      fields.splice(1, 0, {
        id: 'addressLine2',
        label: 'Address Line 2',
        required: false,
        placeholder: 'Enter apartment, suite, etc.'
      });
    }

    return fields;
  }, [addressMetadata, formData.country]);

  const resetForm = () => {
    setFormData({
      groupId: '',
      country: '',
      dynamicFields: {}
    })
    setAddressMetadata(null)
    setEditingGroupId(null)
    setEditingAddressId(null)
  }

  // Filter groups where user can manage addresses
  const authorizedGroups = groups.filter(g => {
    const userId = user?.id || user?.uid;
    const isOwner = g.ownerId === userId;
    const hasManageRole = (g.userRoles || []).some(r => ['GROUP_ADMIN', 'GROUP_ADDRESS_ADMIN'].includes(r));
    return isOwner || hasManageRole;
  });

  useEffect(() => {
    if (authorizedGroups.length > 0 && !formData.groupId) {
      const defaultGroup = authorizedGroups.find(g => g.is_default);
      const defaultAddressCount = defaultGroup ? (defaultGroup.addresses ? defaultGroup.addresses.length : (defaultGroup.address && Object.keys(defaultGroup.address).length > 0 ? 1 : 0)) : 0;
      
      if (defaultGroup && defaultAddressCount === 0) {
        setFormData(prev => ({ ...prev, groupId: defaultGroup.id }));
      } else {
        const availableGroup = authorizedGroups.find(g => {
          if (g.is_default) return false;
          return true;
        });
        if (availableGroup) {
          setFormData(prev => ({ ...prev, groupId: availableGroup.id }));
        } else if (authorizedGroups[0]) {
          // Fallback, though the default group might be disabled in the dropdown
          setFormData(prev => ({ ...prev, groupId: authorizedGroups[0].id }));
        }
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

  const handleSubmitAddress = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const { groupId, country, dynamicFields } = formData;
    const errors = [];
    
    if (!groupId) {
      errors.push('Please select a group.');
    }

    if (!country) {
      errors.push('Please select a country.');
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }

    const currentFields = getDynamicFields();
    const requiredFields = currentFields.filter(f => f.required);

    // Validation Rules mapping
    const validationRules = {
      IN: { zip: /^[1-9][0-9]{5}$/, zipMsg: 'PIN Code must be exactly 6 digits.' },
      DE: { zip: /^[0-9]{5}$/, zipMsg: 'Postal Code must be exactly 5 digits.' },
      US: { zip: /^[0-9]{5}(?:-[0-9]{4})?$/, zipMsg: 'ZIP Code must be 5 digits (or 5+4 format).' }
    };

    const rules = validationRules[country] || { 
      zip: addressMetadata?.zip ? new RegExp(`^${addressMetadata.zip}$`) : /^[a-zA-Z0-9 -]{3,10}$/,
      zipMsg: `Invalid ${getLabel('Z', addressMetadata)} format.`
    };

    requiredFields.forEach(field => {
      const value = dynamicFields[field.id]?.trim() || '';
      if (!value) {
        errors.push(`${field.label} is required.`);
      } else {
        // Character validation for City and State
        if (field.id === 'city' || field.id === 'stateProvince') {
          if (!/^[a-zA-Z\s.\-']+$/.test(value)) {
            errors.push(`${field.label} contains invalid characters.`);
          }
        }
        
        // Address lines
        if (field.id === 'addressLine1' || field.id === 'addressLine2') {
          if (value && !/^[a-zA-Z0-9\s.,\-\/#':()]+$/.test(value)) {
            errors.push(`${field.label} contains invalid characters.`);
          }
        }
      }
    });

    // Zip/Postal specific validation
    const postalValue = dynamicFields.postalCode || '';
    if (postalValue && !rules.zip.test(postalValue)) {
      errors.push(rules.zipMsg);
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }

    try {
      setSavingLabel(editingGroupId ? 'Updating address...' : 'Adding address...')
      setSaving(true)
      
      const countryName = countries.find(c => c.code === country)?.name || country;

      const payload = {
        address: { 
          ...dynamicFields,
          country: countryName,
          countryCode: country
        },
        action: editingAddressId ? 'update' : 'add',
        addressId: editingAddressId
      };

      const response = await api.put(`/groups/${groupId}/address`, payload)

      if (response.success) {
        if (response.group) {
          setGroups(groups.map(g => g.id === groupId ? { ...g, ...response.group } : g));
        } else {
          fetchGroups();
        }
        setShowForm(false)
        resetForm()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Failed to save address:", err)
      setError(err.message || "We ran into a problem saving your address. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAddress = async (groupId, addressId) => {
    setError('');
    
    try {
      setSavingLabel('Removing address...');
      setSaving(true);
      const response = await api.put(`/groups/${groupId}/address`, {
        action: 'delete',
        addressId
      });

      if (response.success) {
        if (response.group) {
          setGroups(groups.map(g => g.id === groupId ? { ...g, ...response.group } : g));
        } else {
          fetchGroups();
        }
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

  // Flatten all addresses from all groups for display
  const allAddresses = [];
  groups.forEach(g => {
    if (g.addresses && Array.isArray(g.addresses)) {
      g.addresses.forEach(addr => allAddresses.push({ ...addr, group: g }));
    } else if (g.address && Object.keys(g.address).length > 0) {
      // Fallback for old data
      allAddresses.push({ ...g.address, group: g, id: 'legacy' });
    }
  });

  const isFormValid = formData.groupId && 
                      formData.country && 
                      getDynamicFields().every(f => !f.required || (formData.dynamicFields[f.id] && formData.dynamicFields[f.id].trim() !== ''));

  return (
    <div className="relative space-y-12">
      <LoadingOverlay active={saving} label={savingLabel} />

      {/* Header Add Button */}
      {!showForm && authorizedGroups.length > 0 && (
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
              {editingGroupId ? 'Edit Group Address' : 'Address Information'}
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
            {/* Group Selection */}
            <div className="space-y-3 md:col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Select Group</label>
              <div className="relative">
                <select
                  required
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  disabled={!!editingGroupId}
                  className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  {!formData.groupId && <option value="">Choose a group</option>}
                  {authorizedGroups.map(group => {
                    const isDefault = group.is_default;
                    const addressCount = group.addresses ? group.addresses.length : (group.address && Object.keys(group.address).length > 0 ? 1 : 0);
                    const isDisabled = !editingAddressId && isDefault && addressCount >= 1;
                    
                    return (
                      <option key={group.id} value={group.id} disabled={isDisabled}>
                        {group.name} {isDefault ? '(SYSTEM DEFAULT)' : ''} {isDisabled ? '(Address already set)' : ''}
                      </option>
                    )
                  })}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <FiChevronRight className="rotate-90" />
                </div>
              </div>
            </div>

            {/* Country Selection */}
            <div className="space-y-3 md:col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Country</label>
              <div className="relative">
                <select
                  required
                  value={formData.country}
                  onChange={(e) => {
                    const countryCode = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      country: countryCode,
                      dynamicFields: {} 
                    }));
                  }}
                  disabled={loadingCountries}
                  className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{loadingCountries ? 'Loading countries...' : 'Select a country'}</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                  <option value="OTHER">Other</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <FiChevronRight className="rotate-90" />
                </div>
              </div>
            </div>

            {/* Dynamic Fields Loading State */}
            {loadingFormat && (
              <div className="md:col-span-2 py-10 flex flex-col items-center justify-center space-y-4">
                <FiLoader className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading address format...</p>
              </div>
            )}

            {/* Dynamic Address Fields */}
            {formData.country && !loadingFormat && getDynamicFields().map(field => (
              <div key={field.id} className={`space-y-3 ${field.id === 'addressLine1' || field.id === 'addressLine2' ? 'md:col-span-2' : ''}`}>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                  {field.label} {field.required && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type || 'text'}
                  required={field.required}
                  value={formData.dynamicFields[field.id] || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dynamicFields: { 
                      ...formData.dynamicFields, 
                      [field.id]: e.target.value 
                    } 
                  })}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 outline-none uppercase tracking-widest placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
            ))}
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
          ) : allAddresses.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
              <FiMapPin className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No Group Addresses Found</p>
            </div>
          ) : (
            allAddresses.map((addr, index) => {
              const group = addr.group;
              const addressId = addr.id || index;
              return (
              <div
                key={`${group.id}-${addressId}`}
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
                      {addr.addressLine1} {addr.addressLine2 && `, ${addr.addressLine2}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{addr.city}</p>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{addr.stateProvince} {addr.postalCode}</p>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <p className="text-[8px] font-black text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 px-2 py-0.5 rounded uppercase tracking-[0.1em]">
                        {addr.country}
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
                        {confirmDeleteId === addressId ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemoveAddress(group.id, addr.id)}
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
                                let countryCode = addr.countryCode;
                                if (!countryCode && addr.country) {
                                  const found = countries.find(c => c.name === addr.country);
                                  countryCode = found ? found.code : 'OTHER';
                                }
                                
                                const { country, countryCode: _, group: __, id, ...dynamicFields } = addr;
                                
                                setFormData({
                                  groupId: group.id,
                                  country: countryCode || '',
                                  dynamicFields: dynamicFields
                                });
                                setEditingGroupId(group.id);
                                setEditingAddressId(id === 'legacy' ? null : id);
                                setShowForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-4 bg-white dark:bg-indigo-900/20 text-indigo-500 rounded-2xl hover:bg-indigo-500 hover:text-white shadow-xl transition-all"
                              title="Edit Address"
                            >
                              <FiEdit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(addressId)}
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
            )})
          )}
        </div>
      )}
    </div>
  )
}
