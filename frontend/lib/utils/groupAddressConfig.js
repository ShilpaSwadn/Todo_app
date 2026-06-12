export const groupAddressConfig = {
  id: 'group_address',
  title: 'Addresses',
  description: 'Manage addresses for your groups',
  categories: [
    {
      id: 'address_info',
      title: 'Address Information',
      description: 'Add or update address for a group.',
      fields: [
        { id: 'groupId', label: 'Select Group', type: 'select', required: true, placeholder: 'Choose a group' },
        { id: 'addressLine1', label: 'Address Line 1', type: 'text', required: true, placeholder: '123 Main St', minLength: 5, maxLength: 100 },
        { id: 'addressLine2', label: 'Address Line 2', type: 'text', required: false, placeholder: 'Apt, Suite, Bldg. (Optional)', maxLength: 100 },
        { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'New York', minLength: 2, maxLength: 50 },
        { id: 'stateProvince', label: 'State / Province / Region', type: 'text', required: true, placeholder: 'NY', minLength: 2, maxLength: 50 },
        { id: 'postalCode', label: 'ZIP / Postal Code', type: 'text', required: true, placeholder: '10001', pattern: '^[a-zA-Z0-9 -]{3,10}$', maxLength: 10 },
        { id: 'country', label: 'Country', type: 'text', required: true, placeholder: 'USA', minLength: 2, maxLength: 50 }
      ]
    }
  ]
}
