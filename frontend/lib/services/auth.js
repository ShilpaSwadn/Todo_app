import {
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithCustomToken,
  signInWithPhoneNumber,
  linkWithPhoneNumber
} from "firebase/auth";
import { auth, googleProvider, twitterProvider } from "../firebase";
import api from '@/lib/api/client'
import { saveAuthData, clearAuthData } from '@/lib/auth/client'

const ensureFirebase = () => {
  if (!auth) {
    throw new Error("Application configuration error. Please contact support.");
  }
};

/**
 * Sanitize phone number and ensure correct international format (E.164)
 * Format: +[country_code][subscriber_number] (e.g., +919876543210)
 * Handles missing +, extra spaces, dashes, and missing country codes.
 */
export const sanitizePhoneNumber = (number, country = { dialCode: '+91' }) => {
  if (!number) return '';

  // 1. Remove all non-digit characters (except + if it's at the start)
  let rawDigits = number.replace(/\D/g, '');

  // 2. If the user provided a number starting with +, prioritize that
  if (number.trim().startsWith('+')) {
    return '+' + rawDigits;
  }

  // 3. Check if the number already starts with the dial code digits (e.g. "919876...")
  const dialCodeDigits = country.dialCode.replace('+', '');
  if (rawDigits.startsWith(dialCodeDigits) && rawDigits.length > country.maxLength) {
    // It likely already has the country code
    return '+' + rawDigits;
  }

  // 4. Otherwise, prepend the selected country's dial code
  return country.dialCode + rawDigits;
};

// Login with Google OAuth
export const loginWithGoogle = async () => {
  ensureFirebase();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    console.log("Google Login Success:", user.email, "UID:", user.uid);

    // Check if user exists in our DB and has mobile
    try {
      const response = await api.post('/auth/check-status', {
        identifier: user.email.trim().toLowerCase()
      });

      if (response.success && response.exists && (response.hasMobile || user.phoneNumber)) {
        // Already exists and has a mobile number (either in DB or already in Firebase), proceed to sync
        const { userData, finalToken } = await handleAuthSync(user);
        saveAuthData(userData, finalToken);
        return { success: true, user: userData };
      }
    } catch (e) {
      console.warn("Check status failed during google login, possibly new user:", e.message);
    }

    // Either user doesn't exist in DB yet, or doesn't have a mobile number in both DB and Firebase
    // We need to collect and verify mobile number
    return { success: true, needsMobile: true };
  } catch (error) {
    console.error("Google Login Error:", error);
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, cancelled: true };
    }
    throw error;
  }
};

// Login with Twitter OAuth
export const loginWithTwitter = async () => {
  ensureFirebase();
  try {
    const result = await signInWithPopup(auth, twitterProvider);
    const user = result.user;

    console.log("Twitter Login Success:", user.email || user.uid);

    // Check if user has an email and check DB status
    if (user.email) {
      try {
        const response = await api.post('/auth/check-status', {
          identifier: user.email.trim().toLowerCase()
        });

        if (response.success && response.exists && (response.hasMobile || user.phoneNumber)) {
          // Already exists and verified, proceed to sync
          const { userData, finalToken } = await handleAuthSync(user);
          saveAuthData(userData, finalToken);
          return { success: true, user: userData };
        }
      } catch (e) {
        console.warn("Check status failed during twitter login:", e.message);
      }
    }

    // Twitter users often don't have email/phone, so we definitely want to collect details if missing
    return { success: true, needsMobile: true };
  } catch (error) {
    console.error("Twitter Login Error:", error);
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, cancelled: true };
    }
    if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error("An account already exists with the same email address but different sign-in credentials. Please login with Google or your password.");
    }
    throw error;
  }
};

// Register a new user using Backend API (Local DB first)
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Internal helper to sync user from Firebase to Postgres
const handleAuthSync = async (user) => {
  console.log("Synchronizing account status in Postgres...");
  let userData = {
    email: user.email,
    uid: user.uid,
    firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
    lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''
  };
  const idToken = await user.getIdToken();

  try {
    // login handles synchronization with PostgreSQL using the ID Token
    const response = await api.post('/auth/login', {
      idToken,
      profileData: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        mobileNumber: user.phoneNumber || null
      }
    });

    if (response.success) {
      userData = { ...userData, ...response.data.user };
      console.log("Account successfully synced.");
      return { userData, finalToken: idToken };
    } else {
      throw new Error(response.message || "Login synchronization failed.");
    }
  } catch (apiError) {
    console.error("Account Sync Error:", apiError);
    throw apiError;
  }
};

// Login user with password (Backend based)
export const loginWithPasswordDirect = async (identifier, password) => {
  ensureFirebase();
  try {
    const response = await api.post('/auth/login/email', {
      email: identifier,
      password
    });

    if (response.success && response.data) {
      // Backend returns a customToken in result.token (saved in cookie)
      // and user data in result.user.
      // We should also sign in to Firebase client-side to keep the session alive for other services if needed.
      const user = response.data.user;

      // If backend provided a token (it's in the cookie but we might need it for customToken signin)
      // Actually, my backend loginWithEmail returns result.token as the customToken.
      // Let's check authService.js loginWithEmail.
      // Yes: return { user: localUser, token: customToken };

      const customToken = response.data?.token || response.token;
      if (!customToken) {
        throw new Error("Authentication failed: Missing session token. Please try again.");
      }
      const userCredential = await signInWithCustomToken(auth, customToken);
      const finalUser = userCredential.user;
      const finalToken = await finalUser.getIdToken();

      saveAuthData(user, finalToken);
      return user;
    }

    throw new Error(response.message || "Login failed");
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};



// Explicitly sync a user to main table by email
export const syncByEmail = async (email) => {
  try {
    const response = await api.post('/auth/verify-sync', { email });
    return response;
  } catch (error) {
    throw error;
  }
};

// Global logout (Clears Firebase session and LocalStorage)
export const logout = async () => {
  try {
    ensureFirebase();
    // 1. Sign out from Firebase
    await signOut(auth);
  } catch (error) {
    console.warn("Firebase signout error:", error);
  } finally {
    // 2. Clear local storage regardless of Firebase success
    clearAuthData();
  }
}

// Get current authenticated user
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me')

    if (response.success && response.data) {
      return response.data.user
    }

    throw new Error(response.message || 'Failed to get user')
  } catch (error) {
    throw error
  }
}

// Update user profile
export const updateProfile = async (userData) => {
  try {
    const response = await api.put('/auth/profile', userData)

    if (response.success && response.data) {
      return response.data.user
    }

    throw new Error(response.message || 'Failed to update profile')
  } catch (error) {
    throw error
  }
}

/**
 * Setup Recaptcha for Phone Auth
 * @param {string} containerId - The ID of the HTML element to render Recaptcha in
 */
export const setupRecaptcha = async (containerId) => {
  ensureFirebase();

  // Clear any existing verifier first
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn("Clean up error:", e);
    }
  }

  try {
    const verifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': (response) => {
        console.log("reCAPTCHA verified automatically");
      },
      'expired-callback': () => {
        console.log("reCAPTCHA expired, clearing...");
        clearRecaptcha();
      }
    });

    // Settle delay: Firebase Phone Auth sometimes fails on first call if rendered too fast
    await new Promise(resolve => setTimeout(resolve, 500));

    // Explicitly render to ensure it's ready and catch domain issues early
    await verifier.render();
    window.recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.error("reCAPTCHA initialization failed:", error);
    if (error.code === 'auth/invalid-app-credential' || error.message?.includes('authorized domain')) {
      throw new Error("Security check failed: This domain is not authorized. Please add it in Firebase Console.");
    }
    throw new Error("Failed to initialize security check. Please refresh the page.");
  }
};

/**
 * Forcefully clear and reset reCAPTCHA
 */
export const clearRecaptcha = () => {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn("Error clearing recaptcha:", e);
    }
    window.recaptchaVerifier = null;
  }
};

// Send OTP to email
export const sendOTP = async (email) => {
  try {
    const response = await api.post('/auth/otp/send', { email })

    if (response.success) {
      // Returns { success: true, message: "...", hash: "..." }
      return response
    }

    throw new Error(response.message || 'Failed to send OTP')
  } catch (error) {
    throw error
  }
}

// Send OTP to Mobile (Firebase Client SDK)
export const sendMobileOTP = async (phoneNumber, appVerifier) => {
  ensureFirebase();
  try {
    // Note: PhoneNumber must include country code (e.g., +91...)
    console.log("Starting Firebase Phone Auth for:", phoneNumber);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    console.error("Error sending mobile OTP:", error);
    if (error.code === 'auth/invalid-app-credential') {
      throw new Error("Security configuration error. Please ensure this domain is added to 'Authorized Domains' in your Firebase console.");
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error("Too many attempts today. Please try again tomorrow or use email login.");
    }
    throw error;
  }
};

// Verify Mobile OTP
export const verifyMobileOTP = async (confirmationResult, otp) => {
  ensureFirebase();
  try {
    const result = await confirmationResult.confirm(otp);
    const user = result.user;

    // Sync user with PostgreSQL
    const { userData, finalToken } = await handleAuthSync(user);

    // Save auth data
    saveAuthData(userData, finalToken);

    return userData;
  } catch (error) {
    console.error("Verify Mobile OTP Error:", error);
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error("Invalid OTP code. Please check and try again.");
    }
    if (error.code === 'auth/code-expired') {
      throw new Error("OTP has expired. Please request a new one.");
    }
    throw new Error(error.message || "Failed to verify mobile OTP");
  }
};

// Send OTP to Mobile for Linking (Social Login Verification)
export const sendMobileLinkingOTP = async (phoneNumber, appVerifier) => {
  ensureFirebase();
  if (!auth.currentUser) throw new Error("Authentication session lost. Please try logging in again.");
  try {
    const confirmationResult = await linkWithPhoneNumber(auth.currentUser, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    if (error.code === 'auth/invalid-app-credential' || error.message?.includes('INVALID_APP_CREDENTIAL')) {
      console.warn("Invalid app credential error, retrying with fresh verifier...");
      try {
        // Wait slightly and try one more time - sometimes the first call is flaky
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await linkWithPhoneNumber(auth.currentUser, phoneNumber, appVerifier);
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        throw retryError;
      }
    }
    console.error("Error sending linking OTP:", error);
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error("Identity Provider Error: This mobile number is already linked to another account in the cloud. Please use a different number or delete the old account from the console.");
    }
    throw error;
  }
};

// Verify Mobile OTP and sync (for Linking flow)
export const verifyMobileLinkingOTP = async (confirmationResult, otp) => {
  ensureFirebase();
  try {
    const result = await confirmationResult.confirm(otp);
    const user = result.user;

    // Sync user with PostgreSQL
    const { userData, finalToken } = await handleAuthSync(user);

    // Save auth data
    saveAuthData(userData, finalToken);

    return userData;
  } catch (error) {
    console.error("Verify Linking OTP Error:", error);
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error("Invalid OTP code. Please check and try again.");
    }
    throw error;
  }
};

// Verify OTP and login
export const verifyOTP = async (email, otp, hash) => {
  ensureFirebase();
  try {
    const response = await api.post('/auth/otp/verify', { email, otp, hash });

    if (response.success && response.data && response.data.customToken) {
      // 1. Sign in to Firebase with the Custom Token
      const userCredential = await signInWithCustomToken(auth, response.data.customToken);
      const user = userCredential.user;

      console.log("OTP Login Success, syncing user:", user.uid);

      // 2. Sync user with PostgreSQL
      const { userData, finalToken } = await handleAuthSync(user);

      // 3. Save session
      saveAuthData(userData, finalToken);

      return userData;
    }

    throw new Error(response.message || 'Failed to verify OTP');
  } catch (error) {
    console.error("Verify OTP Error:", error);
    throw error;
  }
}

// Send password reset email
export const resetPassword = async (email) => {
  ensureFirebase();
  try {
    const targetEmail = email.trim().toLowerCase();

    // 1. Check if the email exists in our database first
    try {
      const checkResponse = await api.post('/auth/check-email', { email: targetEmail });
      if (!checkResponse.registered) {
        throw new Error("No account found with this email address. Please register for an account.");
      }
    } catch (apiError) {
      if (apiError.status === 404) {
        throw new Error("This email is not registered with us.");
      }
      // For other errors (500, etc), we might want to continue or log it
      console.warn("Check email API failed, proceeding with Firebase check:", apiError);
    }

    // 2. If it exists (or check failed but we want to try), send Firebase reset link
    await sendPasswordResetEmail(auth, targetEmail);
    return {
      success: true,
      message: "Password reset link has been sent to your email."
    };
  } catch (error) {
    console.error("Password reset error:", error);
    if (error.code === 'auth/user-not-found' || error.message.includes("not registered")) {
      throw new Error("No account found with this email address. Please register first.");
    }
    throw error;
  }
}

// Resend email verification link
export const resendVerificationEmail = async (email) => {
  try {
    const response = await api.post('/auth/resend-verification', { email });
    return response;
  } catch (error) {
    console.error("Resend verification error:", error);
    throw error;
  }
}

