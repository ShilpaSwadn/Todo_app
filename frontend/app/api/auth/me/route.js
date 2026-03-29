import { NextResponse } from 'next/server'
import authService from '@/lib/server/services/authService.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'

export const dynamic = 'force-dynamic';

export async function GET(request) {
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

    // Call service to get user by Firebase UID
    const user = await authService.getUserByUid(uid)

    // Return success response
    return NextResponse.json({
      success: true,
      data: { user }
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

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
