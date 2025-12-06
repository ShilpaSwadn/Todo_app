// Authentication service for API calls
import api from '../lib/api'
import { saveAuthData } from '../lib/auth'

// Register a new user
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData)
    
    if (response.success && response.data) {
      // Save user and token
      saveAuthData(response.data.user, response.data.token)
      return response.data
    }
    
    throw new Error(response.message || 'Registration failed')
  } catch (error) {
    throw error
  }
}

// Login user
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials)
    
    if (response.success && response.data) {
      // Save user and token
      saveAuthData(response.data.user, response.data.token)
      return response.data
    }
    
    throw new Error(response.message || 'Login failed')
  } catch (error) {
    throw error
  }
}

// Get current authenticated user
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me')
    
    if (response.success && response.data) {
      return response.data.user
    }
    
    throw new Error(response.message || 'Failed to get user')
  } catch (error) {
    throw error
  }
}

