import { query } from '../config/database.js'
import initDatabase from '../config/dbInit.js'

// Initialize database on first request (for serverless)
let dbInitialized = false

export const ensureDbInitialized = async () => {
  if (!dbInitialized) {
    try {
      await query('SELECT NOW()')
      await initDatabase()
      dbInitialized = true
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Database initialization error:', error.message)
    }
  }
}
