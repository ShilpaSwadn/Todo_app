export const accessConfig = {
  id: 'access',
  title: 'User Access Control',
  description: 'Manage member roles and permissions within your groups.',
  roles: [
    { id: 'GROUP_ADMIN', label: 'Group Admin', description: 'Can only manage user roles and access control. Cannot manage group settings, addresses, or payments.' },
    { id: 'PAYMENT_ADMIN', label: 'Payment Admin', description: 'Can view, add, edit, and delete payment details. Cannot manage group settings or roles.' },
    { id: 'GROUP_MEMBER', label: 'Group Member', description: 'Default role. Cannot manage group settings, roles, payments, or addresses.' },
    { id: 'PAYMENT_USER', label: 'Payment User', description: 'Can only view and use payment details. Cannot manage group settings or add/edit/delete payments.' },
    { id: 'GROUP_ADDRESS_ADMIN', label: 'Group Address Admin', description: 'Can add, edit, and delete addresses. Cannot manage group settings, roles, or payments.' },
    { id: 'GROUP_ADDRESS_USER', label: 'Group Address User', description: 'Can only view addresses. Cannot manage group settings, roles, payments, or add/edit/delete addresses.' }
  ]
};
