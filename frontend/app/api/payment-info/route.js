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
    const { cardholderName, cardNumber, expiryDate, provider, cvv, fundingType } = body

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
    const cardType = securityCheck.cardMetadata.type

    // Find user's group
    const group = await Group.findByUserId(user.id)
    if (!group) return NextResponse.json({ error: 'User has no group' }, { status: 400 })

    const newPayment = await PaymentInfo.create({
      groupId: group.group_id,
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
