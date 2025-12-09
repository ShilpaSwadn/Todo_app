import { NextResponse } from 'next/server'
import authService from '@lib/server/services/authService.js'
import { ensureDbInitialized } from '@lib/server/middleware/dbInit.js'
import { getUserIdFromToken } from '@lib/server/middleware/authMiddleware.js'

export async function PUT(request) {
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
    
    // Parse request body
    const body = await request.json()
    
    // Call service to update user profile
    const result = await authService.updateProfile(userId, body)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: result
    })
  } catch (error) {
    console.error('Update profile error:', error)
    
    // Handle specific error cases
    if (error.message === 'Email already registered') {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 409 })
    }

    if (error.message === 'User not found') {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 404 })
    }

    if (error.message === 'Old password is required to update password' || error.message === 'Old password is incorrect') {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 400 })
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
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
