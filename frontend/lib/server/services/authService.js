import User from '../models/User.js';
import { adminAuth } from '../config/firebase-admin.js';
// Service for handling authentication logic with Firebase and PostgreSQL

class AuthService {
  /**
   * Verifies Firebase ID Token
   */
  async verifyFirebaseToken(token) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      throw new Error('Invalid or expired session');
    }
  }

  /**
   * Register a new user.
   * Creates user in Firebase Auth and profile in PostgreSQL.
   */
  async register(userData) {
    const { email, password, firstName, lastName, mobileNumber } = userData;

    // 1. Check uniqueness
    await this.checkUniqueness(email, mobileNumber);

    // 2. Create in Firebase Auth
    // Note: We don't pass phoneNumber here because Firebase enforces global uniqueness on it.
    // Our application allows multiple accounts per mobile number (each with a unique email).
    const cleanedMobile = mobileNumber ? (mobileNumber.startsWith('+') ? mobileNumber : (mobileNumber.length === 10 ? `+91${mobileNumber}` : `+${mobileNumber}`)).replace(/\s/g, '') : null;

    const firebaseUser = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName || ''}`.trim(),
      phoneNumber: cleanedMobile // Enforce uniqueness in Firebase Auth as well
    });

    // 3. Create in local database (PostgreSQL)
    const user = await User.create({
      email,
      firstName,
      lastName,
      mobileNumber,
      firebaseUid: firebaseUser.uid
    });

    // 4. Send Verification Email (Magic Link)
    try {
      const { sendVerificationEmail } = await import('../services/emailService.js');
      const link = await adminAuth.generateEmailVerificationLink(email);
      await sendVerificationEmail(email, link);
    } catch (emailError) {
      console.warn('User created but verification email failed to send:', emailError);
      // We don't throw here so the user can see the "Success" screen and try the resend button
    }

    return this.formatUser(user);
  }

  /**
   * Synchronizes Firebase user with local database.
   * Only called after successful token verification (from Social or OTP login).
   */
  async syncUser(tokenData, profileData = {}) {
    const { uid, email, phone_number, name } = tokenData;

    // Synchronize with PostgreSQL
    const userData = {
      uid,
      email: email || '',
      firstName: profileData.firstName || name?.split(' ')[0] || 'User',
      lastName: profileData.lastName || name?.split(' ').slice(1).join(' ') || null,
      mobileNumber: profileData.mobileNumber || phone_number || null
    };

    const user = await User.sync(userData);

    return this.formatUser(user);
  }

  /**
   * Login with Email and Password
   * Uses Firebase REST API because Admin SDK doesn't support password check.
   */
  async loginWithEmail(email, password) {
    try {
      // 1. Verify if the email actually exists first to provide a friendly "needs-registration" error
      try {
        await adminAuth.getUserByEmail(email.toLowerCase().trim());
      } catch (fbError) {
        if (fbError.code === 'auth/user-not-found') {
          throw new Error('No account found for this email address in our authentication system. Please register first.');
        }
      }

      // 2. Authenticate with Firebase using REST API
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.message === 'INVALID_LOGIN_CREDENTIALS' || data.error?.message === 'INVALID_PASSWORD') {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw new Error(data.error?.message || 'Authentication failed');
      }

      // 2. Verify the ID Token and sync/get user from PG
      const decodedToken = await this.verifyFirebaseToken(data.idToken);

      // Enforce email verification for password login
      if (!decodedToken.email_verified) {
        throw new Error('Please verify your email address to continue. Check your inbox for the magic link.');
      }

      const user = await this.syncUser(decodedToken);

      // 3. Generate a Custom Token for the client
      const customToken = await this.createCustomToken(user.firebaseUid);

      return {
        user,
        token: customToken
      };
    } catch (error) {
      console.error('Error in loginWithEmail:', error);
      throw error;
    }
  }

  /**
   * Login with Mobile Number and Password
   */
  async loginWithMobile(mobileNumber, password) {
    try {
      // 1. Identify the user by mobile number in FIREBASE (primary source of truth)
      // Clean mobile number for Firebase search
      const cleanedMobile = (mobileNumber.startsWith('+') ? mobileNumber : (mobileNumber.length === 10 ? `+91${mobileNumber}` : `+${mobileNumber}`)).replace(/\s/g, '');

      let firebaseUser;
      try {
        firebaseUser = await adminAuth.getUserByPhoneNumber(cleanedMobile);
      } catch (fbError) {
        if (fbError.code === 'auth/user-not-found') {
          throw new Error('No account found for this mobile number in our authentication system. Please register first.');
        }
        throw fbError;
      }

      if (!firebaseUser.email) {
        throw new Error('This mobile account has no associated email for password login. Please try OTP login or link an email first.');
      }

      // 2. Use the same logic as loginWithEmail
      return await this.loginWithEmail(firebaseUser.email, password);
    } catch (error) {
      console.error('Error in loginWithMobile:', error);
      throw error;
    }
  }

  /**
   * Check uniqueness in both Firebase and PostgreSQL
   */
  async checkUniqueness(email, mobileNumber) {
    // 1. Check Firebase for Email
    if (email) {
      try {
        await adminAuth.getUserByEmail(email.toLowerCase().trim());
        throw new Error('Email already registered in our authentication system.');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }

    // 2. Check Firebase for Mobile Number
    if (mobileNumber) {
      try {
        const cleanedMobile = (mobileNumber.startsWith('+') ? mobileNumber : (mobileNumber.length === 10 ? `+91${mobileNumber}` : `+${mobileNumber}`)).replace(/\s/g, '');
        await adminAuth.getUserByPhoneNumber(cleanedMobile);
        throw new Error('Mobile number already registered in our authentication system.');
      } catch (error) {
        if (error.code !== 'auth/user-not-found' && error.code !== 'auth/invalid-phone-number') throw error;
      }
    }

    // Note: We skip PostgreSQL checks here to treat Firebase as the primary identity source.
    // User.sync will handle merging or creating records in DB post-authentication.
    return true;
  }

  /**
   * Helper to format database user to frontend user
   */
  formatUser(user) {
    if (!user) return null;
    return {
      id: user.id || null,
      firebaseUid: user.firebase_uid || null,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      mobileNumber: user.mobile_number || '',
      languagePreference: user.language_preference || 'en',
      timeZone: user.time_zone || 'UTC',
      accountActive: !!user.account_active,
      profileData: user.profile_data || {},
      createdAt: user.created_at || null,
      updatedAt: user.updated_at || null
    };
  }

  /**
   * Fetches a user from PostgreSQL by Firebase UID.
   */
  async getUserByUid(uid) {
    const user = await User.findByFirebaseUid(uid);
    if (!user) {
      throw new Error('User not found');
    }
    return this.formatUser(user);
  }

  async updateProfile(uid, updates) {
    // If they are adding an email or mobile number, ensure uniqueness and update Firebase Auth natively
    if (updates.email || updates.mobileNumber) {
      const firebaseUpdates = {};

      if (updates.email) {
        await this.checkUniqueness(updates.email, null);
        firebaseUpdates.email = updates.email.toLowerCase().trim();
      }

      if (updates.mobileNumber) {
        const cleanedMobile = (updates.mobileNumber.startsWith('+') ? updates.mobileNumber : (updates.mobileNumber.length === 10 ? `+91${updates.mobileNumber}` : `+${updates.mobileNumber}`)).replace(/\s/g, '');
        await this.checkUniqueness(null, cleanedMobile);
        firebaseUpdates.phoneNumber = cleanedMobile;
      }

      try {
        await adminAuth.updateUser(uid, firebaseUpdates);
      } catch (fbErr) {
        if (fbErr.code === 'auth/email-already-exists') throw new Error('Email already registered');
        if (fbErr.code === 'auth/phone-number-already-exists') throw new Error('Mobile number already registered');
        throw fbErr;
      }
    }

    const user = await User.update(uid, updates);
    if (!user) {
      throw new Error('User not found');
    }
    return this.formatUser(user);
  }


  /**
   * Generates a Firebase Custom Token for a user UID.
   */
  async createCustomToken(uid) {
    try {
      const customToken = await adminAuth.createCustomToken(uid);
      return customToken;
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw new Error('Could not generate authentication session');
    }
  }
}

export default new AuthService();
