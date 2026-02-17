import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin';

export async function POST(request) {
    try {
        const body = await request.json();
        const { identifier } = body;

        if (!identifier) {
            return NextResponse.json({ success: false, message: 'Identifier is required' }, { status: 400 });
        }

        let userRecord = null;
        try {
            if (identifier.includes('@')) {
                userRecord = await adminAuth.getUserByEmail(identifier.toLowerCase());
            } else {
                // Try raw
                try {
                    userRecord = await adminAuth.getUserByPhoneNumber(identifier);
                } catch (e) {
                    // Try with +91 if not present
                    if (!identifier.startsWith('+')) {
                        userRecord = await adminAuth.getUserByPhoneNumber(`+91${identifier}`);
                    }
                }
            }
        } catch (e) {
            // User not found in any format
        }

        if (userRecord) {
            return NextResponse.json({
                success: true,
                exists: true,
                emailVerified: userRecord.emailVerified,
                uid: userRecord.uid,
                email: userRecord.email,
                mobileNumber: userRecord.phoneNumber,
                displayName: userRecord.displayName
            });
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
