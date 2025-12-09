import { query } from './database.js'

const initDatabase = async () => {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile_number VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create index on email for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `)
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

export default initDatabase
