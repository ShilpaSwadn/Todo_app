import { NextResponse } from 'next/server'
import User from '@/lib/server/models/User.js'
import authService from '@/lib/server/services/authService.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await ensureDbInitialized()
    
    const uid = await getUidFromToken(request)
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to exclude from results
    const currentUser = await authService.getUserByUid(uid)

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || searchParams.get('email')

    let activeUsers = []
    
    if (!q || q.trim() === '') {
      // If no query, return a list of active users to show in dropdown
      activeUsers = await User.findAllActive(20, currentUser.id)
    } else {
      // If query exists, perform a search (ILIKE on email or name)
      activeUsers = await User.searchActive(q, currentUser.id)
    }

    const users = activeUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name || ''}`.trim()
    }))

    return NextResponse.json({
      success: true,
      users: users
    })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
