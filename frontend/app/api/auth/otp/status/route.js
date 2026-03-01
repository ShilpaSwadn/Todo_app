import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/config/firebase-admin.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('id');

        if (!messageId) {
            return NextResponse.json({ success: false, message: 'Message ID is required' }, { status: 400 });
        }

        const doc = await adminDb.collection('mail').doc(messageId).get();

        if (!doc.exists) {
            return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
        }

        const data = doc.data();

        // Firebase Trigger Email extension updates the doc with delivery info
        return NextResponse.json({
            success: true,
            status: data.delivery?.state || 'PENDING',
            error: data.delivery?.error || null,
            attempts: data.delivery?.attempts || 0
        });
    } catch (error) {
        console.error('Check email status error:', error);
        return NextResponse.json({ success: false, message: 'Error checking status' }, { status: 500 });
    }
}
