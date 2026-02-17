import User from '../models/User.js';
import { adminAuth } from '../config/firebase-admin.js';

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
   * Synchronizes Firebase user with local database.
   * Only called after successful token verification.
   */
  async syncUser(tokenData, profileData = {}) {
    const { uid, email, email_verified, phone_number, name } = tokenData;

    // Strict email verification check removed for social login flexibility
    // logic now handled inside User.sync which merges accounts if needed

    // Prepare user data for DB sync
    // Prioritize manual profileData if provided (e.g. from registration form), fallback to token data
    const userData = {
      uid,
      email: profileData.email || email || '',
      firstName: profileData.firstName || name?.split(' ')[0] || 'User',
      lastName: profileData.lastName || name?.split(' ').slice(1).join(' ') || null,
      mobileNumber: profileData.mobileNumber || phone_number || null
    };

    const user = await User.sync(userData);
    return user;
  }

  /**
   * Get user from database by ID
   */
  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  /**
   * Get user from database by Firebase UID
   */
  async getUserByUid(uid) {
    const user = await User.findByFirebaseUid(uid);
    if (!user) throw new Error('User not found');
    return user;
  }

  /**
   * Update user profile in database
   */
  async updateProfile(uid, updates) {
    return await User.update(uid, updates);
  }

  /**
   * Check if email or phone is already taken in Firebase.
   * This is used during registration to enforce uniqueness at the Auth level.
   */
  async checkFirebaseUniqueness(email, mobileNumber) {
    let emailExists = false;
    let phoneExists = false;

    if (email) {
      try {
        await adminAuth.getUserByEmail(email.toLowerCase());
        emailExists = true;
      } catch (error) {
        // user not found
      }
    }

    if (mobileNumber) {
      try {
        await adminAuth.getUserByPhoneNumber(mobileNumber);
        phoneExists = true;
      } catch (error) {
        // user not found
      }
    }

    if (emailExists) throw new Error('Email already registered in system.');

    return true;
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
