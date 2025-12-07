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
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
} else {
  // Use individual parameters (localhost fallback)
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'todo_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}

const pool = new Pool(poolConfig)

// Log connection method (for debugging)
if (process.env.DATABASE_URL) {
  console.log('📦 Database: Using Supabase connection (DATABASE_URL)')
  console.log('🔒 SSL Configuration: rejectUnauthorized = false (self-signed certs allowed)')
} else {
  console.log('📦 Database: Using localhost connection')
}

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Helper function to execute queries
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params)
    return res
  } catch (error) {
    console.error('Query error', { text, error: error.message })
    throw error
  }
}

export {
  query,
  pool
}