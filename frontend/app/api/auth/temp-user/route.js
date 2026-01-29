import { query } from '@/lib/server/config/database';
import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const { uid, email, firstName, lastName, mobileNumber, profilePicture } = await request.json();
        console.log('Temp-user: Storing data for UID:', uid, 'Email:', email);

        if (!uid || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const cleanEmail = email.toLowerCase();

        // 1. Check if email already exists in main table
        const emailCheck = await query('SELECT id FROM public.users WHERE email = $1', [cleanEmail]);
        if (emailCheck.rows.length > 0) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        }

        // 2. Check if mobile number already exists in main table
        if (mobileNumber) {
            const mobileCheck = await query('SELECT id FROM public.users WHERE mobile_number = $1', [mobileNumber]);
            if (mobileCheck.rows.length > 0) {
                return NextResponse.json({ error: 'Mobile number already registered' }, { status: 400 });
            }
        }

        // 3. Check if mobile number already exists in temp table (for a DIFFERENT UID)
        if (mobileNumber) {
            const tempMobileCheck = await query('SELECT uid FROM public.temp_users WHERE mobile_number = $1 AND uid != $2', [mobileNumber, uid]);
            if (tempMobileCheck.rows.length > 0) {
                return NextResponse.json({ error: 'Mobile number already registered' }, { status: 400 });
            }
        }

        // Store in temp_users table
        const sql = `
            INSERT INTO temp_users (uid, email, first_name, last_name, mobile_number, profile_picture, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (uid) DO UPDATE SET
                email = EXCLUDED.email,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                mobile_number = EXCLUDED.mobile_number,
                profile_picture = EXCLUDED.profile_picture,
                is_verified = EXCLUDED.is_verified
            RETURNING *
        `;
        const values = [uid, email.toLowerCase(), firstName, lastName, mobileNumber, profilePicture, false];

        await query(sql, values);

        return NextResponse.json({ success: true, message: 'Stored in temp_users' });
    } catch (error) {
        console.error('Error in temp-user API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
