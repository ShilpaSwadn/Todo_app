import { query } from '@/lib/server/config/database.js';
import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';
import { sendOTPEmail } from '@/lib/server/services/emailService.js';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { uid, email, firstName, lastName, mobileNumber } = body;
        const targetEmail = email?.toLowerCase();

        if (!targetEmail) {
            return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
        }

        // Optimized combined sync and OTP generation
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Single DB roundtrip for User Sync + OTP Creation
        const sql = `
            WITH sync_user AS (
                -- Try to find in temp_users and move/upsert to main users
                INSERT INTO public.users (uid, email, first_name, last_name, mobile_number, is_verified)
                SELECT 
                    COALESCE($1, t.uid), 
                    COALESCE($2, t.email), 
                    COALESCE($3, t.first_name, 'User'), 
                    COALESCE($4, t.last_name, ''), 
                    COALESCE($5, t.mobile_number), 
                    true
                FROM (SELECT 1) dummy
                LEFT JOIN public.temp_users t ON t.email = $2 OR t.uid = $1
                ON CONFLICT (email) DO UPDATE SET 
                    uid = EXCLUDED.uid,
                    is_verified = true,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, uid, email, first_name, last_name, mobile_number
            ),
            cleanup_temp AS (
                DELETE FROM public.temp_users WHERE email = $2 OR uid = $1
            ),
            existing_otp_cleanup AS (
                DELETE FROM public.otps WHERE email = $2
            )
            INSERT INTO public.otps (email, otp, expires_at)
            VALUES ($2, $6, $7)
            RETURNING (SELECT json_build_object(
                'id', id,
                'uid', uid,
                'email', email,
                'firstName', first_name,
                'lastName', last_name,
                'mobileNumber', mobile_number
            ) FROM sync_user) as user_data;
        `;

        const result = await query(sql, [
            uid,
            targetEmail,
            firstName,
            lastName,
            mobileNumber,
            otp,
            expiresAt
        ]);

        if (result.rows.length === 0) {
            throw new Error('Failed to prepare login');
        }

        const user = result.rows[0].user_data;

        // Send Email - Start but don't strictly await if we want maximum speed, 
        // though it's safer to await for confirming delivery.
        // We'll use Promise.all to handle background tasks if any
        try {
            await sendOTPEmail(targetEmail, otp);
        } catch (emailError) {
            console.error('Email delivery failure:', emailError);
            return NextResponse.json({
                success: false,
                message: 'Failed to send OTP email: ' + emailError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Login prepared and OTP sent',
            user
        });

    } catch (error) {
        console.error('Login Prepare Error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to prepare login'
        }, { status: 500 });
    }
}
