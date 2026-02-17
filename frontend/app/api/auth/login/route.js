import { NextResponse } from 'next/server';
import authService from '@/lib/server/services/authService.js';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';

export async function POST(request) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { idToken, profileData } = body;

    if (!idToken) {
      return NextResponse.json({ success: false, message: 'ID Token is required' }, { status: 400 });
    }

    // 1. Verify the Firebase ID Token
    const decodedToken = await authService.verifyFirebaseToken(idToken);

    // 2. Synchronize user with PostgreSQL (only after verified login)
    const user = await authService.syncUser(decodedToken, profileData);

    return NextResponse.json({
      success: true,
      message: 'Login and synchronization successful',
      data: { user }
    });
  } catch (error) {
    console.error('Login/Sync error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Error processing login'
    }, { status: 401 });
  }
}
