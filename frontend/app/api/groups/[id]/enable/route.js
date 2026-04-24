import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/server/middleware/authMiddleware'
import Group from '@/lib/server/models/Group'

export async function POST(request, { params }) {
  try {
    console.log('API: Group Enable request received for ID:', params.id);
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.id
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    await Group.enable(groupId, auth.user.id)
    console.log('API: Group enabled successfully');
    return NextResponse.json({ success: true, message: 'Group enabled successfully' })
  } catch (error) {
    console.error('API Error: Failed to enable group:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
