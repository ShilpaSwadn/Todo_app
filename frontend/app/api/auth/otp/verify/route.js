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

    // 3. Find User in local PostgreSQL
    const localUser = await User.findByEmail(cleanIdentifier);
    if (!localUser) {
      return NextResponse.json({ success: false, message: 'No account found for this email.' }, { status: 404 });
    }

    // 4. Ensure user exists in Firebase Auth for token generation
    let firebaseUid = localUser.firebase_uid;
    if (!firebaseUid) {
      try {
        const userRecord = await adminAuth.getUserByEmail(cleanIdentifier);
        firebaseUid = userRecord.uid;
        await User.updateFirebaseUid(localUser.id, firebaseUid);
      } catch (e) {
        // Create in Firebase since we use it for Auth
        const newUser = await adminAuth.createUser({
          email: cleanIdentifier,
          displayName: `${localUser.first_name} ${localUser.last_name || ''}`.trim(),
          emailVerified: true // They just verified via OTP
        });
        firebaseUid = newUser.uid;
        await User.updateFirebaseUid(localUser.id, firebaseUid);
      }
    }

    // 5. Update local account status
    if (!localUser.account_active) {
      await User.updateAccountActive(localUser.id, true);
    }

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
