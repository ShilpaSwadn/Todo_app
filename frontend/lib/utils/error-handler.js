/**
 * Formats technical Firebase error messages into user-friendly ones.
 * @param {Error|Object|string} error The error object or string from Firebase
 * @returns {string} A human-readable error message
 */
export const formatFirebaseError = (error) => {
    if (!error) return 'An unexpected error occurred. Please try again.';

    // Support both Error objects and string messages
    const errorStr = typeof error === 'string' ? error : (error.code || error.message || '');

    if (errorStr.includes('auth/provider-already-linked')) {
        return 'This mobile number is already linked to another account. Please use a different number.';
    }

    if (errorStr.includes('auth/credential-already-in-use')) {
        return 'This account or mobile number is already in use by another user.';
    }

    if (errorStr.includes('auth/email-already-in-use')) {
        return 'This email address is already registered. Please login instead.';
    }

    if (errorStr.includes('auth/invalid-verification-code')) {
        return 'The verification code you entered is incorrect. Please check and try again.';
    }

    if (errorStr.includes('auth/code-expired')) {
        return 'The verification code has expired. Please request a new one.';
    }

    if (errorStr.includes('auth/invalid-phone-number')) {
        return 'The phone number format is invalid. Please check the country code and digits.';
    }

    if (errorStr.includes('auth/too-many-requests')) {
        return 'Too many failed attempts. For your security, this account is temporarily locked. Please try again in 5-10 minutes.';
    }

    if (errorStr.includes('auth/network-request-failed')) {
        return 'A network error occurred. Please check your internet connection and try again.';
    }

    if (errorStr.includes('auth/user-not-found')) {
        return 'No account found with these details. Please register for a new account.';
    }

    if (errorStr.includes('auth/wrong-password')) {
        return 'Incorrect password. Please try again or use the "Forgot Password" option.';
    }

    if (errorStr.toLowerCase().includes('password is not set')) {
        return 'Your email is registered, but a password has not been set for this account. You can login through Google OAuth or OTP login instead.';
    }

    if (errorStr.includes('auth/invalid-email')) {
        return 'The email address provided is not valid. Please check for typos.';
    }

    if (errorStr.includes('auth/popup-closed-by-user')) {
        return 'The login popup was closed before completion. Please try again.';
    }

    if (errorStr.includes('auth/internal-error')) {
        return 'A system error occurred. Please refresh the page and try again.';
    }

    if (errorStr.includes('auth/invalid-app-credential')) {
        return 'The verification system had trouble confirming your session. Please try clicking the button again in 2 seconds.';
    }

    // --- Technical & Database Error Mapping ---
    if (errorStr.includes('null value in column "group_id"')) {
        return 'System Initialization Error: We had trouble setting up your workspace. Our team has been notified. Please try registering again in a few minutes.';
    }

    if (errorStr.includes('violates not-null constraint')) {
        return 'Data validation error: Some mandatory information is missing. Please refresh and try again.';
    }

    if (errorStr.includes('violates foreign key constraint')) {
        return 'System synchronization issue. Please try logging out and back in.';
    }

    if (errorStr.includes('relation') && errorStr.includes('does not exist')) {
        return 'System Maintenance: A required database table is currently being updated. Please try again shortly.';
    }

    // --- Handle unexpected technical errors ---
    // If it contains technical keywords or firebase internals, return a generic message
    const technicalKeywords = ['firebase', 'auth/', 'sql', 'column', 'table', 'relation', 'postgres', 'pool', 'connection', 'network', 'invalid-app-credential'];
    if (technicalKeywords.some(kw => errorStr.toLowerCase().includes(kw))) {
        // Only return if it wasn't caught by the specific user-friendly mappings above
        // Most common ones are caught above, but this is a final safety net
        return 'We ran into a system error. Please refresh the page and try again.';
    }

    // If it's a descriptive string that wasn't caught above, return it
    if (typeof error === 'string' && error.length > 0) return error;
    
    return (typeof error === 'object' ? error.message : error) || 'Something went wrong. Please try again.';
};
