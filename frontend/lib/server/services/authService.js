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

    // 1. If user is verified, check if we need to promote them from temp_users
    let finalMobileNumber = profileData.mobileNumber || phone_number || null;
    let finalFirstName = profileData.firstName || name?.split(' ')[0] || 'User';
    let finalLastName = profileData.lastName || name?.split(' ').slice(1).join(' ') || null;
    let tempUserSnap;

    if (email_verified) {
      const adminDb = (await import('../config/firebase-admin.js')).adminDb;
      const tempUserRef = adminDb.collection('temp_users').doc(uid);
      tempUserSnap = await tempUserRef.get();

      if (tempUserSnap.exists) {
        const data = tempUserSnap.data();
        console.log(`Promoting user ${uid} from temp to main storage...`);

        finalMobileNumber = data.mobileNumber;
        finalFirstName = data.firstName;
        finalLastName = data.lastName;

        // Move to final collections atomically
        const batch = adminDb.batch();

        // Final Profile
        const userRef = adminDb.collection('users').doc(uid);
        batch.set(userRef, {
          uid,
          email: email.toLowerCase(),
          mobileNumber: finalMobileNumber,
          firstName: finalFirstName,
          lastName: finalLastName,
          displayName: `${finalFirstName} ${finalLastName}`.trim(),
          createdAt: data.createdAt || new Date(),
          updatedAt: new Date(),
          verifiedAt: new Date()
        });

        // Combination Lock
        const combinationId = `${email.toLowerCase()}_${finalMobileNumber}`;
        const combinationRef = adminDb.collection('user_combinations').doc(combinationId);
        batch.set(combinationRef, {
          email: email.toLowerCase(),
          mobileNumber: finalMobileNumber,
          uid: uid,
          createdAt: data.createdAt || new Date()
        });

        // Delete temp data
        batch.delete(tempUserRef);

        await batch.commit();
        console.log(`Promotion complete for ${uid}.`);
      }
    }

    // 2. Synchronize with PostgreSQL (only if verified)
    if (!email_verified) {
      throw new Error('Please verify your email address before continuing.');
    }

    const userData = {
      uid,
      email: email || '',
      firstName: finalFirstName,
      lastName: finalLastName,
      mobileNumber: finalMobileNumber
    };

    // 2. PRIMARY ACCOUNT REDIRECTION
    if (finalMobileNumber) {
      const primaryUser = await User.findPrimaryByMobileNumber(finalMobileNumber);
      if (primaryUser && primaryUser.firebase_uid !== uid) {
        console.log(`Redirecting login: UID ${uid} -> Primary UID ${primaryUser.firebase_uid}`);
        const customToken = await this.createCustomToken(primaryUser.firebase_uid);
        return {
          ...primaryUser,
          redirectToPrimary: true,
          customToken
        };
      }
    }

    const user = await User.sync(userData, {
      isPrimaryExplicit: tempUserSnap?.exists ? tempUserSnap.data().isPrimary : false
    });
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
   * Login with Email and Password
   */
  async loginWithEmail(email, password) {
    try {
      // 1. Authenticate with Firebase using REST API (Admin SDK doesn't support password check)
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

      // 2. Verify the ID Token and sync/get user
      const decodedToken = await this.verifyFirebaseToken(data.idToken);
      const user = await this.syncUser(decodedToken);

      return {
        user,
        token: data.idToken
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
      // 1. Identify the primary account for this mobile number
      const primaryUser = await User.findPrimaryByMobileNumber(mobileNumber);

      if (!primaryUser || !primaryUser.email) {
        throw new Error('No primary account found for this mobile number. Please login with email or register.');
      }

      // 2. Perform login using the primary account's email
      return await this.loginWithEmail(primaryUser.email, password);
    } catch (error) {
      console.error('Error in loginWithMobile:', error);
      throw error;
    }
  }

  /**
   * Check if email or phone is already taken in Firebase.
   * This is used during registration to enforce uniqueness at the Auth level.
   */
  async checkFirebaseUniqueness(email, mobileNumber) {
    let emailExists = false;

    if (email) {
      try {
        await adminAuth.getUserByEmail(email.toLowerCase());
        emailExists = true;
      } catch (error) {
        // user not found
      }
    }

    // Note: We don't throw for mobileNumber uniqueness here anymore 
    // because we want to allow multiple accounts with the same mobile number.
    // The uniqueness is handled by our composite key logic.

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
