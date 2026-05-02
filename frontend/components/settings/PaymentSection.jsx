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
  
  const [editingPaymentId, setEditingPaymentId] = useState(null)
  const [editPaymentData, setEditPaymentData] = useState({ cardholderName: '', expiryDate: '', provider: '', fundingType: '', groupId: '' })

  const [formData, setFormData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    provider: 'Stripe',
    fundingType: 'credit card',
    groupId: ''
  })

  useEffect(() => {
    fetchPayments()
    fetchGroups()
  }, [])

  // Filter groups where user can manage payments
  const authorizedGroups = groups.filter(g => {
    const userId = user?.id || user?.uid;
    const isOwner = g.ownerId === userId;
    const hasManageRole = (g.userRoles || []).some(r => ['GROUP_ADMIN', 'PAYMENT_ADMIN'].includes(r));
    return isOwner || hasManageRole;
  });

  // Auto-select first authorized group for payment form
  useEffect(() => {
    if (authorizedGroups.length > 0 && !formData.groupId) {
      // Prioritize default group if authorized
      const defaultGroup = authorizedGroups.find(g => g.is_default);
      if (defaultGroup) {
        setFormData(prev => ({ ...prev, groupId: defaultGroup.id }));
      } else {
        setFormData(prev => ({ ...prev, groupId: authorizedGroups[0].id }));
      }
    }
  }, [authorizedGroups, formData.groupId])

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
      groupId: ''
    })
    setEditingPaymentId(null)
  }

  const handleSubmitPayment = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const { cardholderName, cardNumber, expiryDate, cvv, provider, fundingType, groupId } = formData;
    
    if (!editingPaymentId) {
      if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
        setError('Please fill in all the details for your card so we can add it to your account.');
        return;
      }
    } else {
      if (!cardholderName || !expiryDate) {
        setError('Please fill in required details.');
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
          groupId,
          cardholderName,
          expiryDate,
          provider,
          fundingType
        })
        if (response.success) {
          setPayments(payments.map(p => p.payment_details_id === editingPaymentId ? response.payment : p))
          setShowForm(false)
          resetForm()
          setSuccess(true)
          setTimeout(() => setSuccess(false), 5000);
        }
      } else {
        setSavingLabel('Adding your card...')
        setSaving(true)
        const response = await api.post('/payment-info', formData)
        setPayments([...payments, response])
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
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{field.label}</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.groupId}
                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                        className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
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

              if (field.type === 'select') {
                return (
                  <div key={field.id} className="space-y-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{field.label}</label>
                    <div className="relative">
                      <select
                        value={formData[field.id]}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
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
                    className={`w-full h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 outline-none ${
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
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{payment.cardholder_name}</p>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{payment.expiry_date}</p>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <p className="text-[8px] font-black text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 px-2 py-0.5 rounded uppercase tracking-[0.1em]">
                        Group: {groups.find(g => g.id === payment.group_id)?.name || 'Unknown Group'}
                      </p>
                    </div>
                  </div>
                </div>
                {(() => {
                  const group = groups.find(g => g.id === payment.group_id);
                  const isOwner = group?.ownerId === user?.id;
                  const hasManageRole = (group?.userRoles || []).some(r => ['GROUP_ADMIN', 'PAYMENT_ADMIN'].includes(r));
                  
                  if (isOwner || hasManageRole) {
                    return (
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
                              groupId: payment.group_id
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
                          onClick={() => removePayment(payment.payment_details_id)}
                          className="p-4 bg-white dark:bg-rose-900/20 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white shadow-xl transition-all"
                          title="Delete Card"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
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
