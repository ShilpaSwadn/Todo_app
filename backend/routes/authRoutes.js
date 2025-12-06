import express from 'express'
import * as authController from '../controllers/authController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

// Register route
router.post('/register', authController.register)

// Login route
router.post('/login', authController.login)

// Get current user (protected)
router.get('/me', authenticate, authController.getCurrentUser)

export default router

