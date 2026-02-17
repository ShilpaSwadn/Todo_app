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
