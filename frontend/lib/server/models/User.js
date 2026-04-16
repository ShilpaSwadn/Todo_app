import { query } from '../config/database.js'
import { v7 as uuidv7 } from 'uuid'

const cleanPhoneNumber = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');

  // If it already starts with +, just clean the rest
  if (phone.trim().startsWith('+')) {
    return '+' + digits;
  }

  // If it's 10 digits, assume India (+91)
  if (digits.length === 10) {
    return '+91' + digits;
  }

  // If it starts with 91 and is 12 digits, assume it's India without the +
  if (digits.startsWith('91') && digits.length === 12) {
    return '+' + digits;
  }

  // Otherwise just prepend + and hope for the best, or log a warning
  return '+' + digits;
}

class User {
  /**
   * Create a new user record in PostgreSQL (Registration)
   */
  static async create(userData) {
    const { email, firstName, lastName, mobileNumber, firebaseUid } = userData;
    const targetMobile = cleanPhoneNumber(mobileNumber);
    const firstNameVal = firstName || 'User';
    const emailLower = email?.toLowerCase().trim();
    const emailToInsert = emailLower && emailLower.length > 0 ? emailLower : null;
    const newId = uuidv7();

    const sqlQuery = `
      INSERT INTO public.users (id, email, first_name, last_name, mobile_number, firebase_uid, account_active, profile_data, language_preference, time_zone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, firebase_uid, first_name, last_name, email, mobile_number, language_preference, time_zone, account_active, profile_data, created_at
    `;

    const values = [
      newId,
      emailToInsert, 
      firstNameVal, 
      lastName || null, 
      targetMobile, 
      firebaseUid || null, 
      false, 
      userData.profileData || {}, 
      userData.languagePreference || 'en', 
      userData.timeZone || 'UTC'
    ];
    const result = await query(sqlQuery, values);

    return result.rows[0];
  }

  /**
   * Sync a Firebase user to the PostgreSQL database.
   */
  static async sync(userData) {
    const { uid, email, firstName, lastName, mobileNumber } = userData;
    const targetMobile = cleanPhoneNumber(mobileNumber);
    const firstNameVal = firstName || 'User';
    const emailLower = email?.toLowerCase().trim();

    // 1. Try to find an existing account to link with via UID
    let existingUser = await this.findByFirebaseUid(uid);
    if (existingUser) {
      // Update mobile number if it's different (e.g. missing country code in DB)
      if (targetMobile && existingUser.mobile_number !== targetMobile) {
        console.log(`Syncing mobile number for ${uid}: ${existingUser.mobile_number} -> ${targetMobile}`);
        await this.update(uid, { mobileNumber: targetMobile });
        existingUser.mobile_number = targetMobile;
      }

      if (!existingUser.account_active) {
        await this.updateAccountActive(existingUser.id, true);
        existingUser.account_active = true;
      }
      return existingUser;
    }

    // 2. If not found by UID, check for identity conflict by Email
    if (emailLower) {
      existingUser = await this.findByEmail(emailLower);
      if (existingUser) {
        console.log(`Linking identity: Updating existing user ${existingUser.email} with new Firebase UID ${uid}`);
        await this.updateFirebaseUid(existingUser.id, uid);
        await this.updateAccountActive(existingUser.id, true);
        return await this.findByFirebaseUid(uid);
      }
    }

    // 3. If truly new, insert as a new record
    const emailToInsert = emailLower && emailLower.length > 0 ? emailLower : null;
    const newId = uuidv7();

    const sqlQuery = `
      INSERT INTO public.users (id, firebase_uid, email, first_name, last_name, mobile_number, account_active, profile_data, language_preference, time_zone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, firebase_uid, first_name, last_name, email, mobile_number, language_preference, time_zone, account_active, profile_data, created_at
    `;

    const values = [
      newId,
      uid, 
      emailToInsert, 
      firstNameVal, 
      lastName || null, 
      targetMobile, 
      true, 
      userData.profileData || {}, 
      userData.languagePreference || 'en', 
      userData.timeZone || 'UTC'
    ];
    const result = await query(sqlQuery, values);

    return result.rows[0];
  }

  static async findByFirebaseUid(uid) {
    const sqlQuery = 'SELECT * FROM public.users WHERE firebase_uid = $1';
    const result = await query(sqlQuery, [uid]);
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    if (!email) return null;
    const sqlQuery = 'SELECT * FROM public.users WHERE email = $1';
    const result = await query(sqlQuery, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  }

  static async findByMobileNumber(mobile) {
    if (!mobile) return null;
    const fullMatch = cleanPhoneNumber(mobile);
    const digitsOnly = mobile.replace(/\D/g, '');
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    // Try exact match first, then last 10 digits
    const sqlQuery = 'SELECT * FROM public.users WHERE mobile_number = $1 OR mobile_number = $2';
    const result = await query(sqlQuery, [fullMatch, last10]);
    return result.rows[0] || null;
  }


  static async findById(id) {
    const sqlQuery = 'SELECT * FROM public.users WHERE id = $1';
    const result = await query(sqlQuery, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find multiple active users by their IDs
   */
  static async findActiveByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const sqlQuery = 'SELECT id, email, first_name, last_name FROM public.users WHERE id = ANY($1) AND account_active = true';
    const result = await query(sqlQuery, [ids]);
    return result.rows;
  }

  /**
   * Search for an active user by email (for UI selection)
   */
  static async findActiveByEmail(email) {
    if (!email) return null;
    const sqlQuery = 'SELECT id, email, first_name, last_name FROM public.users WHERE email = $1 AND account_active = true';
    const result = await query(sqlQuery, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  }

  /**
   * Fetch all active users (limited, excluding specific ID)
   */
  static async findAllActive(limit = 20, excludeId = null) {
    let sqlQuery = 'SELECT id, email, first_name, last_name FROM public.users WHERE account_active = true';
    const params = [limit];
    
    if (excludeId) {
      sqlQuery += ' AND id != $2';
      params.push(excludeId);
    }
    
    sqlQuery += ' ORDER BY first_name ASC LIMIT $1';
    const result = await query(sqlQuery, params);
    return result.rows;
  }

  /**
   * Search active users by name or email (excluding specific ID)
   */
  static async searchActive(term, excludeId = null) {
    const pattern = `%${term}%`;
    let sqlQuery = `
      SELECT id, email, first_name, last_name 
      FROM public.users 
      WHERE account_active = true 
      AND (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)
    `;
    const params = [pattern];

    if (excludeId) {
      sqlQuery += ' AND id != $2';
      params.push(excludeId);
    }

    sqlQuery += ' ORDER BY first_name ASC LIMIT 10';
    const result = await query(sqlQuery, params);
    return result.rows;
  }
  static async updateAccountActive(id, active) {
    const sqlQuery = 'UPDATE public.users SET account_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await query(sqlQuery, [active, id]);
  }

  /**
   * Link a new Firebase UID to an existing record
   */
  static async updateFirebaseUid(id, newUid) {
    const sqlQuery = 'UPDATE public.users SET firebase_uid = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await query(sqlQuery, [newUid, id]);
  }

  static async update(firebaseUid, updates) {
    const { firstName, lastName, mobileNumber, email, accountActive } = updates;

    const fields = [];
    const values = [];
    let idx = 1;

    if (firstName) {
      fields.push(`first_name = $${idx++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(lastName);
    }
    if (mobileNumber) {
      fields.push(`mobile_number = $${idx++}`);
      values.push(cleanPhoneNumber(mobileNumber));
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email.toLowerCase().trim());
    }
    if (accountActive !== undefined) {
      fields.push(`account_active = $${idx++}`);
      values.push(accountActive);
    }
    if (updates.languagePreference !== undefined) {
      fields.push(`language_preference = $${idx++}`);
      values.push(updates.languagePreference);
    }
    if (updates.timeZone !== undefined) {
      fields.push(`time_zone = $${idx++}`);
      values.push(updates.timeZone);
    }
    if (updates.currency !== undefined) {
      fields.push(`currency = $${idx++}`);
      values.push(updates.currency);
    }
    if (updates.profileData !== undefined) {
      fields.push(`profile_data = $${idx++}`);
      values.push(updates.profileData);
    }

    if (fields.length === 0) return null;

    values.push(firebaseUid);
    const sqlQuery = `
      UPDATE public.users 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE firebase_uid = $${idx}
      RETURNING *
    `;

    const result = await query(sqlQuery, values);

    return result.rows[0];
  }
}

export default User
