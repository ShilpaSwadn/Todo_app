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
    const { address, addressId, action } = body

    const isAuthorized = await UserRole.canManageAddress(currentUser.id, id);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: 'Group not found or unauthorized' }, { status: 404 })
    }

    let group;

    if (action === 'delete') {
      if (!addressId) return NextResponse.json({ success: false, message: 'Address ID required' }, { status: 400 })
      group = await Group.removeAddress(id, addressId)
    } else {
      if (!address) return NextResponse.json({ success: false, message: 'Address required' }, { status: 400 })
      
      const { country, countryCode } = address
      if (!country) {
        return NextResponse.json({ success: false, message: 'Country is required.' }, { status: 400 })
      }
      
      // Ensure at least some address content exists
      const hasContent = Object.keys(address).some(key => 
        !['country', 'countryCode', 'id'].includes(key) && address[key] && address[key].toString().trim().length > 0
      )
      
      if (!hasContent) {
        return NextResponse.json({ success: false, message: 'Address details are missing. Please fill in the required fields.' }, { status: 400 })
      }

      if (action === 'update' && addressId) {
        group = await Group.editAddress(id, addressId, address)
      } else {
        const targetGroup = await Group.findById(id)
        if (!targetGroup) {
          return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })
        }
        
        if (targetGroup.is_default) {
          const addressCount = targetGroup.addresses ? targetGroup.addresses.length : (targetGroup.address && Object.keys(targetGroup.address).length > 0 ? 1 : 0);
          if (addressCount >= 1) {
            return NextResponse.json({ success: false, message: 'Default group can only have one address.' }, { status: 400 })
          }
        }
        
        group = await Group.addAddress(id, address)
      }
    }

    if (!group) {
      return NextResponse.json({ success: false, message: 'Group not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Group address updated successfully',
      group: {
        id: group.group_id,
        name: group.group_name,
        address: group.address,
        addresses: group.addresses
      }
    })
  } catch (error) {
    console.error('Update group address error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
