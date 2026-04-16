import { NextResponse } from 'next/server'
import { query } from '@/lib/server/config/database.js'
import User from '@/lib/server/models/User.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'
import authService from '@/lib/server/services/authService.js'

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

    // Add user to members array if not already present
    // Only owner can add members
    const sqlQuery = `
      UPDATE public.groups 
      SET group_members = array_append(group_members, $1) 
      WHERE group_id = $2 AND user_id = $3 AND NOT ($1 = ANY(group_members))
      RETURNING group_members
    `
    const result = await query(sqlQuery, [userId, id, currentUser.id])

    if (result.rowCount === 0) {
      // Check if it failed because user is already a member or not owner
      const checkQuery = 'SELECT group_members as members, user_id FROM public.groups WHERE group_id = $1'
      const checkResult = await query(checkQuery, [id])
      
      if (checkResult.rowCount === 0) {
        return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })
      }
      
      if (checkResult.rows[0].user_id !== currentUser.id) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
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

    // Remove user from members array
    // Only owner can remove members (or someone can remove themselves - but let's stick to owner for now)
    const sqlQuery = `
      UPDATE public.groups 
      SET group_members = array_remove(group_members, $1) 
      WHERE group_id = $2 AND user_id = $3
      RETURNING group_members
    `
    const result = await query(sqlQuery, [userId, id, currentUser.id])

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Group not found or unauthorized' }, { status: 404 })
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
    console.error('Remove member error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
