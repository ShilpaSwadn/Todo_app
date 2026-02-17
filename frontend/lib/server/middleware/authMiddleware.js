import { adminAuth } from '../config/firebase-admin.js';

/**
 * Extracts and verifies Firebase UID from the Authorization header
 * @param {Request} request 
 * @returns {Promise<string|null>} uid or null
 */
export async function getUidFromToken(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn('No Bearer token found in Authorization header');
            return null;
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('getUidFromToken Error:', error.message);
        return null;
    }
}
