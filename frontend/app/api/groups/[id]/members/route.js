import { NextResponse } from 'next/server'
import { query } from '@/lib/server/config/database.js'
import User from '@/lib/server/models/User.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'
import authService from '@/lib/server/services/authService.js'
import UserRole from '@/lib/server/models/UserRole.js'

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized()
    
    const { id } = params
    const { userId } = await request.json()
    
    const uid = await getUidFromToken(request)
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await authService.getUserByUid(uid)

    // Verify user exists and is active
    const targetUser = await User.findById(userId)
    if (!targetUser || !targetUser.account_active) {
      return NextResponse.json({ success: false, message: 'Valid active member is required' }, { status: 400 })
    }

    // Verify user authorization (owner or GROUP_ADMIN)
    const isAuthorized = await UserRole.isAuthorized(currentUser.id, id);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Add user to members array if not already present
    const sqlQuery = `
      UPDATE public.groups 
      SET group_members = array_append(group_members, $1) 
      WHERE group_id = $2 AND NOT ($1 = ANY(group_members))
      RETURNING group_members
    `
    const result = await query(sqlQuery, [userId, id])

    if (result.rowCount === 0) {
      // Check if it failed because user is already a member
      const checkQuery = 'SELECT group_members as members FROM public.groups WHERE group_id = $1'
      const checkResult = await query(checkQuery, [id])
      
      if (checkResult.rowCount === 0) {
        return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })
      }

      // If already a member, return the current members
      const memberDetails = await User.findActiveByIds(checkResult.rows[0].members)
      return NextResponse.json({
        success: true,
        members: memberDetails.map(m => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name || ''}`.trim(),
          email: m.email
        }))
      })
    }

    const memberDetails = await User.findActiveByIds(result.rows[0].group_members)
    return NextResponse.json({
      success: true,
      members: memberDetails.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name || ''}`.trim(),
        email: m.email
      }))
    })
  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureDbInitialized()
    
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    const uid = await getUidFromToken(request)
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await authService.getUserByUid(uid)

    // Verify user authorization (owner or GROUP_ADMIN)
    const isAuthorized = await UserRole.isAuthorized(currentUser.id, id);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Remove user from members array
    const sqlQuery = `
      UPDATE public.groups 
      SET group_members = array_remove(group_members, $1) 
      WHERE group_id = $2
      RETURNING group_members
    `
    const result = await query(sqlQuery, [userId, id])

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })
    }

    // Clean up user_roles table for this user-group pair
    await query('DELETE FROM public.user_roles WHERE user_id = $1 AND group_id = $2', [userId, id]);

    const memberDetails = await User.findActiveByIds(result.rows[0].group_members)
    return NextResponse.json({
      success: true,
      members: memberDetails.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name || ''}`.trim(),
        email: m.email
      }))
    })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
