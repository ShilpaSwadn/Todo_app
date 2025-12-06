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

const PORT = process.env.PORT || 5000

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`)
  
  // Test database connection and initialize tables
  try {
    await query('SELECT NOW()')
    console.log('Database connected successfully')
    
    // Initialize database tables
    await initDatabase()
  } catch (error) {
    console.error('Database connection error:', error.message)
  }
})

export default app

