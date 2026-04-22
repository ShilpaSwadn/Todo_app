'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiCheck, FiUsers } from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import api from '@/lib/api/client'
import { LoadingOverlay } from '@/components/ui/LoadingSpinner'

export default function GroupSection({ user, config, setError, setSuccess }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState('Saving...')
  
  // Create form state
  const [showCreateInline, setShowCreateInline] = useState(false)
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '' })
  const [selectedInitialMembers, setSelectedInitialMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Edit state
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDesc, setEditGroupDesc] = useState('')

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await api.get('/groups')
      if (response.success) {
        setGroups(response.groups || [])
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err)
      setError("Failed to load groups.")
    } finally {
      setLoading(false)
    }
  }

  const handleMemberSearch = async (val) => {
    setMemberSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
      if (response.success) {
        setSearchResults(response.users || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }

  const createGroup = async () => {
    if (groups.length >= 5) {
      setError('Limit reached: Maximum of 5 groups allowed per account.')
      return
    }

    if (!newGroupData.name.trim() || selectedInitialMembers.length === 0) {
      setError('A group name and at least one initial member are mandatory.')
      return
    }

    try {
      setSavingLabel('Creating group...')
      setSaving(true)
      const response = await api.post('/groups', {
        name: newGroupData.name,
        description: newGroupData.description,
        memberIds: selectedInitialMembers.map(m => m.id)
      })

      if (response.success) {
        setGroups([response.group, ...groups])
        setNewGroupData({ name: '', description: '' })
        setSelectedInitialMembers([])
        setShowCreateInline(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Group creation failed:", err)
      setError(err.message || "Failed to create new group.")
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
      setSavingLabel('Updating group...')
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
      setError(err.message || "Failed to update group.")
    } finally {
      setSaving(false)
    }
  }

  const deleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group? This action is irreversible.')) return;

    try {
      setSavingLabel('Deleting group...')
      setSaving(true)
      const response = await api.delete(`/groups/${groupId}`)

      if (response.success) {
        setGroups(groups.filter(g => g.id !== groupId))
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Failed to delete group:", err)
      setError(err.message || "Failed to delete group.")
    } finally {
      setSaving(false)
    }
  }

  const addMemberToGroup = async (groupId, member) => {
    try {
      setSavingLabel('Adding member...')
      setSaving(true)
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
      setError(err.message || "Failed to add member to group.")
    } finally {
      setSaving(false)
      setSearchResults([]);
      setMemberSearch('');
    }
  }

  const removeMemberFromGroup = async (groupId, memberId) => {
    try {
      setSavingLabel('Removing member...')
      setSaving(true)
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
      setError(err.message || "Failed to remove member from group.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative space-y-12">
      <LoadingOverlay active={saving} label={savingLabel} />

      {/* Dynamic Header with Create Button */}
      {!showCreateInline && (
        <div className="flex justify-end -mt-20 mb-8 relative z-10">
          <button
            onClick={() => setShowCreateInline(true)}
            disabled={groups.length >= 5}
            className={`p-4 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-2 ${groups.length >= 5 ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none'}`}
          >
            <FiPlus className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest px-2">
              {groups.length >= 5 ? 'Limit Reached' : 'New Group'}
            </span>
          </button>
        </div>
      )}

      {showCreateInline && (
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 space-y-8 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">{config.categories[0].title}</h3>
            <button onClick={() => {
              setShowCreateInline(false);
              setSelectedInitialMembers([]);
              setMemberSearch('');
            }} className="text-gray-400 hover:text-rose-500 transition-colors">
              <HiX className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {config.categories[0].fields.map(field => (
              <div key={field.id} className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={newGroupData[field.id]}
                  onChange={(e) => setNewGroupData({ ...newGroupData, [field.id]: e.target.value })}
                  className="w-full px-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white text-xs font-bold uppercase"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Add Members (Required)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {isSearching ? <ImSpinner2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <FiSearch className="w-4 h-4 text-gray-400" />}
              </div>
              <input
                type="text"
                placeholder="Search people to add..."
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white text-sm"
                value={memberSearch}
                onChange={(e) => handleMemberSearch(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
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
            disabled={saving || !newGroupData.name || selectedInitialMembers.length === 0}
            className="w-full py-5 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400"
          >
            {saving ? 'Creating Group...' : 'Create Group'}
          </button>
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center py-20 animate-pulse">
            <ImSpinner2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
            <FiUsers className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic opacity-40">No groups found in your account</p>
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
                        placeholder="Short description"
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
                  <span className="hidden sm:inline-block text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full uppercase tracking-widest leading-none">{group.members.length} Members</span>

                  {group.ownerId === user?.id ? (
                    editingGroupId === group.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateGroup(group.id)}
                          className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                          title="Save Changes"
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingGroupId(null)}
                          className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="Cancel"
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
                          title="Edit Group"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteGroup(group.id)}
                          className="p-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all transform active:scale-95"
                          title="Delete Group"
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
                    placeholder="Search people by Email or Name..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white text-sm"
                    value={memberSearch}
                    onChange={(e) => handleMemberSearch(e.target.value)}
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
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.members.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-12 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No members in this group</td></tr>
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
                            {group.ownerId === user?.id && member.id !== group.ownerId && (
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
  )
}
