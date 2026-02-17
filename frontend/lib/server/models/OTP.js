import { query } from '../config/database.js'

class OTP {
  // Generate 6-digit OTP
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Create and store OTP
  static async create(identifier) {
    const id = identifier.toLowerCase().trim();
    // Delete any existing OTPs for this identifier
    await this.deleteByIdentifier(id)

    // Generate new OTP
    const otp = this.generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    const sqlQuery = `
      INSERT INTO public.otps (identifier, otp, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, identifier, otp, expires_at, created_at
    `

    const values = [id, otp, expiresAt]
    const result = await query(sqlQuery, values)

    return result.rows[0];
  }

  // Verify OTP
  static async verify(identifier, otp) {
    const id = identifier.toLowerCase().trim();
    const sqlQuery = `
      SELECT * FROM public.otps 
      WHERE identifier = $1 AND otp = $2 AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    const result = await query(sqlQuery, [id, otp])

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0];
  }

  // Delete OTP by identifier
  static async deleteByIdentifier(identifier) {
    const id = identifier.toLowerCase().trim();
    const sqlQuery = 'DELETE FROM public.otps WHERE identifier = $1'
    await query(sqlQuery, [id])
  }

  // Clean expired OTPs
  static async cleanExpired() {
    const sqlQuery = 'DELETE FROM public.otps WHERE expires_at < NOW()'
    await query(sqlQuery)
  }
}

export default OTP
