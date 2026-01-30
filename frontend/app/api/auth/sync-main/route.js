import { query } from '@/lib/server/config/database';
import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/server/middleware/dbInit.js';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { uid, email } = body;
        const targetEmail = email?.toLowerCase();

        console.log('Sync-main: Request received with UID:', uid, 'Email:', targetEmail);

        if (!uid && !targetEmail) {
            return NextResponse.json({ error: 'Missing UID or Email' }, { status: 400 });
        }

        // 1. Fetch from temp_users first to get all data including UID if missing
        let tempUser = null;
        if (uid && targetEmail) {
            const tempResult = await query('SELECT * FROM public.temp_users WHERE uid = $1 OR email = $2', [uid, targetEmail]);
            tempUser = tempResult.rows[0];
        } else if (uid) {
            const tempResult = await query('SELECT * FROM public.temp_users WHERE uid = $1', [uid]);
            tempUser = tempResult.rows[0];
        } else if (targetEmail) {
            const tempResult = await query('SELECT * FROM public.temp_users WHERE email = $1', [targetEmail]);
            tempUser = tempResult.rows[0];
        }

        if (tempUser) {
            console.log('Sync-main: Found user in temp_users:', tempUser.email);
            // Use potentially better identifiers from temp table
            const finalUid = uid || tempUser.uid;
            const finalEmail = targetEmail || tempUser.email;

            // 2. Check main table
            let userResult;
            if (finalUid && finalEmail) {
                userResult = await query('SELECT * FROM public.users WHERE uid = $1 OR email = $2', [finalUid, finalEmail]);
            } else if (finalUid) {
                userResult = await query('SELECT * FROM public.users WHERE uid = $1', [finalUid]);
            } else {
                userResult = await query('SELECT * FROM public.users WHERE email = $1', [finalEmail]);
            }

            if (userResult.rows.length > 0) {
                const existingUser = userResult.rows[0];
                console.log('Sync-main: User already in main table, updating verification status and UID.');

                await query(`
                    UPDATE public.users 
                    SET uid = $1, is_verified = true 
                    WHERE id = $2
                `, [finalUid, existingUser.id]);

                // Refresh data
                const updatedResult = await query('SELECT * FROM public.users WHERE id = $1', [existingUser.id]);
                const user = updatedResult.rows[0];

                // Cleanup temp
                if (finalUid && finalEmail) {
                    await query('DELETE FROM public.temp_users WHERE uid = $1 OR email = $2', [finalUid, finalEmail]);
                } else if (finalUid) {
                    await query('DELETE FROM public.temp_users WHERE uid = $1', [finalUid]);
                } else {
                    await query('DELETE FROM public.temp_users WHERE email = $1', [finalEmail]);
                }

                const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
                return NextResponse.json({ success: true, message: 'User updated in main table', token, user });
            }

            // 3. Not in main table, insert it
            console.log('Sync-main: Moving user from temp to main.');
            const insertMainSql = `
                INSERT INTO public.users (uid, email, first_name, last_name, mobile_number, password, profile_picture, is_verified, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            const insertValues = [
                tempUser.uid,
                tempUser.email,
                tempUser.first_name,
                tempUser.last_name,
                tempUser.mobile_number,
                tempUser.password,
                tempUser.profile_picture,
                true,
                tempUser.created_at
            ];

            const mainResult = await query(insertMainSql, insertValues);
            const user = mainResult.rows[0];

            // Cleanup
            if (tempUser.uid && tempUser.email) {
                await query('DELETE FROM public.temp_users WHERE uid = $1 OR email = $2', [tempUser.uid, tempUser.email]);
            } else if (tempUser.uid) {
                await query('DELETE FROM public.temp_users WHERE uid = $1', [tempUser.uid]);
            } else {
                await query('DELETE FROM public.temp_users WHERE email = $1', [tempUser.email]);
            }

            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return NextResponse.json({
                success: true,
                message: 'User moved to main table',
                token,
                user: {
                    id: user.id,
                    uid: user.uid,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    mobileNumber: user.mobile_number,
                    createdAt: user.created_at
                }
            });
        }

        // 4. Not in temp table, check if already in main table as fallback
        let existingResult;
        if (uid && targetEmail) {
            existingResult = await query('SELECT * FROM public.users WHERE uid = $1 OR email = $2', [uid, targetEmail]);
        } else if (uid) {
            existingResult = await query('SELECT * FROM public.users WHERE uid = $1', [uid]);
        } else {
            existingResult = await query('SELECT * FROM public.users WHERE email = $1', [targetEmail]);
        }

        if (existingResult.rows.length > 0) {
            const user = existingResult.rows[0];
            console.log('Sync-main: Already in main table, ensuring verified status:', user.email);

            // Fix verification status if needed
            if (!user.is_verified) {
                await query('UPDATE public.users SET is_verified = true WHERE id = $1', [user.id]);
                user.is_verified = true;
            }

            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return NextResponse.json({
                success: true,
                message: 'User already in main table',
                token,
                user: {
                    id: user.id,
                    uid: user.uid,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    mobileNumber: user.mobile_number,
                    createdAt: user.created_at
                }
            });
        }

        // 5. Special Case: Social Login (Google) - Auto-register if not found
        if (body.isSocial) {
            console.log('Sync-main: Social login user not found, performing auto-registration:', targetEmail);
            const insertMainSql = `
                INSERT INTO public.users (uid, email, first_name, last_name, profile_picture, is_verified, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING *
            `;
            const mainResult = await query(insertMainSql, [
                uid,
                targetEmail,
                body.firstName || 'User',
                body.lastName || '',
                body.profilePicture || null,
                true
            ]);
            const user = mainResult.rows[0];
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return NextResponse.json({
                success: true,
                message: 'Social user auto-registered',
                token,
                user: {
                    id: user.id,
                    uid: user.uid,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    mobileNumber: user.mobile_number,
                    createdAt: user.created_at
                }
            });
        }

        console.error('Sync-main: User not found anywhere:', uid || targetEmail);
        return NextResponse.json({ error: 'User not found in temporary storage' }, { status: 404 });

    } catch (error) {
        console.error('Error in sync-main API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
