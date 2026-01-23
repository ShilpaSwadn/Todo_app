import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../firebase";
import api from '../api/client'
import { saveAuthData } from '../auth/client'

const ensureFirebase = () => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please ensure your .env.local has the correct credentials.");
  }
};

// Register a new user using Firebase and send activation link
export const register = async (userData) => {
  ensureFirebase();
  const { firstName, lastName, email, mobileNumber, password } = userData;

  try {
    console.log("Starting Firebase registration for:", email);

    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User created in Auth successfully:", user.uid);

    // 2. Send verification email
    console.log("Sending verification email...");
    try {
      // Point activation link to our custom verify page
      const actionCodeSettings = {
        url: `${window.location.origin}/verify`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
      console.log("Verification email sent successfully with custom link.");
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
    }

    // 3. Store in Postgres temp_users via API
    console.log("Storing user data in Postgres temp_users...");
    try {
      const response = await api.post('/auth/temp-user', {
        uid: user.uid,
        email,
        firstName,
        lastName,
        mobileNumber
      });

      console.log("User stored in Postgres temp_users successfully.");
    } catch (apiError) {
      console.error("Failed to connect to Postgres API:", apiError);
    }

    return {
      message: "Activation link has been sent to your mail. Please check your inbox.",
      success: true
    };
  } catch (error) {
    console.error("Registration main process error:", error);
    throw error;
  }
}

// Internal helper to sync user from Firebase to Postgres
const handleAuthSync = async (user) => {
  console.log("Synchronizing account status in Postgres...");
  let userData = {
    email: user.email,
    uid: user.uid,
    firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
    lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''
  };
  let finalToken = await user.getIdToken();

  try {
    // sync-main handles promotion from temp_users -> users
    // and also handles first-time social login creation
    const response = await api.post('/auth/sync-main', {
      uid: user.uid,
      email: user.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isSocial: !!user.providerData.find(p => p.providerId === 'google.com')
    });

    if (response.success) {
      userData = { ...userData, ...response.user };
      if (response.token) {
        finalToken = response.token;
        console.log("Account successfully synced in Postgres.");
      }
      return { userData, finalToken };
    } else {
      throw new Error(response.message || "Email not verified. Please verify your email first.");
    }
  } catch (apiError) {
    console.error("Postgres Synchronization Error:", apiError);
    // If it's a 404 and not social, it means user missed the verification step
    throw new Error(apiError.message || "Email not verified. Please verify your email first.");
  }
};

// Login user with password (Firebase based)
export const loginWithPassword = async (email, password, autoSave = true) => {
  ensureFirebase();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Pull latest verification status from Firebase
    await user.reload();

    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error("Email not verified. Please verify your email first.");
    }

    // Format user data from Firebase
    const firebaseUserData = {
      uid: user.uid,
      email: user.email,
      firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
      lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''
    };

    // Trigger the combined sync/OTP process in one API call
    const response = await prepareLogin(firebaseUserData);

    return response.user || firebaseUserData;
  } catch (error) {
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error("Invalid email or password.");
    }
    throw error;
  }
};

// Prepare login by syncing user and sending OTP in one go
export const prepareLogin = async (userData) => {
  try {
    const response = await api.post('/auth/login-prepare', userData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Explicitly sync a user from temp to main table by uid
export const syncMain = async (uid) => {
  try {
    const response = await api.post('/auth/sync-main', { uid });
    return response;
  } catch (error) {
    throw error;
  }
};

// Explicitly sync a user from temp to main table by email
export const syncMainByEmail = async (email) => {
  try {
    const response = await api.post('/auth/sync-main', { email });
    return response;
  } catch (error) {
    throw error;
  }
};

// Login user (legacy/OTP placeholder)
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials)

    if (response.success && response.data) {
      // Save user and token
      saveAuthData(response.data.user, response.data.token)
      return response.data
    }

    throw new Error(response.message || 'Login failed')
  } catch (error) {
    throw error
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

// Send OTP to email
export const sendOTP = async (email) => {
  try {
    const response = await api.post('/auth/otp/send', { email })

    if (response.success) {
      return response
    }

    throw new Error(response.message || 'Failed to send OTP')
  } catch (error) {
    throw error
  }
}

// Verify OTP and login
export const verifyOTP = async (email, otp) => {
  try {
    const response = await api.post('/auth/otp/verify', { email, otp })

    if (response.success && response.data) {
      // Save user and token
      saveAuthData(response.data.user, response.data.token)
      return response.data
    }

    throw new Error(response.message || 'Failed to verify OTP')
  } catch (error) {
    throw error
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
        throw new Error("No account found with this email address.");
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
      throw new Error("No account found with this email address.");
    }
    throw error;
  }
}
