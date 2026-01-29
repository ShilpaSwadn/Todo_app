import User from '../models/User.js'
import jwt from 'jsonwebtoken'

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

class AuthService {
  // Register a new user (stores in temp_users)
  async register(userData) {
    const { firstName, lastName, email, mobileNumber, password } = userData

    // 1. Check if email already exists
    const existingEmail = await User.findByEmail(email)
    if (existingEmail) {
      throw new Error('Email already registered. Please login instead.')
    }

    // 2. Check if mobile number already exists
    const existingMobile = await User.findByMobile(mobileNumber)
    if (existingMobile) {
      throw new Error('Mobile number already registered. Please use a different number.')
    }

    // Create user in temp_users
    const user = await User.createTemp({
      firstName,
      lastName,
      email,
      mobileNumber,
      password
    })

    return {
      message: 'Registration successful! Please verify your account to continue.',
      user: {
        email: user.email,
        mobileNumber: user.mobileNumber
      }
    }
  }

  // Login user with identifier (email or mobile) and password
  async login(credentials) {
    const { identifier, password } = credentials

    if (!identifier || !password) {
      throw new Error('Email/Mobile and password are required')
    }

    // 1. Find user by identifier
    const user = await User.findByIdentifier(identifier)

    if (!user) {
      throw new Error('Invalid email/mobile or password')
    }

    // 2. Check if verified
    if (!user.isVerified || user.isTemp) {
      throw new Error('Account not verified. Please verify your email first.')
    }

    // 3. Verify password
    const isPasswordValid = await User.comparePassword(password, user.password)
    if (!isPasswordValid) {
      throw new Error('Invalid email/mobile or password')
    }

    // Generate token
    const token = generateToken(user.id)

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

  // Specific login for email
  async loginWithEmail(email, password) {
    if (!email || !email.includes('@')) {
      throw new Error('Please provide a valid email address')
    }
    return this.login({ identifier: email, password })
  }

  // Specific login for mobile
  async loginWithMobile(mobileNumber, password) {
    if (!mobileNumber || mobileNumber.length < 10) {
      throw new Error('Please provide a valid 10-digit mobile number')
    }
    return this.login({ identifier: mobileNumber, password })
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
