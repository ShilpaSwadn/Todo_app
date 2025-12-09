import { query } from '../config/database.js'
import bcrypt from 'bcryptjs'

class User {
  static async create(userData) {
    const { firstName, lastName, email, mobileNumber, password } = userData
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Handle optional last name
    const lastNameValue = lastName && lastName.trim() !== '' ? lastName.trim() : null
    
    const sqlQuery = `
      INSERT INTO users (first_name, last_name, email, mobile_number, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, first_name, last_name, email, mobile_number, created_at
    `
    
    const values = [firstName, lastNameValue, email.toLowerCase(), mobileNumber, hashedPassword]
    const result = await query(sqlQuery, values)
    
    return {
      id: result.rows[0].id,
      firstName: result.rows[0].first_name,
      lastName: result.rows[0].last_name,
      email: result.rows[0].email,
      mobileNumber: result.rows[0].mobile_number,
      createdAt: result.rows[0].created_at
    }
  }

  static async findByEmail(email) {
    const sqlQuery = 'SELECT * FROM users WHERE email = $1'
    const result = await query(sqlQuery, [email.toLowerCase()])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const user = result.rows[0]
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      mobileNumber: user.mobile_number,
      password: user.password,
      createdAt: user.created_at
    }
  }

  static async findById(id) {
    const sqlQuery = 'SELECT id, first_name, last_name, email, mobile_number, created_at FROM users WHERE id = $1'
    const result = await query(sqlQuery, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const user = result.rows[0]
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      mobileNumber: user.mobile_number,
      createdAt: user.created_at
    }
  }

  static async findByIdWithPassword(id) {
    const sqlQuery = 'SELECT * FROM users WHERE id = $1'
    const result = await query(sqlQuery, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const user = result.rows[0]
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      mobileNumber: user.mobile_number,
      password: user.password,
      createdAt: user.created_at
    }
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }

  static async update(id, userData) {
    const { firstName, lastName, email, mobileNumber, password, oldPassword } = userData
    
    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findByEmail(email)
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already registered')
      }
    }

    // If password is being updated, verify old password first
    if (password !== undefined && password.trim() !== '') {
      if (!oldPassword || oldPassword.trim() === '') {
        throw new Error('Old password is required to update password')
      }

      // Get user with password hash
      const userWithPassword = await User.findByIdWithPassword(id)
      if (!userWithPassword) {
        throw new Error('User not found')
      }

      // Verify old password
      const isOldPasswordValid = await User.comparePassword(oldPassword, userWithPassword.password)
      if (!isOldPasswordValid) {
        throw new Error('Old password is incorrect')
      }
    }

    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 1

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`)
      values.push(firstName)
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`)
      values.push(lastName && lastName.trim() !== '' ? lastName.trim() : null)
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`)
      values.push(email.toLowerCase())
    }
    if (mobileNumber !== undefined) {
      updates.push(`mobile_number = $${paramCount++}`)
      values.push(mobileNumber)
    }
    if (password !== undefined && password.trim() !== '') {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.push(`password = $${paramCount++}`)
      values.push(hashedPassword)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const sqlQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, first_name, last_name, email, mobile_number, created_at, updated_at
    `

    const result = await query(sqlQuery, values)
    
    if (result.rows.length === 0) {
      throw new Error('User not found')
    }

    const user = result.rows[0]
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      mobileNumber: user.mobile_number,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }
  }
}

export default User
