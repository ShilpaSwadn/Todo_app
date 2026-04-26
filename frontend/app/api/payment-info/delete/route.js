import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/server/middleware/authMiddleware'
import PaymentInfo from '@/lib/server/models/PaymentInfo'

export async function DELETE(request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    await PaymentInfo.delete(id, auth.user.id)
    return NextResponse.json({ success: true, message: 'Payment method deleted successfully' })
  } catch (error) {
    console.error('Payment info delete error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
