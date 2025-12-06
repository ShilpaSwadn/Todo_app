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

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }
}

export default User

