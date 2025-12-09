import { query } from '../config/database.js'

class OTP {
  // Generate 6-digit OTP
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Create and store OTP
  static async create(email) {
    // Delete any existing OTPs for this email
    await this.deleteByEmail(email)

    // Generate new OTP
    const otp = this.generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    const sqlQuery = `
      INSERT INTO otps (email, otp, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, email, otp, expires_at, created_at
    `

    const values = [email.toLowerCase(), otp, expiresAt]
    const result = await query(sqlQuery, values)

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      otp: result.rows[0].otp,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at
    }
  }

  // Verify OTP
  static async verify(email, otp) {
    const sqlQuery = `
      SELECT * FROM otps 
      WHERE email = $1 AND otp = $2 AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    const result = await query(sqlQuery, [email.toLowerCase(), otp])

    if (result.rows.length === 0) {
      return null
    }

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      otp: result.rows[0].otp,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at
    }
  }

  // Delete OTP by email
  static async deleteByEmail(email) {
    const sqlQuery = 'DELETE FROM otps WHERE email = $1'
    await query(sqlQuery, [email.toLowerCase()])
  }

  // Delete OTP by ID
  static async deleteById(id) {
    const sqlQuery = 'DELETE FROM otps WHERE id = $1'
    await query(sqlQuery, [id])
  }

  // Clean expired OTPs
  static async cleanExpired() {
    const sqlQuery = 'DELETE FROM otps WHERE expires_at < NOW()'
    await query(sqlQuery)
  }
}

export default OTP
