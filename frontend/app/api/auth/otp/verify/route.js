import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin.js';
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
    // Recompute signature: data = email + otp + expiry
    const data = `${cleanIdentifier}.${otp}.${expiresAt}`;
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const computedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

    if (hash !== computedHash) {
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 401 });
    }

    // 3. Find User in Firebase
    let userRecord;
    try {
      if (cleanIdentifier.includes('@')) {
        userRecord = await adminAuth.getUserByEmail(cleanIdentifier);
      } else {
        try {
          userRecord = await adminAuth.getUserByPhoneNumber(cleanIdentifier);
        } catch (e) {
          userRecord = await adminAuth.getUserByPhoneNumber(`+91${cleanIdentifier}`);
        }
      }
    } catch (e) {
      return NextResponse.json({ success: false, message: 'No account found in Firebase for this identifier.' }, { status: 404 });
    }

    // 4. Create Firebase Custom Token
    const customToken = await authService.createCustomToken(userRecord.uid);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
      data: {
        customToken,
        uid: userRecord.uid
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ success: false, message: 'Error verifying OTP' }, { status: 500 });
  }
}
