import nodemailer from 'nodemailer';

// Create a transporter using SMTP settings from environment variables
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

    // In development mode, if SMTP settings are missing, log to console
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('--- DEVELOPMENT MODE: OTP EMAIL (Nodemailer) ---');
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log('Note: Add SMTP_USER and SMTP_PASS to .env.local to send real emails.');
        console.log('------------------------------------------------');
        return { success: true, message: 'OTP logged to console (Dev Mode)' };
      } else {
        throw new Error('SMTP credentials are missing in production');
      }
    }

    const mailOptions = {
      from: `"Todo App" <${fromEmail}>`,
      to: email,
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
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email with Nodemailer:', error);
    throw new Error('Failed to send OTP email. Please try again.');
  }
};
