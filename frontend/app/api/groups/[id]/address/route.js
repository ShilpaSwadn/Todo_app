import { NextResponse } from 'next/server'
import Group from '@/lib/server/models/Group.js'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware.js'
import authService from '@/lib/server/services/authService.js'
import UserRole from '@/lib/server/models/UserRole.js'

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
    const { address } = body

    if (address !== null) {
      const { addressLine1, city, stateProvince, postalCode, country } = address
      if (!addressLine1 || !city || !stateProvince || !postalCode || !country) {
        return NextResponse.json({ success: false, message: 'Invalid address format. Missing required fields.' }, { status: 400 })
      }
      
      // Basic validation checks matching frontend configs
      if (addressLine1.length < 5 || addressLine1.length > 100) return NextResponse.json({ success: false, message: 'Address Line 1 must be between 5 and 100 characters.' }, { status: 400 })
      if (city.length < 2 || city.length > 50) return NextResponse.json({ success: false, message: 'City must be between 2 and 50 characters.' }, { status: 400 })
      if (stateProvince.length < 2 || stateProvince.length > 50) return NextResponse.json({ success: false, message: 'State/Province must be between 2 and 50 characters.' }, { status: 400 })
      if (country.length < 2 || country.length > 50) return NextResponse.json({ success: false, message: 'Country must be between 2 and 50 characters.' }, { status: 400 })
      if (!/^[a-zA-Z0-9 -]{3,10}$/.test(postalCode)) return NextResponse.json({ success: false, message: 'Invalid Postal Code format.' }, { status: 400 })
    }

    const isAuthorized = await UserRole.canManageAddress(currentUser.id, id);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: 'Group not found or unauthorized' }, { status: 404 })
    }

    const group = await Group.updateAddress(id, address)

    if (!group) {
      return NextResponse.json({ success: false, message: 'Group not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Group address updated successfully',
      group: {
        id: group.group_id,
        name: group.group_name,
        address: group.address
      }
    })
  } catch (error) {
    console.error('Update group address error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
