import { NextResponse } from 'next/server';
import authService from '@/lib/server/services/authService.js';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
        }

        // Since verification is handled by Firebase Client SDK (applyActionCode),
        // and that SDK triggers a state change, the client will usually call /api/auth/login
        // to sync the user. However, for the /verify page specifically, we need a way
        // to ensure the user is 'active' in our DB after they verify their email.

        const user = await authService.syncUser({ email, uid: body.uid });

        return NextResponse.json({
            success: true,
            message: 'User synchronization successful',
            data: { user }
        });
    } catch (error) {
        console.error('Verify Sync error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Error synchronizing user'
        }, { status: 500 });
    }
}
