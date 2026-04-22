/**
 * Group Management Configuration
 */
export const groupsConfig = {
  id: 'groups',
  title: 'Group Management',
  description: 'Manage your groups',
  categories: [
    {
      id: 'new_group_identity',
      title: 'Create New Group',
      fields: [
        { 
          id: 'name', 
          label: 'Group Name', 
          type: 'text', 
          placeholder: 'e.g. FAMILY HUB', 
          required: true 
        },
        { 
          id: 'description', 
          label: 'Group Description', 
          type: 'text', 
          placeholder: 'Purpose of this group...', 
          required: false 
        }
      ]
    }
  ]
};
