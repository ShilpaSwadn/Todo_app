import { NextResponse } from 'next/server'
import { ensureDbInitialized } from '@lib/server/middleware/dbInit.js'
import OTP from '@lib/server/models/OTP.js'
import User from '@lib/server/models/User.js'
import { sendOTPEmail } from '@lib/server/services/emailService.js'

// Email validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request) {
  try {
    // Initialize database
    await ensureDbInitialized()
    
    // Parse request body
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || !email.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Email is required'
      }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Please provide a valid email address'
      }, { status: 400 })
    }

    // Check if user exists
    const user = await User.findByEmail(email)
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'No account found with this email address'
      }, { status: 404 })
    }

    // Generate and store OTP
    const otpData = await OTP.create(email)
    
    // Send OTP email
    try {
      await sendOTPEmail(email, otpData.otp)
    } catch (emailError) {
      // If email fails, still return success but log the error
      // In production, you might want to handle this differently
      console.error('Failed to send email:', emailError)
      // For development, you can return the OTP in response
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'OTP generated (email sending failed in dev mode)',
          otp: otpData.otp // Only in development
        })
      }
      throw emailError
    }

    // Clean expired OTPs
    await OTP.cleanExpired()

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email address'
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
