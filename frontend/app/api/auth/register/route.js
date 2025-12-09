import { NextResponse } from 'next/server'
import authService from '../../../../lib/server/services/authService.js'
import { ensureDbInitialized } from '../../../../lib/server/middleware/dbInit.js'

export async function POST(request) {
  try {
    // Initialize database
    await ensureDbInitialized()
    
    // Parse request body
    const body = await request.json()
    
    // Call service to register user
    const result = await authService.register(body)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: result
    }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    
    // Handle specific error cases
    if (error.message === 'Email already registered. Please login instead.') {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 409 })
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
