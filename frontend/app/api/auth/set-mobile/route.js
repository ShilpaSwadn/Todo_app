import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/server/config/firebase-admin';
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

        if (!userEmail) {
            return NextResponse.json({ success: false, message: 'User email is required for this operation' }, { status: 400 });
        }

        // 2. Check Composite Uniqueness in Firestore (Email + Phone)
        const combinationId = `${userEmail.toLowerCase()}_${formattedPhone}`;
        const combinationRef = adminDb.collection('user_combinations').doc(combinationId);
        const combinationSnap = await combinationRef.get();

        if (combinationSnap.exists && combinationSnap.data().uid !== uid) {
            return NextResponse.json({
                success: false,
                message: 'This combination of email and mobile number is already registered by another account.'
            }, { status: 400 });
        }

        // 3. Atomically update Firestore
        try {
            const batch = adminDb.batch();

            // Set the combination lock
            batch.set(combinationRef, {
                email: userEmail.toLowerCase(),
                mobileNumber: formattedPhone,
                uid: uid,
                updatedAt: new Date()
            });

            // Update user profile in Firestore
            const userRef = adminDb.collection('users').doc(uid);
            batch.set(userRef, {
                mobileNumber: formattedPhone,
                updatedAt: new Date()
            }, { merge: true });

            await batch.commit();
        } catch (fsError) {
            console.error('Firestore update error:', fsError);
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

        // 3. Skip setting global phoneNumber in Firebase Auth
        // We skip this because Firebase Auth enforces global uniqueness on phoneNumber,
        // which would prevent reusing the same mobile number with different emails.
        // The composite uniqueness (email + phone) is now handled in Firestore.

        return NextResponse.json({
            success: true,
            message: 'User data synced with profile'
        });
    } catch (error) {
        console.error('Set mobile error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Error updating metadata'
        }, { status: 400 });
    }
}

