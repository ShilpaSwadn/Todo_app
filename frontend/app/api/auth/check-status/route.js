import { query } from '@/lib/server/config/database';
import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';
import User from '@/lib/server/models/User.js';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { identifier } = body;

        if (!identifier) {
            return NextResponse.json({ success: false, message: 'Identifier is required' }, { status: 400 });
        }

        const cleanIdentifier = identifier.trim().toLowerCase();

        // Check in both tables using the improved findByIdentifier
        const user = await User.findByIdentifier(cleanIdentifier, true);

        if (user) {
            return NextResponse.json({
                success: true,
                exists: true,
                isVerified: user.isVerified,
                email: user.email,
                source: user.id ? 'users' : 'temp_users',
                message: user.isVerified ? 'User is verified' : 'User exists but is not verified'
            });
        }

        return NextResponse.json({
            success: true,
            exists: false,
            message: 'User not found'
        });

    } catch (error) {
        console.error('Check Status Error:', error);
        return NextResponse.json({
            success: false,
            message: 'Error checking user status',
            error: error.message
        }, { status: 500 });
    }
}
