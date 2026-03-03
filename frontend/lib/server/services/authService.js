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
    const firebaseUser = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName || ''}`.trim(),
      phoneNumber: mobileNumber // Enforce uniqueness in Firebase Auth as well
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

    return user;
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

    return user;
  }

  /**
   * Login with Email and Password
   * Uses Firebase REST API because Admin SDK doesn't support password check.
   */
  async loginWithEmail(email, password) {
    try {
      // 1. Authenticate with Firebase using REST API
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
      const customToken = await this.createCustomToken(user.firebase_uid);

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
      // 1. Identify the user by mobile number in PG (picks the first registered)
      const primaryUser = await User.findByMobileNumber(mobileNumber);

      if (!primaryUser) {
        throw new Error('No account found for this mobile number. Please register first.');
      }

      if (!primaryUser.email) {
        throw new Error('This mobile account has no associated email for password login.');
      }

      // 2. Use the same logic as loginWithEmail
      return await this.loginWithEmail(primaryUser.email, password);
    } catch (error) {
      console.error('Error in loginWithMobile:', error);
      throw error;
    }
  }

  /**
   * Check uniqueness in both Firebase and PostgreSQL
   */
  async checkUniqueness(email, mobileNumber) {
    // 1. Check PostgreSQL for Email
    if (email) {
      const existingDbEmail = await User.findByEmail(email);
      if (existingDbEmail) throw new Error('Email already registered.');
    }

    // 2. Check PostgreSQL for Mobile Number
    if (mobileNumber) {
      const existingDbMobile = await User.findByMobileNumber(mobileNumber);
      if (existingDbMobile) throw new Error('Mobile number already registered.');
    }

    // 3. Check Firebase for Email
    if (email) {
      try {
        await adminAuth.getUserByEmail(email.toLowerCase());
        throw new Error('Email already exists in authentication system.');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }

    // 4. Check Firebase for Mobile Number
    if (mobileNumber) {
      try {
        let firebasePhone = mobileNumber;
        if (!firebasePhone.startsWith('+')) {
          // Fallback to India if no country code provided but it's 10 digits
          firebasePhone = firebasePhone.length === 10 ? `+91${firebasePhone}` : `+${firebasePhone}`;
        }
        await adminAuth.getUserByPhoneNumber(firebasePhone);
        throw new Error('Mobile number already exists in authentication system.');
      } catch (error) {
        if (error.code !== 'auth/user-not-found' && error.code !== 'auth/invalid-phone-number') throw error;
      }
    }

    return true;
  }

  /**
   * Fetches a user from PostgreSQL by Firebase UID.
   */
  async getUserByUid(uid) {
    const user = await User.findByFirebaseUid(uid);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Updates user profile in PostgreSQL.
   */
  async updateProfile(uid, updates) {
    const user = await User.update(uid, updates);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
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
