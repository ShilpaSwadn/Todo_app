/**
 * Personal & Account Configuration
 */
export const personalConfig = {
  id: 'personal',
  title: 'Personal Information',
  description: 'Manage your profile information',
  categories: [
    {
      id: 'personal_account',
      title: 'Personal & Account',
      fields: [
        { id: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name' },
        { id: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name' },
        { id: 'email', label: 'Email', type: 'email', isReadOnly: true },
        { id: 'mobileNumber', label: 'Phone Number', type: 'tel', isReadOnly: true },
      ]
    },
    {
      id: 'household_family',
      title: 'Household Details',
      fields: [
        { id: 'householdRole', label: 'Your Role', type: 'select', options: ['Head', 'Member', 'Child', 'Guest'] },
        { id: 'householdSize', label: 'Household Size', type: 'number', min: 1, placeholder: 'Enter number of members' },
      ]
    },
    {
      id: 'dietary_religious',
      title: 'Dietary & Religious',
      fields: [
        {
          id: 'dietType',
          label: 'Primary Diet',
          type: 'select',
          options: ['Vegetarian', 'Vegan', 'Eggetarian', 'Non-Vegetarian', 'Jain']
        },
        {
          id: 'religiousRestrictions',
          label: 'Religious Restrictions',
          type: 'select',
          options: ['None', 'Hindu', 'Jain', 'Halal', 'Kosher']
        },
        {
          id: 'allowedMeats',
          label: 'Allowed Meats',
          type: 'multi-select',
          options: ['Chicken', 'Mutton', 'Fish', 'Beef', 'Pork', 'None'],
          dependsOn: { field: 'dietType', values: ['Non-Vegetarian', 'Eggetarian'] }
        },
        {
          id: 'eggsAllowed',
          label: 'Eggs Allowed',
          type: 'radio',
          options: ['Yes', 'No'],
          dependsOn: { field: 'dietType', values: ['Vegetarian', 'Eggetarian', 'Non-Vegetarian'] }
        },
      ]
    },
    {
      id: 'allergies_intolerances',
      title: 'Allergies & Intolerances',
      fields: [
        { id: 'allergen', label: 'Allergen Name', type: 'multi-select', options: ['Peanuts', 'Dairy', 'Gluten', 'Soy', 'Shellfish'] },
        { id: 'severity', label: 'Reaction Severity', type: 'radio', options: ['Low', 'Medium', 'High'] },
      ]
    },
    {
      id: 'health_medical',
      title: 'Health & Medical',
      fields: [
        { id: 'medicalConditions', label: 'Medical Conditions', type: 'multi-select', options: ['Diabetes', 'BP', 'Thyroid', 'None'] },
        { id: 'height', label: 'Height (cm)', type: 'number' },
        { id: 'weight', label: 'Weight (kg)', type: 'number' },
      ]
    },
    {
      id: 'nutrition_goals',
      title: 'Nutrition Goals',
      fields: [
        { id: 'primaryGoal', label: 'Primary Goal', type: 'select', options: ['Weight Loss', 'Weight Gain', 'Maintenance'] },
        { id: 'dailyCalories', label: 'Daily Calories', type: 'number', min: 0, placeholder: 'Target kcal' },
        { id: 'macronutrientTargets', label: 'Targets', type: 'radio', options: ['High Protein', 'Low Carb', 'Balanced'] },
      ]
    },
    {
      id: 'taste_preferences',
      title: 'Taste Preferences',
      fields: [
        { id: 'favoriteCuisines', label: 'Fav Cuisines', type: 'multi-select', options: ['South Indian', 'North Indian', 'Chinese', 'Italian', 'Continental'] },
        {
          id: 'dislikedIngredients',
          label: 'Disliked Ingredients',
          type: 'multi-select',
          options: ['Onion', 'Garlic', 'Mushroom', 'None']
        },
        { id: 'spiceLevel', label: 'Spice Level', type: 'radio', options: ['Low', 'Medium', 'High'] },
      ]
    },
    {
      id: 'seasonal_regional',
      title: 'Seasonal & Regional',
      fields: [
        { id: 'seasonalPreference', label: 'Seasonality', type: 'select', options: ['Seasonal Only', 'All Season'] },
        { id: 'regionalCuisine', label: 'Regional Styles', type: 'multi-select', options: ['Tamil Nadu', 'Kerala', 'Andhra', 'North Indian', 'Global'] },
      ]
    },
    {
      id: 'shopping_preferences',
      title: 'Shopping Preferences',
      fields: [
        { id: 'preferredStore', label: 'Preferred Store', type: 'multi-select', options: ['Local Store', 'Supermarket', 'Online'] },
        { id: 'fulfillmentMode', label: 'Fulfillment', type: 'radio', options: ['Pickup', 'Delivery', 'In-Store'] },
        { id: 'budgetRange', label: 'Budget Range', type: 'radio', options: ['Low', 'Medium', 'High'] },
      ]
    },
    {
      id: 'pantry_kitchen',
      title: 'Pantry & Kitchen',
      fields: [
        { id: 'pantryItems', label: 'Pantry Staples', type: 'multi-select', options: ['Rice', 'Wheat', 'Dal', 'Oil', 'Spices'] },
        { id: 'kitchenAppliances', label: 'Appliances', type: 'multi-select', options: ['Gas Stove', 'Induction', 'Microwave', 'Oven', 'Mixer'] },
      ]
    },
    {
      id: 'meal_planning',
      title: 'Meal Planning',
      fields: [
        { id: 'mealsPerDay', label: 'Meals Per Day', type: 'number', min: 1, placeholder: 'e.g. 3' },
        { id: 'prepTimeLimit', label: 'Time Limit', type: 'select', options: ['15 min', '30 min', '45 min', '60 min'] },
      ]
    },
    {
      id: 'accessibility_ui',
      title: 'Accessibility & UI',
      fields: [
        { id: 'accessibilityNeeds', label: 'Accessibility', type: 'multi-select', options: ['Large Text', 'Voice Assist', 'High Contrast'] },
        { id: 'notificationPreferences', label: 'Notifications', type: 'multi-select', options: ['Email', 'SMS', 'Push'] },
      ]
    },
    {
      id: 'behavioral_data',
      title: 'Cooking Preferences',
      fields: [
        { id: 'recipeFeedback', label: 'Feedback Mode', type: 'radio', options: ['Like', 'Dislike'] },
        { id: 'cookingSkillLevel', label: 'Skill Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
      ]
    },
    {
      id: 'privacy_consent',
      title: 'Privacy & Consent',
      fields: [
        { id: 'profileDataConsent', label: 'Profile Consent', type: 'radio', options: ['Yes', 'No'] },
        { id: 'healthDataConsent', label: 'Health Consent', type: 'radio', options: ['Yes', 'No'] },
      ]
    },
    {
      id: 'business_kiosk',
      title: 'Account Type',
      fields: [
        { id: 'accountType', label: 'Account Type', type: 'select', options: ['Individual', 'Family', 'Business', 'Kiosk'] },
        { id: 'kioskSessionMode', label: 'Kiosk Mode', type: 'radio', options: ['Anonymous', 'Logged In'] },
      ]
    }
  ]
};
