import { NextResponse } from 'next/server'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit'
import PaymentInfo from '@/lib/server/models/PaymentInfo'
import Group from '@/lib/server/models/Group'
import UserRole from '@/lib/server/models/UserRole'
import authService from '@/lib/server/services/authService'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware'
import { validatePaymentSecurity } from '@/lib/server/services/securityValidator'

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await ensureDbInitialized()
    const uid = await getUidFromToken(request)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await authService.getUserByUid(uid)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Find all groups user is part of
    const userGroups = await Group.findByMemberId(user.id)
    
    // Filter groups where user has viewing permissions for payments
    const authorizedGroups = await Promise.all(userGroups.map(async (group) => {
      const canView = await UserRole.canViewPayments(user.id, group.group_id)
      return canView ? group.group_id : null
    }))
    
    const validGroupIds = authorizedGroups.filter(id => id !== null)
    
    if (validGroupIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch payments for all valid groups
    const payments = await Promise.all(validGroupIds.map(id => PaymentInfo.findByGroupId(id)))
    return NextResponse.json(payments.flat())
  } catch (error) {
    console.error('Payment info fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await ensureDbInitialized()
    const uid = await getUidFromToken(request)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await authService.getUserByUid(uid)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await request.json()
    const { cardholderName, cardNumber, expiryDate, provider, cvv, fundingType, groupId, groupIds } = body
    
    // Perform Security Validation
    const securityCheck = validatePaymentSecurity({ cardNumber, expiryDate, cvv })
    if (!securityCheck.isValid) {
      return NextResponse.json({ error: 'Security Validation Failed', details: securityCheck.errors }, { status: 400 })
    }

    // Resolve Target Group IDs
    let targetGroupIds = groupIds;
    if (!targetGroupIds || !Array.isArray(targetGroupIds) || targetGroupIds.length === 0) {
      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        const sqlQuery = 'SELECT group_id FROM public.groups WHERE user_id = $1 AND is_default = true';
        const { query: dbQuery } = await import('@/lib/server/config/database');
        const result = await dbQuery(sqlQuery, [user.id]);
        if (result.rows.length > 0) resolvedGroupId = result.rows[0].group_id;
        else {
          const anyGroup = await Group.findByUserId(user.id);
          if (!anyGroup) return NextResponse.json({ error: 'User has no available groups' }, { status: 400 });
          resolvedGroupId = anyGroup.group_id;
        }
      }
      targetGroupIds = [resolvedGroupId];
    }

    // Check Permissions for all target groups
    for (const gid of targetGroupIds) {
      const canManage = await UserRole.canManagePayments(user.id, gid)
      if (!canManage) {
        return NextResponse.json({ error: `Permission denied. You do not have authority to add payments to group: ${gid}` }, { status: 403 })
      }
    }

    const lastFour = cardNumber.toString().slice(-4)
    const newPayment = await PaymentInfo.create({
      groupIds: targetGroupIds,
      groupId: targetGroupIds[0],
      userId: user.id,
      cardholderName,
      cardNumber: lastFour,
      expiryDate,
      provider: provider || 'Secure Integration',
      cardBrand: securityCheck.cardMetadata.brand,
      fundingType: fundingType || securityCheck.cardMetadata.type,
      isVerified: true
    })

    return NextResponse.json(newPayment)
  } catch (error) {
    console.error('Payment info create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    await ensureDbInitialized()
    const uid = await getUidFromToken(request)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await authService.getUserByUid(uid)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await request.json()
    const { paymentDetailsId, cardholderName, expiryDate, provider, fundingType, groupId, groupIds, currentGroupId } = body
    
    // Resolve Target Group IDs
    const targetGroupIds = groupIds && Array.isArray(groupIds) && groupIds.length > 0 ? groupIds : (groupId ? [groupId] : []);
    
    // Check if user has manage permission in at least one of the current or target groups
    const currentGroupsToCheck = currentGroupId ? [currentGroupId] : (groupId ? [groupId] : []);
    const allGroupsToCheck = [...new Set([...currentGroupsToCheck, ...targetGroupIds])];
    const permissionResults = await Promise.all(allGroupsToCheck.map(gid => UserRole.canManagePayments(user.id, gid)));
    if (!permissionResults.some(Boolean)) {
      return NextResponse.json({ error: 'Permission denied. You do not have authority to update this payment method.' }, { status: 403 })
    }

    const updatedPayment = await PaymentInfo.update(paymentDetailsId, {
      cardholderName,
      expiryDate,
      provider,
      fundingType,
      groupId: targetGroupIds[0],
      groupIds: targetGroupIds
    })

    return NextResponse.json({ success: true, payment: updatedPayment })
  } catch (error) {
    console.error('Payment info update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
