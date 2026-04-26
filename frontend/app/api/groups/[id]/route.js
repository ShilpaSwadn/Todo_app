import { NextResponse } from 'next/server'
import { query } from '@/lib/server/config/database.js'
import Group from '@/lib/server/models/Group.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'
import authService from '@/lib/server/services/authService.js'

export async function PUT(request, { params }) {
  try {
    await ensureDbInitialized()
    
    const { id } = params
    const uid = await getUidFromToken(request)
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await authService.getUserByUid(uid)
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ success: false, message: 'Group name is required' }, { status: 400 })
    }

    const group = await Group.update(id, currentUser.id, { name, description })

    if (!group) {
      return NextResponse.json({ success: false, message: 'Group not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Group updated successfully',
      group: {
        id: group.group_id,
        name: group.group_name,
        description: group.group_description
      }
    })
  } catch (error) {
    console.error('Update group error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureDbInitialized()
    
    const { id } = params
    const uid = await getUidFromToken(request)
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await authService.getUserByUid(uid)
    const result = await Group.delete(id, currentUser.id)

    if (!result) {
      return NextResponse.json({ success: false, message: 'Group not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
