import { NextResponse } from 'next/server'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'
import authService from '@/lib/server/services/authService.js'
import UserRole from '@/lib/server/models/UserRole.js'
import Group from '@/lib/server/models/Group.js'

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await ensureDbInitialized()
    const uid = await getUidFromToken(request)
    if (!uid) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const currentUser = await authService.getUserByUid(uid)
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (groupId) {
      // Check if user is member of this group or admin
      const roles = await UserRole.getRolesByGroup(groupId)
      return NextResponse.json({ success: true, roles })
    }

    // If no groupId, return groups the user has access to (already handled by /api/groups, but we can return here too if needed)
    return NextResponse.json({ success: false, message: 'GroupId required' }, { status: 400 })
  } catch (error) {
    console.error('User roles GET error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await ensureDbInitialized()
    const uid = await getUidFromToken(request)
    if (!uid) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const currentUser = await authService.getUserByUid(uid)
    const body = await request.json()
    const { userIds, groupId, role, roles } = body
    
    // Normalize roles to a flat array of strings
    let rolesToSet = roles || role;
    if (rolesToSet && !Array.isArray(rolesToSet)) {
      rolesToSet = [rolesToSet];
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !groupId || !rolesToSet) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    // Check if current user is GROUP_ADMIN of this group OR the group owner
    const [currentRoles, group] = await Promise.all([
      UserRole.getUserRoles(currentUser.id, groupId),
      Group.findById(groupId)
    ])
    
    const isOwner = group && group.user_id === currentUser.id
    const isAdmin = currentRoles.includes('GROUP_ADMIN')


    if (!isAdmin && !isOwner) {
      return NextResponse.json({ 
        success: false, 
        message: 'Permission denied. Only GROUP_ADMIN or Group Owner can manage roles.',
        debug: { roles: currentRoles, isOwner }
      }, { status: 403 })
    }

    const updatedRoles = await UserRole.setBulkRoles(userIds, groupId, rolesToSet)

    return NextResponse.json({
      success: true,
      message: `${userIds.length} user role(s) updated successfully`,
      updatedRoles: updatedRoles
    })
  } catch (error) {
    console.error('User roles POST error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
