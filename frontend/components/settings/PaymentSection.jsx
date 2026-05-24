'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiCreditCard, FiTrash2, FiChevronRight, FiEdit2, FiCheck, FiX } from 'react-icons/fi'
import { FaCcVisa, FaCcMastercard, FaCcAmex, FaCcDiscover, FaCcDinersClub, FaCreditCard as FaDefaultCard } from 'react-icons/fa'
import api from '@/lib/api/client'
import { LoadingOverlay } from '@/components/ui/LoadingSpinner'

export default function PaymentSection({ user, config, setError, setSuccess }) {
  const [payments, setPayments] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState(null)
  
  const [editingPaymentId, setEditingPaymentId] = useState(null)
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)
  const [unlinkSelections, setUnlinkSelections] = useState([])
  
  const [formData, setFormData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    provider: 'Stripe',
    fundingType: 'credit card',
    groupIds: []
  })

  useEffect(() => {
    fetchPayments()
    fetchGroups()
  }, [])

  // Groups where user can manage payments (owner/groupadmin excluded)
  const authorizedGroups = groups.filter(g => {
    const isPersonalHub = g.is_default || g.isDefault;
    const hasManageRole = (g.userRoles || []).some(r => ['PAYMENT_ADMIN'].includes(r));
    return isPersonalHub || hasManageRole;
  });

  // Groups where user can view payments
  const viewableGroups = groups.filter(g => {
    const isPersonalHub = g.is_default || g.isDefault;
    const hasRole = (g.userRoles || []).some(r => ['PAYMENT_ADMIN', 'PAYMENT_USER'].includes(r));
    return isPersonalHub || hasRole;
  });
  const viewableGroupIds = new Set(viewableGroups.map(g => g.id));

  // Auto-select first authorized group for payment form
  useEffect(() => {
    if (authorizedGroups.length > 0 && (!formData.groupIds || formData.groupIds.length === 0)) {
      // Prioritize default group if authorized
      const defaultGroup = authorizedGroups.find(g => g.is_default);
      if (defaultGroup) {
        setFormData(prev => ({ ...prev, groupIds: [defaultGroup.id] }));
      } else {
        setFormData(prev => ({ ...prev, groupIds: [authorizedGroups[0].id] }));
      }
    }
  }, [authorizedGroups, formData.groupIds])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/payment-info')
      setPayments(Array.isArray(response) ? response : [])
    } catch (err) {
      console.error("Failed to fetch payments:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups')
      if (response.success) {
        setGroups(response.groups || [])
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err)
    }
  }

  const resetForm = () => {
    setFormData({
      cardholderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      provider: 'Stripe',
      fundingType: 'credit card',
      groupIds: []
    })
    setEditingPaymentId(null)
  }

  const removePayment = async (paymentDetailsId, groupId = null) => {
    setError('')
    try {
      setSavingLabel(groupId ? 'Unlinking card...' : 'Removing card...')
      setSaving(true)
      const url = groupId
        ? `/payment-info/delete?id=${paymentDetailsId}&groupId=${groupId}`
        : `/payment-info/delete?id=${paymentDetailsId}`
      const response = await api.delete(url)
      if (response.success) {
        setConfirmDeleteId(null)
        setConfirmDeleteGroupId(null)
        await fetchPayments()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000)
      }
    } catch (err) {
      console.error("Failed to delete payment:", err)
      setError(err.message || 'Failed to remove card.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitPayment = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const { cardholderName, cardNumber, expiryDate, cvv, provider, fundingType, groupIds } = formData;
    
    if (!editingPaymentId) {
      if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
        setError('Please fill in all the details for your card so we can add it to your account.');
        return;
      }
      if (!groupIds || groupIds.length === 0) {
        setError('Please assign this payment method to at least one group.');
        return;
      }
    } else {
      if (!cardholderName || !expiryDate) {
        setError('Please fill in required details.');
        return;
      }
      if (!groupIds || groupIds.length === 0) {
        setError('Please select at least one group.');
        return;
      }
    }

    try {
      if (editingPaymentId) {
        setSavingLabel('Updating card...')
        setSaving(true)
        const currentPayment = payments.find(p => p.payment_details_id === editingPaymentId);
        const response = await api.put('/payment-info', {
          paymentDetailsId: editingPaymentId,
          currentGroupId: currentPayment.group_id,
          groupIds,
          cardholderName,
          expiryDate,
          provider,
          fundingType
        })
        if (!response.success) {
          throw new Error(response.message || 'Failed to update payment')
        }
        await fetchPayments()
        setShowForm(false)
        resetForm()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setSavingLabel('Adding your card...')
        setSaving(true)
        const response = await api.post('/payment-info', formData)
        if (!response.success) {
          throw new Error(response.message || 'Failed to add payment')
        }
        await fetchPayments()
        setShowForm(false)
        resetForm()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Failed to save payment:", err)
      if (err.details && Array.isArray(err.details)) {
        setError(`We couldn't verify your card: ${err.details.join(' ')}`)
      } else {
        setError("We ran into a problem saving your payment method. Please check your details and try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (id, val) => {
    let finalVal = val;
    if (id === 'cardNumber') finalVal = val.replace(/\D/g, '');
    if (id === 'cvv') finalVal = val.replace(/\D/g, '');
    if (id === 'expiryDate') {
      finalVal = val.replace(/\D/g, '');
      if (finalVal.length > 2) finalVal = finalVal.slice(0, 2) + '/' + finalVal.slice(2, 4);
    }
    setFormData({ ...formData, [id]: finalVal });
  }

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
            <span>Add New Method</span>
          </button>
        </div>
      )}

      {showForm ? (
        <form
          noValidate
          onSubmit={handleSubmitPayment}
          className="p-10 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 space-y-8 animate-in zoom-in-95 duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">
              {editingPaymentId ? 'Edit Payment Method' : config.categories[0].title}
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
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Assign to Groups</label>
                    <div className="relative">
                      <div 
                        onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                        className="w-full h-14 px-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate pr-4 uppercase tracking-widest text-gray-400">
                          {(formData.groupIds && formData.groupIds.length > 0)
                            ? `${formData.groupIds.length} GROUP${formData.groupIds.length > 1 ? 'S' : ''} SELECTED`
                            : 'SELECT GROUPS'}
                        </span>
                        <FiChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isGroupDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                      </div>
                      
                      {isGroupDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsGroupDropdownOpen(false)} />
                          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                            {authorizedGroups.map(group => {
                              const getProfessionalName = (g) => {
                                if (g.is_default && (!g.name || g.name.toLowerCase() === 'default group' || g.name.toLowerCase() === 'personal hub' || g.name.toLowerCase() === 'personal hub (self)')) {
                                  return 'Personal hub (self)';
                                }
                                return g.name;
                              };
                              const displayName = getProfessionalName(group);
                              const isSelected = (formData.groupIds || []).includes(group.id);
                              return (
                                <label key={group.id} className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newIds = e.target.checked 
                                        ? [...(formData.groupIds || []), group.id]
                                        : (formData.groupIds || []).filter(id => id !== group.id);
                                      setFormData(prev => ({ ...prev, groupIds: newIds }));
                                    }}
                                    className="w-5 h-5 rounded border-gray-200 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                  />
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider truncate">
                                    {displayName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              }

              if (field.type === 'select') {
                return (
                  <div key={field.id} className="space-y-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{field.label}</label>
                    <div className="relative">
                      <select
                        value={formData[field.id]}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="w-full h-14 px-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
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
                    required={field.required && !editingPaymentId}
                    maxLength={field.maxLength}
                    value={formData[field.id]}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={editingPaymentId && (field.id === 'cardNumber' || field.id === 'cvv')}
                    className={`w-full h-14 px-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 outline-none ${
                        field.id === 'cardholderName' ? 'uppercase tracking-widest' : 
                        field.id === 'cardNumber' ? 'tracking-[0.2em]' : 
                        field.id === 'cvv' ? 'tracking-[0.5em]' : 'tracking-widest'
                    } ${editingPaymentId && (field.id === 'cardNumber' || field.id === 'cvv') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98]"
          >
            {saving ? (editingPaymentId ? 'UPDATING...' : 'ADDING...') : (editingPaymentId ? 'UPDATE PAYMENT METHOD' : 'ADD PAYMENT METHOD')}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-20 animate-pulse">
              <LoadingOverlay active={true} label="Loading methods..." />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
              <FiCreditCard className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No Payment Methods</p>
            </div>
          ) : (
            // Deduplicate by payment_details_id, collecting all linked group_ids
            Object.values(
              payments.reduce((acc, p) => {
                if (!acc[p.payment_details_id]) {
                  acc[p.payment_details_id] = { ...p, linkedGroupIds: [] };
                }
                if (p.group_id && !acc[p.payment_details_id].linkedGroupIds.includes(p.group_id)) {
                  acc[p.payment_details_id].linkedGroupIds.push(p.group_id);
                }
                return acc;
              }, {})
            )
            // Only show payments linked to groups where user has PAYMENT_ADMIN or PAYMENT_USER
            .filter(p => (p.linkedGroupIds || []).some(gid => viewableGroupIds.has(gid)))
            .map(payment => {
              const linkedGroups = (payment.linkedGroupIds || []).map(gid => groups.find(g => g.id === gid)).filter(Boolean);
              const getProfessionalName = (g) => {
                if (g.is_default && (!g.name || ['default group','personal hub','personal hub (self)'].includes(g.name.toLowerCase()))) return 'Personal hub (self)';
                return g.name;
              };
              const canManage = linkedGroups.some(g => {
                const isPersonalHub = g.is_default || g.isDefault;
                const hasRole = (g.userRoles || []).some(r => ['PAYMENT_ADMIN'].includes(r));
                return isPersonalHub || hasRole;
              });
              const isConfirming = confirmDeleteId === payment.payment_details_id;

              return (
                <div
                  key={payment.payment_details_id}
                  className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all"
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="w-16 h-16 flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner overflow-hidden">
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
                    <div className="min-w-0">
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
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{payment.cardholder_name}</p>
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{payment.expiry_date}</p>
                      </div>
                      {/* Linked Groups */}
                      <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/40">
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Groups:</span>
                        {linkedGroups.length > 0 ? linkedGroups.map(g => (
                          <span key={g.id} className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 px-2 py-0.5 rounded uppercase tracking-[0.1em]">
                            {getProfessionalName(g)}
                          </span>
                        )) : (
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">No groups linked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isConfirming ? (
                        <div className="flex flex-col items-end gap-2 animate-in fade-in duration-200">
                          {linkedGroups.length > 1 ? (
                            <div className="relative group/unlink">
                              <button className="px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md flex items-center gap-2">
                                <span>Unlink Groups...</span>
                                <FiChevronRight className="w-3 h-3 rotate-90" />
                              </button>
                              
                              <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-gray-900 dark:bg-gray-800 border border-gray-800 dark:border-gray-700 rounded-3xl shadow-2xl opacity-0 invisible group-hover/unlink:opacity-100 group-hover/unlink:visible transition-all flex flex-col gap-3 z-50">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Select groups to keep</p>
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                  {linkedGroups.map(g => {
                                    const isChecked = unlinkSelections.includes(g.id);
                                    return (
                                      <label key={g.id} className="flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700 transition-all select-none">
                                        <div className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center border transition-colors ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-gray-600'}`}>
                                          {isChecked && <FiCheck className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest truncate transition-colors ${isChecked ? 'text-white' : 'text-gray-500'}`}>
                                          {getProfessionalName(g)}
                                        </span>
                                        <input
                                          type="checkbox"
                                          className="hidden"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setUnlinkSelections(prev => [...prev, g.id]);
                                            } else {
                                              setUnlinkSelections(prev => prev.filter(id => id !== g.id));
                                            }
                                          }}
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-800 dark:border-gray-700">
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-4 py-3 bg-gray-800 dark:bg-gray-700 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-700 transition-all flex-1"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const groupsToUnlink = linkedGroups.filter(g => !unlinkSelections.includes(g.id)).map(g => g.id);
                                      if (groupsToUnlink.length === 0) {
                                        setConfirmDeleteId(null);
                                        return;
                                      }
                                      if (groupsToUnlink.length === linkedGroups.length) {
                                        removePayment(payment.payment_details_id, null);
                                      } else {
                                        setSaving(true);
                                        setSavingLabel('Unlinking groups...');
                                        try {
                                          for (const gid of groupsToUnlink) {
                                            await api.delete(`/payment-info/delete?id=${payment.payment_details_id}&groupId=${gid}`);
                                          }
                                          setConfirmDeleteId(null);
                                          await fetchPayments();
                                          setSuccess(true);
                                          setTimeout(() => setSuccess(false), 5000);
                                        } catch (err) {
                                          setError('Failed to unlink some groups.');
                                        } finally {
                                          setSaving(false);
                                        }
                                      }
                                    }}
                                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex-1 flex items-center justify-center gap-2"
                                  >
                                    <FiCheck className="w-3 h-3" /> Apply
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removePayment(payment.payment_details_id, linkedGroups[0]?.id || null)}
                                className="px-4 py-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 dark:shadow-none"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setConfirmDeleteId(null); setConfirmDeleteGroupId(null); }}
                                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-[9px] font-black uppercase tracking-widest"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => {
                              setEditingPaymentId(payment.payment_details_id);
                              setFormData({
                                cardholderName: payment.cardholder_name,
                                cardNumber: `•••• •••• •••• ${payment.card_number}`,
                                expiryDate: payment.expiry_date,
                                cvv: '***',
                                provider: payment.provider || 'Stripe',
                                fundingType: payment.funding_type || 'credit card',
                                groupIds: payment.linkedGroupIds || []
                              });
                              setShowForm(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-4 bg-white dark:bg-indigo-900/20 text-indigo-500 rounded-2xl hover:bg-indigo-500 hover:text-white shadow-xl transition-all"
                            title="Edit Card"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDeleteId(payment.payment_details_id);
                              setUnlinkSelections(linkedGroups.map(g => g.id));
                            }}
                            className="p-4 bg-white dark:bg-rose-900/20 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white shadow-xl transition-all"
                            title="Delete Card"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  )
}
