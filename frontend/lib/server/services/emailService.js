// Email service using Firebase Firestore collection trigger
// This stores email requests in Firestore, and Firebase Extension sends them automatically

import { adminDb } from '../config/firebase-admin.js';

export const sendOTPEmail = async (email, otp) => {
  try {
    // In development mode, always log to console for visibility
    if (process.env.NODE_ENV !== 'production') {
      console.log('--- OTP EMAIL (Firebase) ---');
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('----------------------------');
    }

    if (process.env.NODE_ENV !== 'production' && process.env.FIREBASE_EMAIL_ENABLED !== 'true') {
      console.log('Note: FIREBASE_EMAIL_ENABLED is not set to true. Skipping Firestore write.');
      return { success: true, message: 'OTP logged to console (Dev Mode)', isLoggedOnly: true };
    }
    // Store email request in Firestore 'mail' collection
    // Firebase "Trigger Email" extension automatically sends emails from this collection
    const emailDoc = {
      to: email,
      message: {
        subject: `${otp} is your verification code`,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5; text-align: center;">Login Verification</h2>
            <p>Use the following code to sign in to your account. This code will expire in 10 minutes.</p>
            <div style="background: #F3F4F6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #6B7280; text-align: center;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      },
      // Optional: Track delivery status
      delivery: {
        startTime: new Date(),
        state: 'PENDING',
      },
    };

    // Add document to 'mail' collection
    const emailRef = await adminDb.collection('mail').add(emailDoc);

    console.log('✅ Email queued in Firestore:', emailRef.id);
    console.log('📧 Firebase Extension will send it automatically');

    return { success: true, messageId: emailRef.id };
  } catch (error) {
    console.error('❌ Error queuing OTP email in Firestore:', error);
    throw new Error('Failed to send OTP email. Please try again.');
  }
};
export const sendVerificationEmail = async (email, link) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('--- VERIFICATION EMAIL (Firebase) ---');
      console.log(`To: ${email}`);
      console.log(`Link: ${link}`);
      console.log('------------------------------------');
    }

    if (process.env.NODE_ENV !== 'production' && process.env.FIREBASE_EMAIL_ENABLED !== 'true') {
      return { success: true, message: 'Link logged to console (Dev Mode)', isLoggedOnly: true };
    }

    const emailDoc = {
      to: email,
      message: {
        subject: 'Activate your account',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5; text-align: center;">Account Activation</h2>
            <p>Click the button below to verify your email address and activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email</a>
            </div>
            <p style="font-size: 12px; color: #6B7280; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser: <br>
              <span style="word-break: break-all; color: #4F46E5;">${link}</span>
            </p>
          </div>
        `,
        text: `Please verify your email by clicking this link: ${link}`,
      },
      delivery: {
        startTime: new Date(),
        state: 'PENDING',
      },
    };

    const emailRef = await adminDb.collection('mail').add(emailDoc);
    return { success: true, messageId: emailRef.id };
  } catch (error) {
    console.error('❌ Error queuing verification email:', error);
    throw new Error('Failed to send verification email.');
  }
};
