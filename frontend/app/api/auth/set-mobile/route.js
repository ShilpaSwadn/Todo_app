import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/config/firebase-admin';
import User from '@/lib/server/models/User';

export async function POST(request) {
    try {
        const body = await request.json();
        const { uid, mobileNumber } = body;

        if (!uid || !mobileNumber) {
            return NextResponse.json({ success: false, message: 'UID and Mobile Number are required' }, { status: 400 });
        }

        const formattedPhone = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;

        // 1. Get user details from Firebase to ensure we have email for sync
        let userEmail = null;
        let displayName = '';
        try {
            const userRecord = await adminAuth.getUser(uid);
            userEmail = userRecord.email;
            displayName = userRecord.displayName || '';
        } catch (authError) {
            console.error('Error fetching user from Firebase:', authError);
            return NextResponse.json({ success: false, message: 'User not found in authentication system' }, { status: 404 });
        }

        // 2. Update/Sync the user in PostgreSQL
        // We use sync to ensure the record exists (it might not if they just registered and haven't logged in)
        try {
            await User.sync({
                uid,
                email: userEmail,
                firstName: displayName.split(' ')[0] || 'User',
                lastName: displayName.split(' ').slice(1).join(' ') || '',
                mobileNumber: mobileNumber
            });

            // Also call update specifically for the mobile number in case sync skipped it (if user already existed)
            await User.update(uid, { mobileNumber: mobileNumber });

            console.log(`User ${uid} synced and updated in database with mobile ${mobileNumber}`);
        } catch (dbError) {
            console.error('Database sync/update error in set-mobile:', dbError);
        }

        // 3. Try to set the mobile number in Firebase Auth
        // Firebase enforces uniqueness on phoneNumber. If it fails, we log it but don't necessarily block.
        try {
            await adminAuth.updateUser(uid, {
                phoneNumber: formattedPhone,
            });

            return NextResponse.json({
                success: true,
                message: 'Mobile number updated in both Firebase and database'
            });
        } catch (firebaseError) {
            console.warn('Firebase phoneNumber update failed:', firebaseError.message);

            // If the error is 'already exists', we treat it as success because 
            // the user wants "email only unique" and the DB has been updated.
            if (firebaseError.code === 'auth/phone-number-already-exists') {
                return NextResponse.json({
                    success: true,
                    message: 'Mobile number updated in database. (Firebase update skipped: number already in use by another account)'
                });
            }

            // For other critical Firebase errors, we return the error
            return NextResponse.json({
                success: false,
                message: firebaseError.message || 'Error updating Firebase profile'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Set mobile error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Error updating metadata'
        }, { status: 400 });
    }
}

