import { query } from '@/lib/server/config/database';
import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { email } = body;
        const targetEmail = email?.toLowerCase().trim();

        if (!targetEmail) {
            return NextResponse.json({ message: 'Missing Email' }, { status: 400 });
        }

        // Check if user exists in FIREBASE only (Primary Auth Source)
        const { adminAuth } = await import('@/lib/server/config/firebase-admin');

        try {
            const firebaseUser = await adminAuth.getUserByEmail(targetEmail);

            return NextResponse.json({
                success: true,
                registered: true,
                emailVerified: firebaseUser.emailVerified,
                message: 'Email is registered.'
            });
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                return NextResponse.json({
                    success: false,
                    registered: false,
                    message: 'This email is not registered with us.'
                }, { status: 404 });
            }
            throw error;
        }

    } catch (error) {
        console.error('Error in check-email API:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
