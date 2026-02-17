import { query } from '../config/database.js'

const cleanPhoneNumber = (phone) => {
  if (!phone) return null;
  // Strip all non-digits and take last 10 characters
  return phone.replace(/\D/g, '').slice(-10);
}

class User {
  /**
   * Sync a Firebase user to the PostgreSQL database.
   * Handles linking existing accounts by Email or Mobile Number when using social login.
   */
  static async sync(userData) {
    const { uid, email, firstName, lastName, mobileNumber } = userData;
    const targetMobile = cleanPhoneNumber(mobileNumber);
    const firstNameVal = firstName || 'User';
    const emailLower = email?.toLowerCase().trim();

    // 1. Try to find an existing account to link with via UID
    let existingUser = await this.findByFirebaseUid(uid);
    if (existingUser) {
      return existingUser;
    }

    // 2. If not found by UID, check for identity conflict by Email (common for Social Login linking)
    if (emailLower) {
      existingUser = await this.findByEmail(emailLower);
      if (existingUser) {
        console.log(`Linking identity: Updating existing user ${existingUser.email} with new Firebase UID ${uid}`);
        await this.updateFirebaseUid(existingUser.id, uid);
        existingUser.firebase_uid = uid;
        return existingUser;
      }
    }


    // 4. If truly new, insert as a new record
    // Use NULL for empty email to avoid unique constraint violation if email is not provided
    const emailToInsert = emailLower && emailLower.length > 0 ? emailLower : null;

    const sqlQuery = `
      INSERT INTO public.users (firebase_uid, email, first_name, last_name, mobile_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, firebase_uid, first_name, last_name, email, mobile_number, created_at
    `;

    const values = [uid, emailToInsert, firstNameVal, lastName || null, targetMobile];
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
    const clean = cleanPhoneNumber(mobile);
    if (!clean) return null;
    const sqlQuery = 'SELECT * FROM public.users WHERE mobile_number = $1';
    const result = await query(sqlQuery, [clean]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const sqlQuery = 'SELECT * FROM public.users WHERE id = $1';
    const result = await query(sqlQuery, [id]);
    return result.rows[0] || null;
  }

  /**
   * Link a new Firebase UID to an existing record
   */
  static async updateFirebaseUid(id, newUid) {
    const sqlQuery = 'UPDATE public.users SET firebase_uid = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await query(sqlQuery, [newUid, id]);
  }

  static async update(firebaseUid, updates) {
    const { firstName, lastName, mobileNumber, email } = updates;

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
