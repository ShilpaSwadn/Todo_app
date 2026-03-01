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
            // Email flow: Check both Firebase and PostgreSQL
            try {
                const firebaseUser = await adminAuth.getUserByEmail(cleanIdentifier).catch(() => null);
                const dbUser = await User.findByEmail(cleanIdentifier);

                if (firebaseUser || dbUser) {
                    return NextResponse.json({
                        success: true,
                        exists: true,
                        emailVerified: firebaseUser?.emailVerified || false,
                        uid: firebaseUser?.uid || dbUser?.firebase_uid,
                        email: firebaseUser?.email || dbUser?.email,
                        displayName: firebaseUser?.displayName || `${dbUser?.first_name} ${dbUser?.last_name || ''}`.trim(),
                        mobileNumber: dbUser?.mobile_number || null // Crucial fix: return mobile number if in DB
                    });
                }
            } catch (e) {
                console.error('Email check error:', e);
            }
        } else {
            // Mobile Number flow: normalize first
            const digits = cleanIdentifier.replace(/\D/g, '');
            const normalizedMobile = cleanIdentifier.startsWith('+') ? cleanIdentifier : (digits.length === 10 ? `+91${digits}` : cleanIdentifier);

            // 1. Check PostgreSQL
            const user = await User.findByMobileNumber(identifier);

            if (user) {
                return NextResponse.json({
                    success: true,
                    exists: true,
                    isMobile: true,
                    email: user.email,
                    displayName: `${user.first_name} ${user.last_name || ''}`.trim(),
                    uid: user.firebase_uid
                });
            }

            // 2. Check Firestore (for users not yet synced to PostgreSQL)
            const { adminDb } = await import('@/lib/server/config/firebase-admin');

            const snap = await adminDb.collection('users')
                .where('mobileNumber', 'in', [normalizedMobile, identifier])
                .limit(1)
                .get();

            if (!snap.empty) {
                const doc = snap.docs[0];
                const data = doc.data();
                return NextResponse.json({
                    success: true,
                    exists: true,
                    isMobile: true,
                    email: data.email,
                    displayName: data.displayName || `${data.firstName} ${data.lastName || ''}`.trim(),
                    uid: doc.id
                });
            }

            // 3. Fallback: check Firebase Auth record directly
            let firebaseUser = null;
            try {
                firebaseUser = await adminAuth.getUserByPhoneNumber(normalizedMobile);
            } catch (e) {
                if (normalizedMobile !== cleanIdentifier) {
                    try {
                        firebaseUser = await adminAuth.getUserByPhoneNumber(cleanIdentifier);
                    } catch (e2) { }
                }
            }

            if (firebaseUser) {
                return NextResponse.json({
                    success: true,
                    exists: true,
                    isMobile: true,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    uid: firebaseUser.uid
                });
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
