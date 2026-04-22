
/**
 * Language & Currency Configuration
 */
export const languageConfig = {
  id: 'language',
  title: 'Language & Currency',
  description: 'Region and language settings',
  categories: [
    {
      id: 'localization_settings',
      title: 'Regional Settings',
      fields: [
        {
          id: 'languagePreference',
          label: 'Primary Language',
          type: 'select',
          options: ['English', 'Spanish', 'French', 'German', 'Hindi', 'Tamil', 'Japanese', 'Mandarin'],
          placeholder: 'Select preferred language'
        },
        {
          id: 'currency',
          label: 'Local Currency',
          type: 'select',
          options: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'AED'],
          placeholder: 'Select primary currency'
        },
        {
          id: 'timeZone',
          label: 'Time Zone',
          type: 'select',
          options: ['UTC', 'IST (GMT+5:30)', 'EST (GMT-5)', 'CST (GMT-6)', 'PST (GMT-8)', 'GST (GMT+4)'],
          placeholder: 'Select your time zone'
        },
      ]
    }
  ]
};
