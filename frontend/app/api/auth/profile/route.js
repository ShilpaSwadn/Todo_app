import { NextResponse } from 'next/server'
import authService from '@/lib/server/services/authService.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'

export async function PUT(request) {
  try {
    // Initialize database
    await ensureDbInitialized()

    // Get Firebase UID from token
    const uid = await getUidFromToken(request)

    if (!uid) {
      return NextResponse.json({
        success: false,
        message: 'No token provided. Access denied.'
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()

    // Call service to update user profile using Firebase UID
    const user = await authService.updateProfile(uid, body)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
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

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
