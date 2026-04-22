/**
 * Payment Methods Configuration
 */
export const paymentConfig = {
  id: 'payment',
  title: 'Payment Methods',
  description: 'Manage your payment methods',
  categories: [
    {
      id: 'new_payment_method',
      title: 'Add New Payment Method',
      fields: [
        { 
          id: 'cardholderName', 
          label: 'Cardholder Name', 
          type: 'text', 
          placeholder: 'AS APPEARS ON CARD', 
          required: true 
        },
        { 
          id: 'cardNumber', 
          label: 'Card Number', 
          type: 'text', 
          placeholder: '0000 0000 0000 0000', 
          required: true 
        },
        { 
          id: 'expiryDate', 
          label: 'Expiry Date', 
          type: 'text', 
          placeholder: 'MM/YY', 
          required: true, 
          maxLength: 5 
        },
        { 
          id: 'cvv', 
          label: 'CVV', 
          type: 'password', 
          placeholder: '•••', 
          required: true, 
          maxLength: 4 
        },
        { 
          id: 'provider', 
          label: 'Payment Provider', 
          type: 'select', 
          options: ['Stripe', 'PayPal', 'Apple Pay', 'Google Pay', 'Square'],
          placeholder: 'Select gateway'
        },
        { 
          id: 'fundingType', 
          label: 'Funding Source', 
          type: 'select', 
          options: ['debit', 'credit card', 'amex card'],
          placeholder: 'Select funding source'
        },
        { 
          id: 'groupId', 
          label: 'Link to Group', 
          type: 'select', 
          isDynamic: true, 
          dynamicType: 'groups',
          placeholder: 'Select a Group'
        }
      ]
    }
  ]
};
