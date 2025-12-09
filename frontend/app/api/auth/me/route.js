import { NextResponse } from 'next/server'
import authService from '@lib/server/services/authService.js'
import { ensureDbInitialized } from '@lib/server/middleware/dbInit.js'
import { getUserIdFromToken } from '@lib/server/middleware/authMiddleware.js'

export async function GET(request) {
  try {
    // Initialize database
    await ensureDbInitialized()
    
    // Get userId from token
    const userId = getUserIdFromToken(request)
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'No token provided. Access denied.'
      }, { status: 401 })
    }
    
    // Call service to get user by ID
    const result = await authService.getUserById(userId)

    // Return success response
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Get current user error:', error)
    
    // Handle user not found
    if (error.message === 'User not found') {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 404 })
    }

    // Handle token errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({
        success: false,
        message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
      }, { status: 401 })
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
