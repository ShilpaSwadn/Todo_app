import { NextResponse } from 'next/server'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit'
import PaymentInfo from '@/lib/server/models/PaymentInfo'
import Group from '@/lib/server/models/Group'
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

    const payments = await PaymentInfo.findByUserId(user.id)
    return NextResponse.json(payments)
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
    console.log('Payment POST Request Body:', { ...body, cardNumber: '****', cvv: '***' })
    const { cardholderName, cardNumber, expiryDate, provider, cvv, fundingType, groupId } = body
    
    // 1. Perform Security Validation
    const securityCheck = validatePaymentSecurity({ cardNumber, expiryDate, cvv })
    console.log('Security Validation Result:', securityCheck.isValid, securityCheck.errors)
    
    if (!securityCheck.isValid) {
      return NextResponse.json({ 
        error: 'Security Validation Failed', 
        details: securityCheck.errors 
      }, { status: 400 })
    }

    // 2. Prepare data for storage (Only storing safe parts)
    const lastFour = cardNumber.toString().slice(-4)

    // 3. Resolve Target Group
    let targetGroupId = groupId;
    
    if (!targetGroupId) {
      // Find the specific 'default group' for this user
      const sqlQuery = 'SELECT group_id FROM public.groups WHERE user_id = $1 AND group_name = $2';
      const { query: dbQuery } = await import('@/lib/server/config/database');
      const result = await dbQuery(sqlQuery, [user.id, 'default group']);
      
      if (result.rows.length > 0) {
        targetGroupId = result.rows[0].group_id;
      } else {
        // Fallback to any group if 'default group' doesn't exist (safety)
        const anyGroup = await Group.findByUserId(user.id);
        if (!anyGroup) return NextResponse.json({ error: 'User has no available groups' }, { status: 400 });
        targetGroupId = anyGroup.group_id;
      }
    } else {
      // Verify group exists and belongs to user (or user is member)
      const groupExists = await Group.findById(targetGroupId);
      if (!groupExists) {
        return NextResponse.json({ error: 'Specified group not found' }, { status: 404 });
      }
    }

    const newPayment = await PaymentInfo.create({
      groupId: targetGroupId,
      userId: user.id,
      cardholderName,
      cardNumber: lastFour, // Mapping the safe digits to the new column name
      expiryDate,
      provider: provider || 'Secure Integration',
      cardBrand: securityCheck.cardMetadata.brand,
      fundingType: fundingType || securityCheck.cardMetadata.type, // Use provided type or fallback to auto-detection
      isVerified: true
    })

    return NextResponse.json(newPayment)
  } catch (error) {
    console.error('Payment info create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
