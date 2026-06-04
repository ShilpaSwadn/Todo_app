import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
            throw new Error('FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL is missing');
        }
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error.stack || error.message);
    }
}

const adminAuth = admin.apps.length ? admin.auth() : null;
const adminDb = admin.apps.length ? admin.firestore() : null;

export { adminAuth, adminDb };
