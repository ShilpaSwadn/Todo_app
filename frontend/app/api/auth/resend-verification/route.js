import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin';
import { sendVerificationEmail } from '@/lib/server/services/emailService';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 1. Check if user exists in Firebase
        try {
            const userRecord = await adminAuth.getUserByEmail(cleanEmail);

            if (userRecord.emailVerified) {
                return NextResponse.json({
                    success: false,
                    message: 'Account is already verified. Please login.'
                }, { status: 400 });
            }

            // 2. Generate verification link
            const link = await adminAuth.generateEmailVerificationLink(cleanEmail);

            // 3. Send email
            await sendVerificationEmail(cleanEmail, link);

            return NextResponse.json({
                success: true,
                message: 'New verification link has been sent to your email.'
            });

        } catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                return NextResponse.json({
                    success: false,
                    message: 'No account found with this email. Please register first.'
                }, { status: 404 });
            }
            throw authError;
        }

    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Error resending verification email'
        }, { status: 500 });
    }
}
