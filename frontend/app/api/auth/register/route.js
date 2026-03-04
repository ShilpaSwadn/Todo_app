import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin';
import authService from '@/lib/server/services/authService.js';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';

export async function POST(request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { email, password, firstName, lastName, mobileNumber } = body;

    // Register in local database ONLY
    const user = await authService.register({
      email,
      password,
      firstName,
      lastName,
      mobileNumber
    });

    return NextResponse.json({
      success: true,
      message: 'Activation link has been sent to your email. Verify and login',
      data: { user }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Error during registration'
    }, { status: 400 });
  }
}
