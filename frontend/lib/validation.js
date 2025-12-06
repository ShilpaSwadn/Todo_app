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

// Validate mobile number
export const validateMobileNumber = (mobileNumber) => {
  if (!mobileNumber || mobileNumber.trim() === '') return true // Optional field
  const mobileRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
  return mobileRegex.test(mobileNumber.trim())
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

  // Mobile Number (optional)
  if (formData.mobileNumber && formData.mobileNumber.trim() !== '') {
    if (!validateMobileNumber(formData.mobileNumber)) {
      errors.mobileNumber = 'Please provide a valid mobile number'
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

