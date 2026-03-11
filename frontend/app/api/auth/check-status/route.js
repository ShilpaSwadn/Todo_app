import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin';
import User from '@/lib/server/models/User';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { identifier } = body;

        if (!identifier) {
            return NextResponse.json({ success: false, message: 'Identifier is required' }, { status: 400 });
        }

        const cleanIdentifier = identifier.trim().toLowerCase();
        const isEmail = cleanIdentifier.includes('@');

        if (isEmail) {
            // Email flow: Check Firebase exclusively for account status and providers
            try {
                const firebaseUser = await adminAuth.getUserByEmail(cleanIdentifier);

                // Identify providers to see if it's a social account (Google/Twitter)
                const providers = firebaseUser.providerData.map(p => p.providerId);
                const isSocial = providers.includes('google.com') || providers.includes('twitter.com');

                return NextResponse.json({
                    success: true,
                    exists: true,
                    emailVerified: firebaseUser.emailVerified,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    hasMobile: !!firebaseUser.phoneNumber,
                    isSocial: isSocial,
                    providers: providers
                });
            } catch (error) {
                if (error.code !== 'auth/user-not-found') throw error;
            }
        } else {
            // Mobile Number flow: normalize and check Firebase
            const digits = cleanIdentifier.replace(/\D/g, '');
            const normalizedMobile = cleanIdentifier.startsWith('+') ? cleanIdentifier : (digits.length === 10 ? `+91${digits}` : `+${digits}`);

            try {
                const firebaseUser = await adminAuth.getUserByPhoneNumber(normalizedMobile);
                return NextResponse.json({
                    success: true,
                    exists: true,
                    isMobile: true,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    uid: firebaseUser.uid,
                    hasMobile: true
                });
            } catch (error) {
                if (error.code !== 'auth/user-not-found' && error.code !== 'auth/invalid-phone-number') throw error;
            }
        }

        return NextResponse.json({
            success: true,
            exists: false
        });

    } catch (error) {
        console.error('Check Status Error:', error);
        return NextResponse.json({
            success: false,
            message: 'Error checking user status'
        }, { status: 500 });
    }
}
