'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiMapPin, FiTrash2, FiChevronRight, FiEdit2, FiCheck, FiX, FiLoader } from 'react-icons/fi'
import api from '@/lib/api/client'
import { LoadingOverlay } from '@/components/ui/LoadingSpinner'

const localCountryFallbackData = {
  BJ: {
    fmt: "%N%n%O%n%A%n%C",
    require: "AC",
    state_name_type: "department"
  },
  IN: {
    fmt: "%A%C%S%Z",
    require: "ACSZ",
    zip: "[1-9][0-9]{5}",
    zip_name_type: "pin",
    state_name_type: "state"
  },
  US: {
    fmt: "%A%C%S%Z",
    require: "ACSZ",
    zip: "[0-9]{5}(?:-[0-9]{4})?",
    zip_name_type: "zip",
    state_name_type: "state"
  },
  AT: {
    fmt: "%A%Z%C",
    require: "ACZ",
    zip: "[0-9]{4}",
    zip_name_type: "postal",
    state_name_type: "province"
  },
  GB: {
    fmt: "%A%C%Z",
    require: "ACZ",
    zip: "[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}",
    zip_name_type: "postcode",
    state_name_type: "county"
  }
};
export function getProfessionalGroupName(group) {
  if (!group) return '';
  const isDefault = group.is_default || group.isDefault;
  if (isDefault) {
    if (!group.name || group.name.toLowerCase() === 'default group' || group.name.toLowerCase() === 'personal hub' || group.name.toLowerCase() === 'personal hub (self)') {
      return 'Personal hub (self)';
    }
  }
  return group.name || '';
}

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
  const [isDefaultAddress, setIsDefaultAddress] = useState(false)

  const [formData, setFormData] = useState({
    groupIds: [],
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
        const response = await fetch(`/api/countries/${formData.country}`)
        const json = await response.json()
        if (json.success && json.data) {
          setAddressMetadata(json.data)
        } else {
          const fallback = localCountryFallbackData[formData.country];
          setAddressMetadata(fallback || null)
        }
      } catch (err) {
        console.error("Failed to fetch address metadata:", err)
        const fallback = localCountryFallbackData[formData.country];
        setAddressMetadata(fallback || null)
      } finally {
        setLoadingFormat(false)
      }
    }
    fetchMetadata()
  }, [formData.country])

  const getDynamicFields = useCallback(() => {
    // If no metadata has been loaded yet, return a clean default set of international fields
    if (!addressMetadata) {
      return [
        { id: 'addressLine1', label: 'Address Line 1', required: true },
        { id: 'addressLine2', label: 'Address Line 2 (Optional)', required: false },
        { id: 'city', label: 'City', required: true },
        { id: 'stateProvince', label: 'State/Province (Optional)', required: false },
        { id: 'postalCode', label: 'Postal Code (Optional)', required: false }
      ];
    }

    const fmt = addressMetadata.fmt || '%A%C%S%Z';
    const requireStr = addressMetadata.require || 'ACSZ';
    const fields = [];
    const seen = new Set();

    // Map chromium-i18n symbols to field IDs
    const symbolMap = {
      'A': 'addressLine1',
      'C': 'city',
      'S': 'stateProvince',
      'Z': 'postalCode'
    };

    // Determine clean localized labels based on API type configs
    const getLocalizedLabel = (sym) => {
      if (sym === 'A') return 'Street Address';
      if (sym === 'C') return 'City';
      if (sym === 'S') {
        const type = addressMetadata.state_name_type;
        return type === 'state' ? 'State' :
               type === 'province' ? 'Province' :
               type === 'county' ? 'County' :
               type === 'department' ? 'Department' :
               type === 'prefecture' ? 'Prefecture' : 'State/Province';
      }
      if (sym === 'Z') {
        const type = addressMetadata.zip_name_type;
        return type === 'pin' ? 'Pin Code' :
               type === 'postal' ? 'Postal Code' :
               type === 'zip' ? 'ZIP Code' :
               type === 'postcode' ? 'Postcode' : 'Postal Code';
      }
      return sym;
    };

    const parts = fmt.split('%').filter(Boolean);
    parts.forEach(part => {
      const char = part[0];
      const fieldId = symbolMap[char];

      if (fieldId && !seen.has(fieldId)) {
        fields.push({
          id: fieldId,
          label: getLocalizedLabel(char),
          required: requireStr.includes(char),
          placeholder: `Enter ${getLocalizedLabel(char).toLowerCase()}`
        });
        seen.add(fieldId);
      }
    });

    // Always ensure Address Line 2 exists
    if (!seen.has('addressLine2')) {
      fields.splice(1, 0, {
        id: 'addressLine2',
        label: 'Apartment, Suite, etc. (Optional)',
        required: false,
        placeholder: 'Enter apartment, suite, unit, etc.'
      });
    }

    return fields;
  }, [addressMetadata]);

  const resetForm = () => {
    setFormData({
      groupIds: [],
      country: '',
      dynamicFields: {}
    })
    setAddressMetadata(null)
    setEditingGroupId(null)
    setEditingAddressId(null)
    setIsDefaultAddress(false)
  }

  // Filter groups where user can manage addresses
  const authorizedGroups = groups.filter(g => {
    const userId = user?.id || user?.uid;
    const isOwner = g.ownerId === userId;
    const hasManageRole = (g.userRoles || []).some(r => ['GROUP_ADMIN', 'GROUP_ADDRESS_ADMIN'].includes(r));
    return isOwner || hasManageRole;
  });

  useEffect(() => {
    if (authorizedGroups.length > 0 && (!formData.groupIds || formData.groupIds.length === 0)) {
      const defaultGroup = authorizedGroups.find(g => g.is_default);
      if (defaultGroup) {
        setFormData(prev => ({ ...prev, groupIds: [defaultGroup.id] }));
      } else if (authorizedGroups[0]) {
        setFormData(prev => ({ ...prev, groupIds: [authorizedGroups[0].id] }));
      }
    }
  }, [authorizedGroups, formData.groupIds])

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

    let { groupIds, country, dynamicFields } = formData;
    const errors = [];
    
    if (!groupIds || groupIds.length === 0) {
      const defaultGroup = authorizedGroups.find(g => g.is_default);
      if (defaultGroup) {
        groupIds = [defaultGroup.id];
      } else {
        errors.push('Please select at least one group.');
      }
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

    // Resolve ZIP validations automatically from addressMetadata regex patterns
    let postalRegex = /^[a-zA-Z0-9 -]{3,10}$/;
    let postalLabel = 'Postal Code';

    if (addressMetadata) {
      if (addressMetadata.zip) {
        try {
          postalRegex = new RegExp(`^${addressMetadata.zip}$`, 'i');
        } catch (e) {
          console.error("Invalid regex in addressMetadata:", e);
        }
      }
      const type = addressMetadata.zip_name_type;
      postalLabel = type === 'pin' ? 'Pin Code' :
                    type === 'postal' ? 'Postal Code' :
                    type === 'zip' ? 'ZIP Code' :
                    type === 'postcode' ? 'Postcode' : 'Postal Code';
    }

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
      }
    });

    // Zip/Postal specific validation if field is visible
    const hasPostalCodeField = currentFields.some(f => f.id === 'postalCode');
    const postalValue = dynamicFields.postalCode || '';
    if (hasPostalCodeField && postalValue && !postalRegex.test(postalValue)) {
      errors.push(`Invalid ${postalLabel} format.`);
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
        isDefault: isDefaultAddress,
        action: editingAddressId ? 'update' : 'add',
        addressId: editingAddressId,
        groupIds: groupIds
      };

      const response = await api.put(`/groups/${groupIds[0]}/address`, payload)

      if (response.success) {
        await fetchGroups();
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
        await fetchGroups();
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
    const currentUserId = user?.id || user?.uid;
    const isOwner = g.ownerId === currentUserId;
    const hasManageRole = (g.userRoles || []).some(r => ['GROUP_ADMIN', 'GROUP_ADDRESS_ADMIN'].includes(r));
    const canManageAddress = isOwner || hasManageRole;

    if (g.addresses && Array.isArray(g.addresses)) {
      g.addresses.forEach(addr => {
        if (canManageAddress || addr.is_default) {
          allAddresses.push({ ...addr, group: g });
        }
      });
    } else if (g.address && Object.keys(g.address).length > 0) {
      // Fallback for old data (legacy single address is always treated as default)
      allAddresses.push({ ...g.address, group: g, id: 'legacy' });
    }
  });

  const isFormValid = formData.country && 
                      formData.groupIds && formData.groupIds.length > 0 &&
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
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Assign to Groups</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {authorizedGroups.map(group => {
                  const displayName = getProfessionalGroupName(group);
                  const isSelected = (formData.groupIds || []).includes(group.id);
                  return (
                    <label key={group.id} className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                      isSelected 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newIds = e.target.checked 
                            ? [...(formData.groupIds || []), group.id]
                            : (formData.groupIds || []).filter(id => id !== group.id);
                          setFormData(prev => ({ ...prev, groupIds: newIds }));
                        }}
                        className="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-wider truncate">{displayName}</p>
                      </div>
                    </label>
                  );
                })}
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

          {(formData.groupIds || []).length > 0 && (
            <div className="flex items-center gap-3 py-2 px-1 bg-transparent animate-in fade-in duration-200 select-none">
              <input
                type="checkbox"
                id="isDefaultAddressCheckbox"
                checked={isDefaultAddress}
                onChange={(e) => setIsDefaultAddress(e.target.checked)}
                className="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
              />
              <label htmlFor="isDefaultAddressCheckbox" className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest cursor-pointer">
                Make this as default address for the assigned groups
              </label>
            </div>
          )}

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

                    <div className="flex items-center gap-3 flex-wrap mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/40">
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Group:</span>
                      <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em]">
                        {getProfessionalGroupName(group)}
                      </p>
                      {addr.is_default && (
                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded uppercase tracking-[0.1em] border border-emerald-100 dark:border-emerald-900/30 animate-in fade-in duration-200">
                          Default Address
                        </span>
                      )}
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
                                
                                const { country, countryCode: _, group: __, id, is_default, ...dynamicFields } = addr;
                                
                                const linkedGroupIds = groups
                                  .filter(g => (g.addresses || []).some(a => a.id === addr.id) || (g.address && g.address.id === addr.id))
                                  .map(g => g.id);

                                setFormData({
                                  groupIds: linkedGroupIds,
                                  country: countryCode || '',
                                  dynamicFields: dynamicFields
                                });
                                setEditingGroupId(group.id);
                                setEditingAddressId(id === 'legacy' ? null : id);
                                setIsDefaultAddress(is_default || false);
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
