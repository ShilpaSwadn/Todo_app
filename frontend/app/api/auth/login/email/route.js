import { NextResponse } from 'next/server'
import authService from '@/lib/server/services/authService.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'

export async function POST(request) {
    try {
        await ensureDbInitialized()
        const { email, password } = await request.json()

        const result = await authService.loginWithEmail(email, password)

        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            data: { user: result.user }
        })

        response.cookies.set('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        })

        return response
    } catch (error) {
        console.error('Email Login error:', error)
        return NextResponse.json({
            success: false,
            message: error.message || 'Error logging in'
        }, { status: error.message.includes('verified') ? 403 : 401 })
    }
}
