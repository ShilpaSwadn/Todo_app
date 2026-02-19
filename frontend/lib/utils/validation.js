// Frontend validation utilities

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

import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Validate mobile number - Use libphonenumber-js for international validation
export const validateMobileNumber = (mobileNumber, countryCode = 'IN') => {
  if (!mobileNumber || mobileNumber.trim() === '') return false

  try {
    const phoneNumber = parsePhoneNumberFromString(mobileNumber, countryCode)
    return phoneNumber ? phoneNumber.isValid() : false
  } catch (error) {
    return false
  }
}

// Validate identifier (email or mobile number)
export const validateIdentifier = (identifier) => {
  if (!identifier || identifier.trim() === '') return false
  const cleanIdentifier = identifier.trim()

  // If it contains @, validate as email
  if (cleanIdentifier.includes('@')) {
    return validateEmail(cleanIdentifier)
  }

  // Check if it's potentially a phone number (contains digits and optional +)
  const phonePattern = /^(\+)?[\d\s-]{10,15}$/
  if (phonePattern.test(cleanIdentifier)) {
    return validateMobileNumber(cleanIdentifier)
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
    // If we have fullMobileNumber (from new PhoneInput), use it, otherwise use mobileNumber
    const numberToValidate = formData.fullMobileNumber || formData.mobileNumber;
    const countryCode = formData.mobileCountryCode || 'IN';

    if (!validateMobileNumber(numberToValidate, countryCode)) {
      errors.mobileNumber = 'Please enter a valid mobile number for the selected country'
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
