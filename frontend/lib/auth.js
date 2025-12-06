// Authentication utilities for managing user session and tokens

// Save user data and token to localStorage
export const saveAuthData = (user, token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }
}

// Get current user from localStorage
export const getCurrentUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('currentUser')
    return userStr ? JSON.parse(userStr) : null
  }
  return null
}

// Get authentication token
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken()
}

// Clear authentication data (logout)
export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
  }
}

