import User from '../models/User.js';
import Group from '../models/Group.js';
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

    const cleanEmail = email.toLowerCase().trim();
    const cleanedMobile = mobileNumber ? (mobileNumber.startsWith('+') ? mobileNumber : (mobileNumber.length === 10 ? `+91${mobileNumber}` : `+${mobileNumber}`)).replace(/\s/g, '') : null;

    // 1. Check if email exists in Firebase
    let existingUserByEmail = null;
    try {
      existingUserByEmail = await adminAuth.getUserByEmail(cleanEmail);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // 2. Check if mobile number exists in Firebase
    let existingUserByMobile = null;
    if (cleanedMobile) {
      try {
        existingUserByMobile = await adminAuth.getUserByPhoneNumber(cleanedMobile);
      } catch (err) {
        if (err.code !== 'auth/user-not-found' && err.code !== 'auth/invalid-phone-number') throw err;
      }
    }

    let firebaseUser = null;
    let pgUser = null;

    // SCENARIO A: Email exists
    if (existingUserByEmail) {
      if (existingUserByEmail.emailVerified) {
        throw new Error('This email is already connected to an account.');
      }

      console.log(`Updating unverified user with email ${cleanEmail}...`);

      // If they provided a mobile number, check if it's already used by another VERIFIED account
      if (existingUserByMobile && existingUserByMobile.uid !== existingUserByEmail.uid) {
        if (existingUserByMobile.emailVerified) {
          throw new Error('This mobile number is already connected to another verified account.');
        }
        
        // The mobile number is held by another UNVERIFIED user. 
        // We will release/remove the mobile number from the other unverified user to prevent duplicate keys in Firebase.
        try {
          console.log(`Releasing mobile number from unverified user ${existingUserByMobile.uid}`);
          await adminAuth.updateUser(existingUserByMobile.uid, { phoneNumber: null });
          await User.update(existingUserByMobile.uid, { mobileNumber: null });
        } catch (releaseErr) {
          console.warn('Could not release mobile number from other unverified user:', releaseErr);
        }
      }

      // Update Firebase Auth user
      firebaseUser = await adminAuth.updateUser(existingUserByEmail.uid, {
        password,
        displayName: `${firstName} ${lastName || ''}`.trim(),
        phoneNumber: cleanedMobile
      });

      // Update Postgres user
      pgUser = await User.update(existingUserByEmail.uid, {
        firstName,
        lastName,
        mobileNumber: cleanedMobile
      });

      if (!pgUser) {
        // In case PostgreSQL record was somehow missing or deleted
        pgUser = await User.create({
          email: cleanEmail,
          firstName,
          lastName,
          mobileNumber,
          firebaseUid: existingUserByEmail.uid
        });
      }

    // SCENARIO B: Mobile number exists (but email does not)
    } else if (existingUserByMobile) {
      if (existingUserByMobile.emailVerified) {
        throw new Error('This mobile number is already connected to an account.');
      }

      console.log(`Updating unverified user with mobile ${cleanedMobile} (email correction from ${existingUserByMobile.email} to ${cleanEmail})...`);

      // Update Firebase Auth user with the new email
      firebaseUser = await adminAuth.updateUser(existingUserByMobile.uid, {
        email: cleanEmail,
        password,
        displayName: `${firstName} ${lastName || ''}`.trim()
      });

      // Update Postgres user
      pgUser = await User.update(existingUserByMobile.uid, {
        firstName,
        lastName,
        email: cleanEmail
      });

      if (!pgUser) {
        // In case PostgreSQL record was somehow missing or deleted
        pgUser = await User.create({
          email: cleanEmail,
          firstName,
          lastName,
          mobileNumber,
          firebaseUid: existingUserByMobile.uid
        });
      }

    // SCENARIO C: Truly new user
    } else {
      // Create in Firebase Auth
      firebaseUser = await adminAuth.createUser({
        email: cleanEmail,
        password,
        displayName: `${firstName} ${lastName || ''}`.trim(),
        phoneNumber: cleanedMobile
      });

      // Create in local database (PostgreSQL)
      pgUser = await User.create({
        email: cleanEmail,
        firstName,
        lastName,
        mobileNumber,
        firebaseUid: firebaseUser.uid
      });
    }

    // Ensure Default Group exists
    try {
      const existingGroup = await Group.findByUserId(pgUser.id);
      if (!existingGroup) {
        await Group.create(pgUser.id, {
          name: 'default group',
          description: 'default group details',
          isDefault: true
        });
      }
    } catch (groupError) {
      console.warn('Error ensuring default group:', groupError);
    }

    // Send Verification Email (Magic Link)
    try {
      const { sendVerificationEmail } = await import('../services/emailService.js');
      const link = await adminAuth.generateEmailVerificationLink(cleanEmail);
      await sendVerificationEmail(cleanEmail, link);
    } catch (emailError) {
      console.warn('Verification email failed to send:', emailError);
    }

    return this.formatUser(pgUser);
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

    // If this is a new user (created_at is very recent or we check if group exists)
    // To be safe and meet the requirement "if user is created", we check if they have any group.
    try {
      const existingGroup = await Group.findByUserId(user.id);
      if (!existingGroup) {
        await Group.create(user.id, {
          name: 'default group',
          description: 'default group details',
          isDefault: true
        });
      }
    } catch (groupError) {
      console.warn('Error ensuring default group for synced user:', groupError);
    }

    return this.formatUser(user);
  }

  /**
   * Login with Email and Password
   * Uses Firebase REST API because Admin SDK doesn't support password check.
   */
  async loginWithEmail(email, password) {
    try {
      // 1. Verify if the user exists
      let firebaseUser;
      try {
        firebaseUser = await adminAuth.getUserByEmail(email.toLowerCase().trim());
      } catch (fbError) {
        if (fbError.code === 'auth/user-not-found') {
          throw new Error('We couldn\'t find an account with this email. Would you like to Register?');
        }
        throw fbError;
      }

      // 2. Check activation status IMMEDIATELY to help users who registered but didn't click the link
      if (!firebaseUser.emailVerified) {
        throw new Error('Your account is almost ready! Please check your email to activate it.');
      }

      // 3. User exists and is verified, now check password setup
      const providers = firebaseUser.providerData || [];
      const hasPassword = providers.some(p => p.providerId === 'password');
      if (!hasPassword) {
        throw new Error('This account doesn\'t have a password yet. Please login using Google OAuth or an OTP login.');
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
        throw new Error('Your account is almost ready! Please check your email to activate it.');
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
          throw new Error('This mobile number is not connected to an account. Please sign up first.');
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
        throw new Error('This email is already connected to an account.');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }

    // 2. Check Firebase for Mobile Number
    if (mobileNumber) {
      try {
        const cleanedMobile = (mobileNumber.startsWith('+') ? mobileNumber : (mobileNumber.length === 10 ? `+91${mobileNumber}` : `+${mobileNumber}`)).replace(/\s/g, '');
        await adminAuth.getUserByPhoneNumber(cleanedMobile);
        throw new Error('This mobile number is already connected to an account.');
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
      languagePreference: user.language_preference || 'English',
      timeZone: user.time_zone || 'UTC',
      currency: user.currency || 'USD',
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
