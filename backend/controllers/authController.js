import authService from '../services/authService.js'

// Register user controller - handles HTTP request/response for user registration
export const register = async (req, res) => {
  try {
    // Call service to register user
    const result = await authService.register(req.body)

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    })
  } catch (error) {
    console.error('Register error:', error)
    
    // Handle specific error cases
    if (error.message === 'Email already registered. Please login instead.') {
      return res.status(409).json({
        success: false,
        message: error.message
      })
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Login user controller - handles HTTP request/response for user login
export const login = async (req, res) => {
  try {
    // Call service to login user
    const result = await authService.login(req.body)

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    })
  } catch (error) {
    console.error('Login error:', error)
    
    // Handle authentication errors
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        success: false,
        message: error.message
      })
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Get current user controller - handles HTTP request/response for getting authenticated user
export const getCurrentUser = async (req, res) => {
  try {
    // Call service to get user by ID
    const result = await authService.getUserById(req.userId)

    // Return success response
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Get current user error:', error)
    
    // Handle user not found
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      })
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

