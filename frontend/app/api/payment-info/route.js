import { NextResponse } from 'next/server'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit'
import PaymentInfo from '@/lib/server/models/PaymentInfo'
import Group from '@/lib/server/models/Group'
import UserRole from '@/lib/server/models/UserRole'
import authService from '@/lib/server/services/authService'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware'
import { validatePaymentSecurity } from '@/lib/server/services/securityValidator'

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
    const { cardholderName, cardNumber, expiryDate, provider, cvv, fundingType, groupId } = body
    
    // Perform Security Validation
    const securityCheck = validatePaymentSecurity({ cardNumber, expiryDate, cvv })
    if (!securityCheck.isValid) {
      return NextResponse.json({ error: 'Security Validation Failed', details: securityCheck.errors }, { status: 400 })
    }

    // Resolve Target Group
    let targetGroupId = groupId;
    if (!targetGroupId) {
      const sqlQuery = 'SELECT group_id FROM public.groups WHERE user_id = $1 AND is_default = true';
      const { query: dbQuery } = await import('@/lib/server/config/database');
      const result = await dbQuery(sqlQuery, [user.id]);
      if (result.rows.length > 0) targetGroupId = result.rows[0].group_id;
      else {
        const anyGroup = await Group.findByUserId(user.id);
        if (!anyGroup) return NextResponse.json({ error: 'User has no available groups' }, { status: 400 });
        targetGroupId = anyGroup.group_id;
      }
    }

    // Check Permissions
    const canManage = await UserRole.canManagePayments(user.id, targetGroupId)
    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied. You do not have authority to add payments to this group.' }, { status: 403 })
    }

    const lastFour = cardNumber.toString().slice(-4)
    const newPayment = await PaymentInfo.create({
      groupId: targetGroupId,
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
    const { paymentDetailsId, cardholderName, expiryDate, provider, fundingType, groupId, currentGroupId } = body
    
    // Check Permissions
    const canManage = await UserRole.canManagePayments(user.id, currentGroupId || groupId)
    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 })
    }

    if (groupId && currentGroupId && groupId !== currentGroupId) {
      const canManageTarget = await UserRole.canManagePayments(user.id, groupId)
      if (!canManageTarget) {
        return NextResponse.json({ error: 'Permission denied for target group.' }, { status: 403 })
      }
    }

    const updatedPayment = await PaymentInfo.update(paymentDetailsId, {
      cardholderName,
      expiryDate,
      provider,
      fundingType,
      groupId
    })

    return NextResponse.json({ success: true, payment: updatedPayment })
  } catch (error) {
    console.error('Payment info update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
