// API Client for making HTTP requests to the backend
// Using relative paths for Next.js API routes
const API_BASE_URL = '/api'

// Get authentication token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

// Make API request
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken()
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  // Remove headers from options to avoid duplication
  delete config.headers.headers

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred')
    }

    return data
  } catch (error) {
    // Handle network errors
    if (error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please check your connection.')
    }
    throw error
  }
}

// API methods
export const api = {
  // GET request
  get: (endpoint, options = {}) => {
    return apiRequest(endpoint, {
      method: 'GET',
      ...options,
    })
  },

  // POST request
  post: (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    })
  },

  // PUT request
  put: (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    })
  },

  // DELETE request
  delete: (endpoint, options = {}) => {
    return apiRequest(endpoint, {
      method: 'DELETE',
      ...options,
    })
  },
}

export default api
