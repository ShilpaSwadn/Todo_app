import { NextResponse } from 'next/server'
import { query } from '@/lib/server/config/database'
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
    console.log('OTP Send: Looking up user by email:', email);
    const user = await User.findByEmail(email)

    // Check if user is in main table but not verified
    if (user && !user.isVerified) {
      console.log('OTP Send: User found in main table but isVerified is false. Blocking.');
      return NextResponse.json({
        success: false,
        message: 'Email not verified. Please verify your email first.'
      }, { status: 403 })
    }

    if (!user) {
      console.log('OTP Send: User not found in main table, checking temp_users...');
      const fetchTempSql = 'SELECT EXISTS(SELECT 1 FROM public.temp_users WHERE email = $1)'
      const tempParams = [email.toLowerCase()];
      const tempResult = await query(fetchTempSql, tempParams)

      if (tempResult.rows[0].exists) {
        console.log('OTP Send: User found in temp_users. Blocking login.');
        return NextResponse.json({
          success: false,
          message: 'Email not verified. Please verify your email first.'
        }, { status: 403 })
      }

      console.log('OTP Send: User not found anywhere.');
      return NextResponse.json({
        success: false,
        message: 'No account found with this email address'
      }, { status: 404 })
    }

    console.log('OTP Send: User found in main table. Proceeding with OTP generation.');

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
