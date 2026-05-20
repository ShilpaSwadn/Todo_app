import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/server/middleware/authMiddleware'
import PaymentInfo from '@/lib/server/models/PaymentInfo'
import UserRole from '@/lib/server/models/UserRole'
import { query } from '@/lib/server/config/database'

export async function DELETE(request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    const groupId = request.nextUrl.searchParams.get('groupId')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // Find the payment to get its group_id
    const paymentResult = await query('SELECT group_id FROM public.payment_info WHERE payment_details_id = $1', [id]);
    const payment = paymentResult.rows[0];
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    const targetGroupId = groupId || payment.group_id;

    // Check permissions on the target group
    const canManage = await UserRole.canManagePayments(auth.user.id, targetGroupId)
    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied. You do not have authority to delete or unlink this payment method.' }, { status: 403 })
    }

    // Perform delete or unlink via the PaymentInfo model
    await PaymentInfo.delete(id, auth.user.id, groupId);
    
    return NextResponse.json({ success: true, message: groupId ? 'Payment method unlinked successfully' : 'Payment method deleted successfully' })
  } catch (error) {
    console.error('Payment info delete error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
