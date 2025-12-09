import pkg from 'pg'
const { Pool } = pkg
import 'dotenv/config'
import { URL } from 'url'

// Support both DATABASE_URL (for Supabase) and individual parameters (for localhost)
let poolConfig

if (process.env.DATABASE_URL) {
  // Parse and clean the connection string to remove conflicting SSL parameters
  let connectionString = process.env.DATABASE_URL
  
  try {
    const dbUrl = new URL(connectionString)
    // Remove all SSL-related query parameters that might override our config
    const sslParams = ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert', 'sslcrl']
    sslParams.forEach(param => dbUrl.searchParams.delete(param))
    connectionString = dbUrl.toString()
  } catch (error) {
    // If URL parsing fails, manually remove sslmode from connection string
    connectionString = connectionString
      .replace(/[?&]sslmode=[^&]*/gi, '')
      .replace(/[?&]ssl=[^&]*/gi, '')
      .replace(/\?&/g, '?')
      .replace(/[&?]$/, '')
  }
  
  // Use DATABASE_URL connection string (Supabase)
  poolConfig = {
    connectionString: connectionString,
    // Supabase requires SSL with self-signed certificates
    // This MUST be set to override any connection string SSL settings
    ssl: {
      rejectUnauthorized: false
    },
    max: 5, // Optimized for faster connections
    min: 1, // Reduced minimum connections
    idleTimeoutMillis: 20000, // Close idle clients after 20 seconds
    connectionTimeoutMillis: 5000, // Reduced to 5 seconds for faster failures
    statement_timeout: 10000, // Query timeout: 10 seconds
    query_timeout: 10000, // Query timeout: 10 seconds
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  }
} else {
  // Use individual parameters (localhost fallback)
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'todo_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : undefined,
    max: 5,
    min: 1,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    query_timeout: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  }
}

// Global pool instance (reused across serverless invocations)
const pool = new Pool(poolConfig)

// Log connection method (for debugging) - only in non-serverless environments
if (!process.env.VERCEL) {
  if (process.env.DATABASE_URL) {
    console.log(' Database: Using Supabase connection (DATABASE_URL)')
    console.log(' SSL Configuration: rejectUnauthorized = false (self-signed certs allowed)')
  } else {
    console.log(' Database: Using localhost connection')
  }
}

// Handle pool errors (don't exit in serverless)
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  // Don't exit in serverless/Vercel environment
  if (!process.env.VERCEL && !process.env.NEXT_RUNTIME) {
    // Only exit in development if it's a critical error
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.error('Critical database connection error. Exiting...')
      process.exit(-1)
    }
  }
})

// Log connection events for debugging (only in development)
if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
  pool.on('connect', (client) => {
    console.log('New database client connected')
  })
  
  pool.on('acquire', (client) => {
    console.log('Client acquired from pool')
  })
  
  pool.on('remove', (client) => {
    console.log('Client removed from pool')
  })
}

// Helper function to execute queries with optimized retry logic
const query = async (text, params, retries = 2) => {
  let lastError
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params)
      return res
    } catch (error) {
      lastError = error
      const isConnectionError = 
        error.message.includes('Connection terminated') ||
        error.message.includes('connection timeout') ||
        error.message.includes('Connection terminated unexpectedly') ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND'
      
      // Only retry on connection errors, with faster retry
      if (isConnectionError && attempt < retries) {
        const delay = Math.min(500 * attempt, 2000) // Faster retry: 500ms, 1000ms max
        console.warn(`Query failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // If not a connection error or last attempt, throw immediately
      console.error('Query error', { 
        text: text.substring(0, 100), 
        error: error.message,
        code: error.code
      })
      throw error
    }
  }
  
  throw lastError
}

// Health check function to test database connection (direct pool query, no retries)
const healthCheck = async () => {
  try {
    await pool.query('SELECT NOW()')
    return true
  } catch (error) {
    console.error('Database health check failed:', error.message)
    return false
  }
}

export {
  query,
  pool,
  healthCheck
}
