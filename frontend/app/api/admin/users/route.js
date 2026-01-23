import { NextResponse } from 'next/server'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { query } from '@/lib/server/config/database.js'

/**
 * API Route to fetch test users
 * GET /api/admin/users
 * Query params: limit (optional, defaults to 50)
 */
export async function GET(request) {
  try {
    // Initialize database
    await ensureDbInitialized()

    // Get limit from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 50

    // Get total count of test users
    const countResult = await query(
      "SELECT COUNT(*) FROM public.users WHERE email LIKE 'user%@test.com'"
    )
    const totalCount = parseInt(countResult.rows[0].count)

    // Fetch users matching the test pattern, newest first
    const result = await query(
      `SELECT email, first_name 
       FROM public.users 
       WHERE email LIKE 'user%@test.com' 
       ORDER BY first_name DESC 
       LIMIT $1`,
      [limit]
    )

    // Parse user IDs and generate password list
    const users = result.rows.map(row => {
      const userId = row.first_name // first_name stores the userId
      const email = row.email
      // Extract number from userId (user0001 -> 0001 -> 1)
      const num = userId.replace('user', '')
      const password = `pwd${num.padStart(4, '0')}`

      return {
        userId,
        password,
        email
      }
    })

    return NextResponse.json({
      success: true,
      total: totalCount,
      data: users
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

