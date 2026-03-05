import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { countries } from '../data/countries'

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate name (letters and spaces only, 2-100 characters)
export const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s]{2,100}$/
  return nameRegex.test(name.trim())
}

// Validate last name (letters and spaces only, at least 1 character)
export const validateLastName = (name) => {
  const nameRegex = /^[a-zA-Z\s]{1,100}$/
  return nameRegex.test(name.trim())
}


// Validate mobile number - Use libphonenumber-js for international validation
export const validateMobileNumber = (mobileNumber, countryCode = 'IN') => {
  if (!mobileNumber || mobileNumber.trim() === '') return false
  const cleanNumber = mobileNumber.trim()

  try {
    // 1. Try strict validation first
    const phoneNumber = parsePhoneNumberFromString(cleanNumber, countryCode)
    if (phoneNumber && phoneNumber.isValid()) {
      // Regular check against our maxLength metadata
      const country = countries.find(c => c.code === (phoneNumber.country || countryCode))
      if (country && phoneNumber.nationalNumber.length !== country.maxLength) {
        return false
      }
      return true
    }

    // 2. Fallback: If not strictly valid, check if it's "possible" and matches our length
    // This is useful for regions where the library might be outdated or too strict
    const digitsOnly = cleanNumber.replace(/\D/g, '')
    const selectedCountry = countries.find(c => c.code === countryCode)
    
    if (selectedCountry && digitsOnly.length === selectedCountry.maxLength) {
       // If it's the exact length we expect for this country, we allow it even if library is unsure
       return true
    }

    return false
  } catch (error) {
    return false
  }
}

// Validate identifier (email or mobile number)
export const validateIdentifier = (identifier, countryCode = 'IN') => {
  if (!identifier || identifier.trim() === '') return false
  const cleanIdentifier = identifier.trim()

  // If it contains @, validate as email
  if (cleanIdentifier.includes('@')) {
    return validateEmail(cleanIdentifier)
  }

  // Check if it's potentially a phone number (contains digits and optional +)
  // Inclusive enough for most countries (6 to 15 digits)
  const phonePattern = /^(\+)?[\d\s-]{6,15}$/
  if (phonePattern.test(cleanIdentifier)) {
    return validateMobileNumber(cleanIdentifier, countryCode)
  }

  return false
}

// Validate password - must be at least 6 characters
export const validatePassword = (password) => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' }
  }

  return { valid: true }
}

// Validate registration form
export const validateRegisterForm = (formData) => {
  const errors = {}

  // First Name
  if (!formData.firstName || formData.firstName.trim() === '') {
    errors.firstName = 'First name is required'
  } else if (!validateName(formData.firstName)) {
    errors.firstName = 'First name must be between 2 and 100 characters and contain only letters and spaces'
  }

  // Last Name (optional)
  if (formData.lastName && formData.lastName.trim() !== '') {
    if (!validateLastName(formData.lastName)) {
      errors.lastName = 'Last name must be at least 1 character and contain only letters and spaces'
    }
  }

  // Email
  if (!formData.email || formData.email.trim() === '') {
    errors.email = 'Email is required'
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Please provide a valid email address'
  }

  // Mobile Number
  if (!formData.mobileNumber || (typeof formData.mobileNumber === 'string' && formData.mobileNumber.trim() === '')) {
    errors.mobileNumber = 'Mobile number is required'
  } else {
    const numberToValidate = formData.fullMobileNumber || formData.mobileNumber;
    const countryCode = formData.mobileCountryCode || 'IN';

    // Get country info to check length specifically
    const countryInfo = countries.find(c => c.code === countryCode);
    const digits = formData.mobileNumber.replace(/\D/g, '');

    if (countryInfo && digits.length !== countryInfo.maxLength) {
      errors.mobileNumber = `Mobile number must be exactly ${countryInfo.maxLength} digits for ${countryInfo.name}`;
    } else if (!validateMobileNumber(numberToValidate, countryCode)) {
      errors.mobileNumber = 'Please enter a valid mobile number for the selected country';
    }
  }

  // Password
  if (!formData.password || formData.password.trim() === '') {
    errors.password = 'Password is required'
  } else {
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message
    }
  }

  // Confirm Password
  if (!formData.confirmPassword || formData.confirmPassword.trim() === '') {
    errors.confirmPassword = 'Confirm password is required'
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Validate login form
export const validateLoginForm = (formData) => {
  const errors = {}

  // Email
  if (!formData.email || formData.email.trim() === '') {
    errors.email = 'Email is required'
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Please provide a valid email address'
  }

  // Password
  if (!formData.password || formData.password.trim() === '') {
    errors.password = 'Password is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
