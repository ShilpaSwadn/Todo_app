import { adminAuth } from '../config/firebase-admin.js';

/**
 * Extracts and verifies Firebase UID from the Authorization header or token cookie
 * @param {Request} request 
 * @returns {Promise<string|null>} uid or null
 */
export async function getUidFromToken(request) {
    try {
        let token = null;

        // 1. Check Authorization header
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split('Bearer ')[1];
        }

        // 2. Fallback to cookie (for SSR or if header is missing)
        if (!token) {
            // Next.js standard Request has .cookies
            const cookieValue = request.cookies.get('token');
            if (cookieValue) {
                token = typeof cookieValue === 'object' ? cookieValue.value : cookieValue;
            }
        }

        if (!token) {
            console.warn('No authentication token found in request');
            return null;
        }

        // 3. Verify Firebase ID Token
        const decodedToken = await adminAuth.verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('getUidFromToken Error:', error.message);
        return null;
    }
}
