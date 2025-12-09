import { NextResponse } from 'next/server'
import authService from '@lib/server/services/authService.js'
import { ensureDbInitialized } from '@lib/server/middleware/dbInit.js'

export async function POST(request) {
  try {
    // Initialize database
    await ensureDbInitialized()
    
    // Parse request body
    const body = await request.json()
    
    // Call service to login user
    const result = await authService.login(body)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: result
    })
  } catch (error) {
    console.error('Login error:', error)
    
    // Handle authentication errors
    if (error.message === 'Invalid email or password') {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 401 })
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
