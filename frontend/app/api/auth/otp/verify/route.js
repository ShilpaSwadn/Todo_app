import { NextResponse } from 'next/server'
import { query } from '@/lib/server/config/database.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import OTP from '@/lib/server/models/OTP.js'
import User from '@/lib/server/models/User.js'
import jwt from 'jsonwebtoken'

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

export async function POST(request) {
  try {
    // Initialize database
    await ensureDbInitialized()

    // Parse request body
    const body = await request.json()
    const { email: identifier, otp } = body

    // Validate input
    if (!identifier || !identifier.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Email or Mobile Number is required'
      }, { status: 400 })
    }

    if (!otp || !otp.trim()) {
      return NextResponse.json({
        success: false,
        message: 'OTP is required'
      }, { status: 400 })
    }

    // 1. Find user by identifier
    const user = await User.findByIdentifier(identifier)

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 })
    }

    // 2. Verify OTP (always against email)
    const otpData = await OTP.verify(user.email, otp)
    if (!otpData) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired OTP'
      }, { status: 400 })
    }

    // Delete used OTP
    await OTP.deleteById(otpData.id)

    // Generate token
    const token = generateToken(user.id)

    // Return user data and token
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobileNumber: user.mobileNumber
        },
        token
      }
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
