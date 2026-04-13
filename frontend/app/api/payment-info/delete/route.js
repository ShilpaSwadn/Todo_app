import { NextResponse } from 'next/server'
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit'
import PaymentInfo from '@/lib/server/models/PaymentInfo'
import { getUidFromToken } from '@/lib/server/middleware/authMiddleware'

export async function DELETE(request) {
  try {
    await ensureDbInitialized()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const uid = await getUidFromToken(request)
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // In a real app, verify that the payment info belongs to the user
    await PaymentInfo.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment info delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
