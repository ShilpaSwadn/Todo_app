import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin';

export async function POST(request) {
    try {
        const body = await request.json();
        const { uid, mobileNumber } = body;

        if (!uid || !mobileNumber) {
            return NextResponse.json({ success: false, message: 'UID and Mobile Number are required' }, { status: 400 });
        }

        // Set the mobile number as a custom claim or update the user record
        // Note: phoneNumber in Firebase Auth requires E.164 format and uniqueness.
        await adminAuth.updateUser(uid, {
            phoneNumber: mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`,
        });

        return NextResponse.json({
            success: true,
            message: 'Mobile number updated in Firebase'
        });
    } catch (error) {
        console.error('Set mobile error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Error updating metadata'
        }, { status: 400 });
    }
}
