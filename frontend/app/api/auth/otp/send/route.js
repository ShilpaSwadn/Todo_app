import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin.js';
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
    let userRecord = null;

    // 1. Check in Firebase (Single Source of Truth)
    try {
      if (cleanIdentifier.includes('@')) {
        userRecord = await adminAuth.getUserByEmail(cleanIdentifier);
      } else {
        // Find by phone
        try {
          userRecord = await adminAuth.getUserByPhoneNumber(cleanIdentifier);
        } catch (e) {
          if (!cleanIdentifier.startsWith('+')) {
            userRecord = await adminAuth.getUserByPhoneNumber(`+91${cleanIdentifier}`);
          }
        }
      }
    } catch (e) {
      // User not found in Firebase
    }

    if (!userRecord) {
      return NextResponse.json({ success: false, message: 'User is not registered. Please register first.' }, { status: 404 });
    }

    // Requirements: User is NOT allowed to login until email is verified (for email/password accounts)
    if (userRecord.email && !userRecord.emailVerified) {
      return NextResponse.json({ success: false, message: 'Account not verified. Please verify your email first.' }, { status: 403 });
    }

    // 2. Generate OTP (Stateless)
    // We do NOT store this in the DB anymore.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = 10 * 60 * 1000; // 10 minutes
    const expiresAt = Date.now() + ttl;

    // Create a signature to verify this OTP later
    // data = email + otp + expiry
    const data = `${cleanIdentifier}.${otp}.${expiresAt}`;
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');

    // Construct the full hash string to send to client: hash + expiry
    const fullHash = `${hash}.${expiresAt}`;

    // 3. Send OTP
    if (userRecord.email) {
      try {
        const emailResult = await sendOTPEmail(userRecord.email, otp);

        return NextResponse.json({
          success: true,
          message: `OTP sent to your email: ${userRecord.email.replace(/(.{2})(.*)(?=@)/, "$1***")}`,
          hash: fullHash,
          messageId: emailResult.messageId || null,
          isLoggedOnly: emailResult.isLoggedOnly || false
        });
      } catch (err) {
        console.error('Email sending failed:', err);
        return NextResponse.json({ success: false, message: 'Failed to send OTP to email.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'SMS OTP via backend is not configured. Please use Firebase Phone Auth on the frontend.'
    }, { status: 501 });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, message: 'Error sending OTP' }, { status: 500 });
  }
}
