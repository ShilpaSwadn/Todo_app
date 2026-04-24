import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin.js';
import User from '@/lib/server/models/User.js';
import { sendOTPEmail } from '@/lib/server/services/emailService.js';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email: identifier } = body;

    if (!identifier) {
      return NextResponse.json({ success: false, message: 'Identifier is required' }, { status: 400 });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isEmail = cleanIdentifier.includes('@');

    // 1. Check in FIREBASE (Primary Source of Truth)
    let firebaseUser = null;
    try {
      if (isEmail) {
        firebaseUser = await adminAuth.getUserByEmail(cleanIdentifier);
      } else {
        const digits = cleanIdentifier.replace(/\D/g, '');
        const normalizedMobile = cleanIdentifier.startsWith('+') ? cleanIdentifier : (digits.length === 10 ? `+91${digits}` : `+${digits}`);
        firebaseUser = await adminAuth.getUserByPhoneNumber(normalizedMobile);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({
          success: false,
          message: 'We couldn\'t find an account for this identifier. Would you like to Register?'
        }, { status: 404 });
      }
      throw error;
    }

    if (!firebaseUser.email) {
      return NextResponse.json({
        success: false,
        message: 'This account has no associated email address for OTP delivery.'
      }, { status: 400 });
    }

    const targetEmail = firebaseUser.email;

    // 2. Generate OTP (Stateless)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = 10 * 60 * 1000; // 10 minutes
    const expiresAt = Date.now() + ttl;

    const data = `${cleanIdentifier}.${otp}.${expiresAt}`;
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
    const fullHash = `${hash}.${expiresAt}`;

    // 3. Send OTP
    try {
      const emailResult = await sendOTPEmail(targetEmail, otp);

      return NextResponse.json({
        success: true,
        message: `OTP sent to your email: ${targetEmail.replace(/(.{2})(.*)(?=@)/, "$1***")}`,
        hash: fullHash,
        messageId: emailResult.messageId || null,
        isLoggedOnly: emailResult.isLoggedOnly || false
      });
    } catch (err) {
      console.error('Email sending failed:', err);
      return NextResponse.json({ success: false, message: 'Failed to send OTP to email.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, message: 'Error sending OTP' }, { status: 500 });
  }
}
