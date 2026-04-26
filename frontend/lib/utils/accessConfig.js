export const accessConfig = {
  id: 'access',
  title: 'User Access',
  description: 'Manage member roles and permissions within your groups.',
  roles: [
    { id: 'GROUP_ADMIN', label: 'Group Admin', description: 'All privileges, manage group, can view or add or delete payments.' },
    { id: 'PAYMENT_ADMIN', label: 'Payment Admin', description: 'Cannot manage group, can view or add or delete payments.' },
    { id: 'GROUP_MEMBER', label: 'Group Member', description: 'Default role, cannot manage group, cannot view or add payments.' },
    { id: 'PAYMENT_USER', label: 'Payment User', description: 'Cannot manage group, cannot add or delete payments, can only view and use the payment details.' }
  ]
};
