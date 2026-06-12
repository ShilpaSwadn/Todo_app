'use client'

import { useState, useEffect } from 'react'
import { FiShield, FiSave, FiCheck, FiUsers, FiActivity, FiSearch, FiMoreVertical, FiUser, FiInfo, FiChevronDown, FiTrash2 } from 'react-icons/fi'
import api from '@/lib/api/client'

export default function AccessSection({ user, config, setError, setSuccess }) {
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [members, setMembers] = useState([])
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [selectedBulkRole, setSelectedBulkRole] = useState([]) // Changed to array
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingRoles, setPendingRoles] = useState({}) // { userId: roles[] }
  const [searchTerm, setSearchTerm] = useState('')

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups')
      if (response.success) {
        setGroups(response.groups || [])
      }
    } catch (err) {
      console.error('Error fetching groups:', err)
    }
  }

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups()
  }, [selectedGroupId])

  // Fetch members when group changes
  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([])
      setSelectedUserIds([])
      return
    }

    const fetchMembers = async () => {
      setLoading(true)
      try {
        const response = await api.get(`/user-roles?groupId=${selectedGroupId}`)
        if (response.success) {
          setMembers(response.roles || [])
        }
      } catch (err) {
        console.error('Error fetching members:', err)
        setError('Failed to load group members')
      } finally {
        setLoading(false)
      }
    }
    fetchMembers()
  }, [selectedGroupId, setError])

  const toggleUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    )
  }

  const toggleAll = () => {
    if (selectedUserIds.length === filteredMembers.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredMembers.map(m => m.user_id))
    }
  }

  const handleBulkUpdate = async () => {
    if (!selectedBulkRole || selectedUserIds.length === 0) return

    setSaving(true)
    setError('')
    try {
      const response = await api.post('/user-roles', {
        groupId: selectedGroupId,
        userIds: selectedUserIds,
        role: selectedBulkRole
      })

      if (response.success) {
        setSuccess(true)
        const savedRoles = response.updatedRoles || selectedBulkRole;
        setMembers(prev => prev.map(m => 
          selectedUserIds.includes(m.user_id) ? { ...m, user_roles: savedRoles } : m
        ))
        setSelectedUserIds([])
        setSelectedBulkRole([])
        fetchGroups()
      } else {
        setError(response.message || 'Update failed')
      }
    } catch (err) {
      setError('Failed to update roles')
    } finally {
      setSaving(false)
    }
  }

  const handleIndividualUpdate = async (userId, role) => {
    setSaving(true)
    setError('')
    try {
      const response = await api.post('/user-roles', {
        groupId: selectedGroupId,
        userIds: [userId],
        roles: role // This is now an array
      })

      if (response.success) {
        setSuccess(true)
        const savedRoles = response.updatedRoles || role;
        setMembers(prev => prev.map(m => 
          m.user_id === userId ? { ...m, user_roles: savedRoles } : m
        ))
        setPendingRoles(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        fetchGroups()
      } else {
        setError(response.message || 'Update failed')
      }
    } catch (err) {
      setError('Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group? All their assigned roles will also be removed.')) return;
    
    try {
      setSaving(true)
      const response = await api.delete(`/groups/${selectedGroupId}/members?userId=${userId}`)
      if (response.success) {
        setSuccess(true)
        setMembers(prev => prev.filter(m => m.user_id !== userId))
        fetchGroups()
      } else {
        setError(response.message || 'Failed to remove member')
      }
    } catch (err) {
      setError(err.message || 'Failed to remove member')
    } finally {
      setSaving(false)
    }
  }

  const filteredMembers = members.filter(m => 
    m.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedGroup = groups.find(g => g.id === selectedGroupId)
  const userId = user?.id || user?.uid
  const isOwner = selectedGroup?.ownerId === userId
  const currentUserMember = members.find(m => m.user_id === userId)
  const isAdmin = currentUserMember?.user_roles?.includes('GROUP_ADMIN')
  const isAuthorized = isOwner || isAdmin

  const adminGroups = groups.filter(g => {
    if (g.is_default) return false;
    const currentUserId = user?.id || user?.uid;
    const isOwnerOfGroup = g.ownerId === currentUserId;
    const isGroupAdminOfGroup = (g.userRoles || []).includes('GROUP_ADMIN');
    return isOwnerOfGroup || isGroupAdminOfGroup;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'GROUP_ADMIN': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'PAYMENT_ADMIN': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'PAYMENT_USER': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'GROUP_ADDRESS_ADMIN': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'GROUP_ADDRESS_USER': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Controls: Group Selector & Search */}
      {adminGroups.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="w-full lg:w-[400px]">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] ml-2 mb-3 block">
              Managing Group
            </label>
            <div className="relative group">
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 rounded-[1.5rem] p-5 text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white appearance-none cursor-pointer outline-none transition-all shadow-sm"
              >
                <option value="">Select a group...</option>
                {adminGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <FiUsers className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 pointer-events-none transition-colors" />
            </div>
          </div>

          {selectedGroupId && (
            <div className="w-full lg:w-[400px] animate-in fade-in slide-in-from-right-4 duration-500">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] ml-2 mb-3 block">
                Search Members
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="NAME, EMAIL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 rounded-[1.5rem] p-5 pl-14 text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white outline-none transition-all shadow-sm"
                />
                <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      )}

      {adminGroups.length === 0 && !selectedGroupId ? (
        <div className="bg-white dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-[2rem] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 mb-8">
            <FiShield className="w-10 h-10" />
          </div>
          <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-3">No groups to manage</h3>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest max-w-[400px] leading-relaxed">
            You don't have access to any groups yet. Only group owners and group admins can manage access roles. Contact your group owner to get admin access.
          </p>
        </div>
      ) : !selectedGroupId ? (
        <div className="bg-white dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-[2rem] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 mb-8">
            <FiUsers className="w-10 h-10" />
          </div>
          <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-3">Select a group to manage</h3>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest max-w-[300px] leading-relaxed">
            Choose a group from the list above to view members and manage their access roles.
          </p>
        </div>
      ) : (
        <>
          {/* Members Management Table/List */}
          <div className="bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-[3rem] shadow-sm relative min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
              </div>
            )}

        <div className="overflow-x-auto custom-scrollbar rounded-[3rem] pb-60">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {isAuthorized && (
                  <th className="p-5 w-16">
                    <button 
                      onClick={toggleAll}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedUserIds.length === filteredMembers.length && filteredMembers.length > 0
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-500'
                      }`}
                    >
                      {selectedUserIds.length === filteredMembers.length && filteredMembers.length > 0 && <FiCheck className="w-3 h-3" />}
                    </button>
                  </th>
                )}
                <th className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] p-5">Member</th>
                <th className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] p-5 w-[180px]">Role</th>
                {isAuthorized && <th className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] p-5 text-right w-[180px]">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center">
                    <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">No members found</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr key={member.user_id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    {isAuthorized && (
                      <td className="py-6 px-5">
                        <button 
                          onClick={() => toggleUser(member.user_id)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedUserIds.includes(member.user_id)
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-gray-200 dark:border-gray-700 hover:border-indigo-500'
                          }`}
                        >
                          {selectedUserIds.includes(member.user_id) && <FiCheck className="w-3 h-3" />}
                        </button>
                      </td>
                    )}
                    <td className="py-6 px-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[11px] font-black text-indigo-600 shrink-0 border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                          {member.first_name[0]}{member.last_name ? member.last_name[0] : ''}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[150px] sm:max-w-none">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase mt-0.5 tracking-wider truncate max-w-[150px] sm:max-w-none">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-5">
                      <div className="flex flex-wrap gap-2">
                        {(member.user_roles || ['GROUP_MEMBER']).map(roleId => (
                          <span 
                            key={roleId}
                            className={`inline-block px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider border whitespace-nowrap shadow-sm ${getRoleBadgeColor(roleId)}`}
                          >
                            {config.roles.find(r => r.id === roleId)?.label || roleId}
                          </span>
                        ))}
                      </div>
                    </td>
                    {isAuthorized && (
                      <td className="py-6 px-5 text-right relative">
                        {(() => {
                          return (
                            <div className="flex items-center justify-end gap-3">
                              {/* Manage Roles Dropdown */}
                              <div className="relative inline-block text-left group/menu hover:z-[100] focus-within:z-[100]">
                                <button className="bg-gray-50 dark:bg-gray-800 border border-transparent hover:border-indigo-500 rounded-xl px-5 py-3 text-[9px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 outline-none transition-all cursor-pointer flex items-center gap-3 shadow-sm active:scale-95">
                                  Manage Roles
                                  <FiChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover/menu:text-indigo-500 transition-colors" />
                                </button>
                                
                                <div className="absolute right-0 top-full mt-2 w-[240px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-2xl p-5 z-[100] opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all scale-95 group-hover/menu:scale-100 origin-top-right overflow-y-auto max-h-[400px] custom-scrollbar">
                                  <div className="space-y-4">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Select Roles</p>
                                    <div className="space-y-2">
                                      {config.roles.map(role => {
                                        const currentRoles = pendingRoles[member.user_id] || member.user_roles || ['GROUP_MEMBER'];
                                        const isSelected = currentRoles.includes(role.id);
                                        const isDefault = role.id === 'GROUP_MEMBER';
                                        // Disable GROUP_ADMIN checkbox if this member already has GROUP_ADMIN saved
                                        const isAlreadyAdmin = role.id === 'GROUP_ADMIN' && (member.user_roles || []).includes('GROUP_ADMIN');
                                        const isDisabled = isDefault || isAlreadyAdmin;
                                        return (
                                          <label
                                            key={role.id}
                                            title={isAlreadyAdmin ? 'This user is already a Group Admin' : undefined}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                          >
                                            <input 
                                              type="checkbox"
                                              disabled={isDisabled}
                                              checked={isSelected || isDefault}
                                              onChange={(e) => {
                                                if (isDisabled) return;
                                                const newRoles = e.target.checked 
                                                  ? [...currentRoles, role.id]
                                                  : currentRoles.filter(id => id !== role.id);
                                                setPendingRoles(prev => ({ ...prev, [member.user_id]: newRoles }));
                                              }}
                                              className="w-4 h-4 rounded-md border-gray-200 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">
                                              {role.label}
                                              {isAlreadyAdmin && (
                                                <span className="ml-2 text-[8px] font-bold text-indigo-400 normal-case tracking-normal">(Admin)</span>
                                              )}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                    
                                    <div className="pt-2 border-t border-gray-50 dark:border-gray-800">
                                      <button
                                        onClick={() => {
                                          const rolesToSave = pendingRoles[member.user_id] || member.user_roles;
                                          handleIndividualUpdate(member.user_id, rolesToSave);
                                        }}
                                        disabled={saving || !pendingRoles[member.user_id]}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                                      >
                                        {saving ? (
                                          <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <FiCheck className="w-3.5 h-3.5" />
                                            Apply Changes
                                          </>
                                        )}
                                      </button>
                                      {pendingRoles[member.user_id] && !saving && (
                                        <button 
                                          onClick={() => setPendingRoles(prev => {
                                            const next = { ...prev };
                                            delete next[member.user_id];
                                            return next;
                                          })}
                                          className="w-full mt-2 py-2 text-[8px] font-black text-gray-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                                        >
                                          Discard Changes
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      {isAuthorized && selectedUserIds.length > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[800px] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-4 pl-10 shadow-2xl flex items-center justify-between gap-6 ring-4 ring-indigo-600/5 backdrop-blur-xl">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-4">
                {selectedUserIds.slice(0, 3).map(id => {
                  const m = members.find(u => u.user_id === id);
                  return (
                    <div key={id} className="w-10 h-10 rounded-full bg-indigo-600 text-white border-4 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-black shadow-sm">
                      {m?.first_name[0]}
                    </div>
                  );
                })}
                {selectedUserIds.length > 3 && (
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 border-4 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-black">
                    +{selectedUserIds.length - 3}
                  </div>
                )}
              </div>
              <div className="h-10 w-[1px] bg-gray-100 dark:bg-gray-800" />
              <div>
                <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">Bulk Update</p>
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{selectedUserIds.length} members selected</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group/bulk">
                <button className="bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-indigo-500 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white outline-none transition-all cursor-pointer flex items-center gap-3">
                  Assign Roles...
                  <FiChevronDown className="w-4 h-4 text-indigo-600 group-hover/bulk:rotate-180 transition-transform" />
                </button>
                
                {/* Bulk Multi-select Dropdown */}
                <div className="absolute bottom-full right-0 mb-4 w-[240px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-2xl p-5 z-[1001] opacity-0 invisible group-hover/bulk:opacity-100 group-hover/bulk:visible transition-all transform translate-y-4 group-hover/bulk:translate-y-0 overflow-y-auto max-h-[350px] custom-scrollbar">
                  <div className="space-y-4">
                    {config.roles.map(role => {
                      const isDefault = role.id === 'GROUP_MEMBER';
                      const isSelected = selectedBulkRole.includes(role.id);
                      return (
                        <label key={role.id} className={`flex items-center gap-4 p-2.5 rounded-xl transition-colors cursor-pointer ${isDefault ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                          <input 
                            type="checkbox"
                            disabled={isDefault}
                            checked={isSelected || isDefault}
                            onChange={(e) => {
                              if (isDefault) return;
                              setSelectedBulkRole(prev => 
                                e.target.checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                              );
                            }}
                            className="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white leading-none mb-1">{role.label}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[140px]">{role.description.split(',')[0]}...</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleBulkUpdate}
                disabled={selectedBulkRole.length === 0 || saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-8 rounded-2xl flex items-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Apply All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Info Helper */}
          <div className="p-10 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-[3.5rem] flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl text-indigo-600 shrink-0">
              <FiInfo className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-3">Permissions Quick Guide</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {config.roles.map(role => (
                  <div key={role.id}>
                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase mb-1 tracking-tight">{role.label}</p>
                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase leading-relaxed tracking-wider">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
