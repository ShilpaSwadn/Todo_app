import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin.js';
import User from '@/lib/server/models/User.js';
import authService from '@/lib/server/services/authService.js';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email: identifier, otp, hash: fullHash } = body;

    if (!identifier || !otp || !fullHash) {
      return NextResponse.json({ success: false, message: 'Identifier, OTP and Hash are required' }, { status: 400 });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // 1. Split hash and expiry (format: hash.expiresAt)
    const [hash, expiresAt] = fullHash.split('.');

    // Check if expired
    const now = Date.now();
    if (now > parseInt(expiresAt)) {
      return NextResponse.json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 401 });
    }

    // 2. Verify Hash (Stateless)
    const data = `${cleanIdentifier}.${otp}.${expiresAt}`;
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const computedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

    if (hash !== computedHash) {
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 401 });
    }

    // 3. Find User in FIREBASE (Primary Source of Truth)
    let firebaseUser = null;
    try {
      firebaseUser = await adminAuth.getUserByEmail(cleanIdentifier);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ success: false, message: 'We couldn\'t find an account with this email. Would you like to Register?' }, { status: 404 });
      }
      throw error;
    }

    const firebaseUid = firebaseUser.uid;

    // 4. Synchronize with local PostgreSQL (ensure profile exists)
    // syncUser handles both creating if missing and updating if existing
    const localUser = await authService.syncUser({
      uid: firebaseUid,
      email: firebaseUser.email,
      email_verified: true, // They just verified via OTP
      name: firebaseUser.displayName
    });

    // 6. Create Firebase Custom Token
    const customToken = await authService.createCustomToken(firebaseUid);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
      data: {
        customToken,
        uid: firebaseUid
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ success: false, message: 'Error verifying OTP' }, { status: 500 });
  }
}
