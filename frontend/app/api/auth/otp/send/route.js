import { NextResponse } from 'next/server'
import { query } from '@/lib/server/config/database.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import OTP from '@/lib/server/models/OTP.js'
import User from '@/lib/server/models/User.js'
import { sendOTPEmail } from '@/lib/server/services/emailService.js'

export async function POST(request) {
  console.log('OTP Send: Received request');
  try {
    // Initialize database
    await ensureDbInitialized()

    // Parse request body
    const body = await request.json()
    const { email: identifier } = body // Frontend still sends as 'email' but it's an identifier now

    // Validate identifier
    if (!identifier || !identifier.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Email or Mobile Number is required'
      }, { status: 400 })
    }

    // Check if user exists
    console.log('OTP Send: Looking up user by identifier:', identifier);
    const user = await User.findByIdentifier(identifier)

    if (!user) {
      console.log('OTP Send: User not found in main table, checking temp_users...');
      const cleanIdentifier = identifier.trim().toLowerCase();
      const fetchTempSql = 'SELECT EXISTS(SELECT 1 FROM public.temp_users WHERE email = $1 OR mobile_number = $2)'
      const tempParams = [cleanIdentifier, identifier.trim()];
      const tempResult = await query(fetchTempSql, tempParams)

      if (tempResult.rows[0].exists) {
        console.log('OTP Send: User found in temp_users. Blocking login.');
        return NextResponse.json({
          success: false,
          message: 'Account not verified. Please verify your email first.'
        }, { status: 403 })
      }

      console.log('OTP Send: User not found anywhere.');
      return NextResponse.json({
        success: false,
        message: 'No account found with this email or mobile number'
      }, { status: 404 })
    }

    // Check if user is verified
    if (!user.isVerified) {
      console.log('OTP Send: User found but isVerified is false. Blocking.');
      return NextResponse.json({
        success: false,
        message: 'Account not verified. Please verify your email first.'
      }, { status: 403 })
    }

    console.log('OTP Send: User found and verified. Proceeding with OTP generation.');

    // Generate and store OTP (always against email)
    const otpData = await OTP.create(user.email)

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otpData.otp)
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      throw new Error('Failed to send OTP email. Please try again later.')
    }

    // Clean expired OTPs
    await OTP.cleanExpired()

    return NextResponse.json({
      success: true,
      message: `OTP sent to your registered email: ${user.email.replace(/(.{2})(.*)(?=@)/, "$1***")}`
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
