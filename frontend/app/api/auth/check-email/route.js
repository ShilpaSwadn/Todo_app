import { query } from '@/lib/server/config/database';
import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { email } = body;
        const targetEmail = email?.toLowerCase();

        if (!targetEmail) {
            return NextResponse.json({ message: 'Missing Email' }, { status: 400 });
        }

        // Check if user exists in the main users table
        const checkUserSql = 'SELECT id FROM public.users WHERE email = $1';
        const userResult = await query(checkUserSql, [targetEmail]);

        if (userResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                registered: false,
                message: 'This email is not registered with us.'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            registered: true,
            message: 'Email is registered.'
        });

    } catch (error) {
        console.error('Error in check-email API:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
