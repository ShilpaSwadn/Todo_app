import User from '../models/User.js'
import jwt from 'jsonwebtoken'

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

class AuthService {
  // Register a new user
  async register(userData) {
    const { firstName, lastName, email, mobileNumber, password } = userData

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      throw new Error('Email already registered. Please login instead.')
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      mobileNumber,
      password
    })

    // Generate token
    const token = generateToken(user.id)

    // Return user data (without password)
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber
      },
      token
    }
  }

  // Login user
  async login(credentials) {
    const { email, password } = credentials

    // Find user by email
    const user = await User.findByEmail(email)
    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const isPasswordValid = await User.comparePassword(password, user.password)
    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Generate token
    const token = generateToken(user.id)

    // Return user data (without password)
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber
      },
      token
    }
  }

  // Get user by ID
  async getUserById(userId) {
    const user = await User.findById(userId)
    
    if (!user) {
      throw new Error('User not found')
    }

    return { user }
  }

  // Update user profile
  async updateProfile(userId, userData) {
    const { firstName, lastName, email, mobileNumber, password, oldPassword } = userData

    // Update user
    const user = await User.update(userId, {
      firstName,
      lastName,
      email,
      mobileNumber,
      password,
      oldPassword
    })

    return { user }
  }
}

export default new AuthService()
