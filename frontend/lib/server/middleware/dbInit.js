import { query, healthCheck } from '../config/database.js'
import initDatabase from '../config/dbInit.js'

// Initialize database on first request (for serverless)
let dbInitialized = false
let initializationPromise = null

export const ensureDbInitialized = async () => {
  // If already initialized, return immediately
  if (dbInitialized) {
    return
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise
  }

  // Start initialization with optimized retry logic
  initializationPromise = (async () => {
    const maxRetries = 2
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Skip health check on first attempt for faster initialization
        if (attempt > 1) {
          const isHealthy = await healthCheck()
          if (!isHealthy) {
            throw new Error('Database health check failed')
          }
        }

        // Initialize database schema
        await initDatabase()
        dbInitialized = true
        return
      } catch (error) {
        lastError = error
        const isConnectionError = 
          error.message.includes('Connection terminated') ||
          error.message.includes('connection timeout') ||
          error.message.includes('Connection terminated unexpectedly') ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET'

        if (isConnectionError && attempt < maxRetries) {
          const delay = 500 * attempt // Faster retry: 500ms, 1000ms
          console.warn(`Database initialization failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        console.error('Database initialization error:', error.message)
        throw error
      }
    }

    throw lastError
  })()

  return initializationPromise
}
