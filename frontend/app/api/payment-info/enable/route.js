import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/server/middleware/authMiddleware'
import PaymentInfo from '@/lib/server/models/PaymentInfo'

export async function POST(request) {
  try {
    console.log('API: Payment Enable request received');
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    console.log('API: Enabling payment ID:', id, 'for user:', auth.user.id);
    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    await PaymentInfo.enable(id, auth.user.id)
    console.log('API: Payment enabled successfully');
    return NextResponse.json({ success: true, message: 'Payment method enabled successfully' })
  } catch (error) {
    console.error('API Error: Failed to enable payment:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
