import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { query } from './config/database.js'
import authRoutes from './routes/authRoutes.js'
import initDatabase from './config/dbInit.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Initialize database on first request (for serverless)
let dbInitialized = false
const ensureDbInitialized = async () => {
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

// Initialize database before handling requests
app.use(async (req, res, next) => {
  await ensureDbInitialized()
  next()
})

// Routes
app.use('/api/auth', authRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// For local development, start server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`)
    try {
      await query('SELECT NOW()')
      console.log('Database connected successfully')
      await initDatabase()
    } catch (error) {
      console.error('Database connection error:', error.message)
    }
  })
}

export default app

