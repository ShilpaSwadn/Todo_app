import { NextResponse } from 'next/server'
import authService from '@/lib/server/services/authService.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'

export async function POST(request) {
    try {
        await ensureDbInitialized()
        const { email: identifier, password } = await request.json()

        let result;
        if (identifier.includes('@')) {
            result = await authService.loginWithEmail(identifier, password)
        } else {
            result = await authService.loginWithMobile(identifier, password)
        }

        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            data: {
                user: result.user,
                token: result.token
            }
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
