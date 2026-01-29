import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import api from '../api/client'
import { saveAuthData, clearAuthData } from '../auth/client'

const ensureFirebase = () => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please ensure your .env.local has the correct credentials.");
  }
};

// Login with Google OAuth
export const loginWithGoogle = async () => {
  ensureFirebase();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    console.log("Google Login Success:", user.email, "Verified:", user.emailVerified);

    // If Google says email is verified, sync directly to main table
    if (user.emailVerified) {
      const { userData, finalToken } = await handleAuthSync(user);
      saveAuthData(userData, finalToken);
      return { success: true, user: userData, verified: true };
    } else {
      // If not verified (rare for Google but possible), store in temp and send verification
      console.log("Google email not verified, sending verification link...");

      const actionCodeSettings = {
        url: `${window.location.origin}/verify`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);

      // Store in temp_users
      await api.post('/auth/temp-user', {
        uid: user.uid,
        email: user.email,
        firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
        profilePicture: user.photoURL,
        mobileNumber: '' // Google doesn't provide mobile by default
      });

      return {
        success: true,
        verified: false,
        message: "Your Google email is not verified. We've sent an activation link to your inbox."
      };
    }
  } catch (error) {
    console.error("Google Login Error:", error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancelled. Please try again.");
    }
    throw error;
  }
};

// Register a new user using Firebase and send activation link
export const register = async (userData) => {
  ensureFirebase();
  const { firstName, lastName, email, mobileNumber, password } = userData;

  try {
    // 0. Check if email or mobile already exists in our DB (verified or temp)
    console.log("Checking uniqueness for:", email, mobileNumber);

    // Check Email
    const emailStatus = await checkUserStatus(email);
    if (emailStatus.exists) {
      throw new Error("This email is already registered. Please login instead.");
    }

    // Check Mobile
    const mobileStatus = await checkUserStatus(mobileNumber);
    if (mobileStatus.exists) {
      throw new Error("This mobile number is already registered. Please use a different number.");
    }

    console.log("Starting Firebase registration for:", email);

    let user;
    try {
      // 1. Try to create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log("User created in Auth successfully:", user.uid);
    } catch (createError) {
      if (createError.code === 'auth/email-already-in-use') {
        console.log("User already exists in Firebase, checking verification status...");
        // If user exists, we'll try to sign them in to get the user object
        // and check if they need a re-verification email.
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } catch (loginError) {
          throw new Error("This email is already registered in our Firebase project. " +
            "If this is you, please try to login or reset your password.");
        }
      } else {
        throw createError;
      }
    }

    // 2. If user is already verified, we should just tell them to login
    if (user.emailVerified) {
      // Try to store in Postgres just in case they aren't there yet
      try {
        await api.post('/auth/temp-user', {
          uid: user.uid,
          email,
          firstName,
          lastName,
          mobileNumber
        });
      } catch (e) { }
      throw new Error("Your email is already verified. Please go to the login page.");
    }

    // 3. Send verification email
    console.log("Sending verification email to:", email);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/verify`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
      console.log("Verification email sent successfully.");
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      throw new Error("We couldn't send the activation link. " +
        (emailError.code === 'auth/unauthorized-continue-uri'
          ? "Domain not authorized in Firebase Console."
          : emailError.message));
    }

    // 4. Store in Postgres temp_users via API
    console.log("Ensuring user data is in Postgres temp_users...");
    try {
      await api.post('/auth/temp-user', {
        uid: user.uid,
        email,
        firstName,
        lastName,
        mobileNumber
      });
    } catch (apiError) {
      console.error("Postgres Sync Error (Non-critical):", apiError);
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
      profilePicture: user.photoURL,
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

// Login user with password (Firebase based) - Direct login without OTP
export const loginWithPasswordDirect = async (identifier, password) => {
  ensureFirebase();
  try {
    let targetEmail = identifier;

    // If it's not an email, assume it's a mobile number and try to find the email
    if (!identifier.includes('@')) {
      try {
        const response = await api.post('/auth/check-status', { identifier });
        if (response.success && response.exists && response.email) {
          targetEmail = response.email;
        } else {
          throw new Error("No account found with this mobile number.");
        }
      } catch (e) {
        throw new Error(e.message || "Failed to resolve mobile number to email.");
      }
    }

    const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
    const user = userCredential.user;

    // Pull latest verification status from Firebase
    await user.reload();

    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error("Email not verified. Please verify your email first.");
    }

    // Sync user and get token
    const { userData, finalToken } = await handleAuthSync(user);

    // Save auth data
    saveAuthData(userData, finalToken);

    return userData;
  } catch (error) {
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error("Invalid email/mobile or password.");
    }
    throw error;
  }
};

// Login user with password (Firebase based) - Legacy/OTP version
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
// Check user status (exists, verified, etc.)
export const checkUserStatus = async (identifier) => {
  try {
    const response = await api.post('/auth/check-status', { identifier });
    return response;
  } catch (error) {
    console.error("Check user status error:", error);
    return { success: false, exists: false };
  }
}
