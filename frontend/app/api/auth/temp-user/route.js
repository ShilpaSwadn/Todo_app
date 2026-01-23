import { query } from '@/lib/server/config/database';
import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@lib/server/middleware/dbInit.js';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const { uid, email, firstName, lastName, mobileNumber } = await request.json();
        console.log('Temp-user: Storing data for UID:', uid, 'Email:', email);

        if (!uid || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Store in temp_users table
        const sql = `
            INSERT INTO temp_users (uid, email, first_name, last_name, mobile_number, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (uid) DO UPDATE SET
                email = EXCLUDED.email,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                mobile_number = EXCLUDED.mobile_number,
                is_verified = EXCLUDED.is_verified
            RETURNING *
        `;
        const values = [uid, email.toLowerCase(), firstName, lastName, mobileNumber, false];

        await query(sql, values);

        return NextResponse.json({ success: true, message: 'Stored in temp_users' });
    } catch (error) {
        console.error('Error in temp-user API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
