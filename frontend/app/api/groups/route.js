import { NextResponse } from 'next/server'
import Group from '@/lib/server/models/Group.js'
import User from '@/lib/server/models/User.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'
import authService from '@/lib/server/services/authService.js'

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await ensureDbInitialized()

    // Get current user
    const uid = await getUidFromToken(request)
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await authService.getUserByUid(uid)
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, memberIds: inputMemberIds } = body

    if (!name) {
      return NextResponse.json({ success: false, message: 'Group name is required' }, { status: 400 })
    }

    if (!inputMemberIds || !Array.isArray(inputMemberIds) || inputMemberIds.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one member must be selected' }, { status: 400 })
    }

    // Ensure the current user (owner) is always part of the member list
    const memberIds = [...new Set([...inputMemberIds, currentUser.id])]

    // Verify all members are registered and verified
    const activeMembers = await User.findActiveByIds(memberIds)
    if (activeMembers.length !== memberIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Some members are not valid or verified users'
      }, { status: 400 })
    }

    // Create the group
    const group = await Group.create(currentUser.id, {
      name,
      description,
      members: memberIds
    })

    // Format new group with membership info for frontend
    const formattedGroup = {
      id: group.group_id,
      name: group.group_name,
      description: group.group_description,
      ownerId: group.user_id,
      members: activeMembers.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name || ''}`.trim(),
        email: m.email
      })),
      createdAt: group.created_at
    }

    return NextResponse.json({
      success: true,
      message: 'Group created successfully',
      group: formattedGroup
    })
  } catch (error) {
    console.error('Group creation error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    await ensureDbInitialized()

    const uid = await getUidFromToken(request)
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await authService.getUserByUid(uid)

    // Find groups where user is owner or member
    const sqlQuery = `
      SELECT 
        g.group_id as id, 
        g.group_name as name, 
        g.group_description as description, 
        g.user_id as "ownerId", 
        g.group_members as "memberIds",
        g.created_at as "createdAt",
        g.is_active as "is_active",
        g.is_default as "is_default",
        COALESCE(ur.user_roles, ARRAY['GROUP_MEMBER']) as "userRoles"
      FROM public.groups g
      LEFT JOIN public.user_roles ur ON g.group_id = ur.group_id AND ur.user_id = $1
      WHERE (g.user_id = $1 OR $1 = ANY(g.group_members))
      ORDER BY g.is_default DESC, g.created_at DESC
    `
    const { query } = await import('@/lib/server/config/database.js')
    const result = await query(sqlQuery, [currentUser.id])

    // For each group, we need to fetch the member details
    // (This could be optimized with a complex JSON aggregate, but let's keep it simple for now)
    const groupsWithMembers = await Promise.all(result.rows.map(async (group) => {
      // Ensure owner is included in the details fetch
      const allMemberIds = [...new Set([...(group.memberIds || []), group.ownerId])]
      const memberDetails = await User.findActiveByIds(allMemberIds)

      const rolesResult = await query('SELECT user_id, user_roles FROM public.user_roles WHERE group_id = $1', [group.id])
      const rolesMap = {}
      rolesResult.rows.forEach(r => { rolesMap[r.user_id] = r.user_roles })

      // Fetch addresses for this group from relational many-to-many junction tables
      const addressesResult = await query(`
        SELECT a.address_id as id, a.address_line1 as "addressLine1", a.address_line2 as "addressLine2",
               a.city, a.state_province as "stateProvince", a.postal_code as "postalCode", a.country,
               ga.is_default
        FROM public.addresses a
        JOIN public.group_addresses ga ON ga.address_id = a.address_id
        WHERE ga.group_id = $1
        ORDER BY ga.is_default DESC, a.created_at ASC
      `, [group.id]);

      const addresses = addressesResult.rows;
      const defaultAddress = addresses.find(addr => addr.is_default) || null;

      return {
        ...group,
        address: defaultAddress,
        addresses: addresses,
        members: memberDetails.map(m => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name || ''}`.trim(),
          email: m.email,
          roles: m.id === group.ownerId ? ['GROUP_ADMIN', 'GROUP_MEMBER'] : (rolesMap[m.id] || ['GROUP_MEMBER'])
        }))
      }
    }))

    return NextResponse.json({
      success: true,
      groups: groupsWithMembers
    })
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
