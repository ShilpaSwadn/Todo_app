// Email service using Firebase Firestore collection trigger with SMTP direct send fallback
// This stores email requests in Firestore and attempts to send them directly via SMTP if configured,
// updating the status in Firestore so that the client polling API still works correctly.

import { adminDb } from '../config/firebase-admin.js';
import nodemailer from 'nodemailer';

export const sendOTPEmail = async (email, otp) => {
  try {
    // In development mode, always log to console for visibility
    if (process.env.NODE_ENV !== 'production') {
      console.log('--- OTP EMAIL (Firebase/SMTP) ---');
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('----------------------------');
    }

    const hasSmtp = !!process.env.SMTP_HOST;

    if (process.env.NODE_ENV !== 'production' && process.env.FIREBASE_EMAIL_ENABLED !== 'true' && !hasSmtp) {
      console.log('Note: FIREBASE_EMAIL_ENABLED is not set to true and no SMTP_HOST is configured. Skipping Firestore write.');
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

    // Direct SMTP dispatch if configured
    if (hasSmtp) {
      try {
        console.log('📧 Sending OTP email directly via SMTP...');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.SMTP_USER,
          to: email,
          subject: emailDoc.message.subject,
          html: emailDoc.message.html,
          text: emailDoc.message.text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ OTP email sent successfully via SMTP:', info.messageId);

        // Update Firestore document delivery status to SUCCESS so polling API resolves immediately
        await emailRef.update({
          'delivery.state': 'SUCCESS',
          'delivery.endTime': new Date(),
          'delivery.info': {
            messageId: info.messageId,
            response: info.response
          }
        });
      } catch (smtpError) {
        console.error('❌ SMTP direct send failed, updating doc state to ERROR:', smtpError);
        await emailRef.update({
          'delivery.state': 'ERROR',
          'delivery.endTime': new Date(),
          'delivery.error': smtpError.message
        });
        throw smtpError;
      }
    } else {
      console.log('📧 Firebase Extension will send it automatically');
    }

    return { success: true, messageId: emailRef.id };
  } catch (error) {
    console.error('❌ Error queuing or sending OTP email:', error);
    throw new Error('Failed to send OTP email. Please try again.');
  }
};

export const sendVerificationEmail = async (email, link) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('--- VERIFICATION EMAIL (Firebase/SMTP) ---');
      console.log(`To: ${email}`);
      console.log(`Link: ${link}`);
      console.log('------------------------------------');
    }

    const hasSmtp = !!process.env.SMTP_HOST;

    if (process.env.NODE_ENV !== 'production' && process.env.FIREBASE_EMAIL_ENABLED !== 'true' && !hasSmtp) {
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
    console.log('✅ Verification email queued in Firestore:', emailRef.id);

    // Direct SMTP dispatch if configured
    if (hasSmtp) {
      try {
        console.log('📧 Sending verification email directly via SMTP...');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.SMTP_USER,
          to: email,
          subject: emailDoc.message.subject,
          html: emailDoc.message.html,
          text: emailDoc.message.text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent successfully via SMTP:', info.messageId);

        await emailRef.update({
          'delivery.state': 'SUCCESS',
          'delivery.endTime': new Date(),
          'delivery.info': {
            messageId: info.messageId,
            response: info.response
          }
        });
      } catch (smtpError) {
        console.error('❌ SMTP direct send failed for verification, updating doc state to ERROR:', smtpError);
        await emailRef.update({
          'delivery.state': 'ERROR',
          'delivery.endTime': new Date(),
          'delivery.error': smtpError.message
        });
        throw smtpError;
      }
    } else {
      console.log('📧 Firebase Extension will send it automatically');
    }

    return { success: true, messageId: emailRef.id };
  } catch (error) {
    console.error('❌ Error queuing or sending verification email:', error);
    throw new Error('Failed to send verification email.');
  }
};
