// Email service using Resend API (HTTP Fetch alternative to Nodemailer)
// This is more reliable for Vercel/Serverless environments

export const sendOTPEmail = async (email, otp) => {
  try {
    const API_KEY = process.env.RESEND_API_KEY;
    let FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    // Resend requires a verified domain. Gmail/Yahoo/etc won't work.
    // Use onboarding@resend.dev as a fallback for testing.
    const unverifiedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    const isPublicDomain = unverifiedDomains.some(domain => FROM_EMAIL.toLowerCase().includes(domain));

    if (isPublicDomain || !FROM_EMAIL.includes('@')) {
      console.log(`Resend: '${FROM_EMAIL}' is a public domain. Falling back to 'onboarding@resend.dev' for compatibility.`);
      FROM_EMAIL = 'onboarding@resend.dev';
    }

    if (!API_KEY && process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is missing in environment variables');
    }

    // In development, if no API key is provided, we'll just log to console
    if (!API_KEY) {
      console.log('--- DEVELOPMENT MODE: OTP EMAIL ---');
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('------------------------------------');
      return { success: true, message: 'OTP logged to console (Dev Mode)' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `${otp} is your Profile App login code`,
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API Error:', data);
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    console.log('OTP email sent via Resend:', data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    // Don't crash the whole process in dev, just throw for the API to catch
    throw new Error('Failed to send OTP email. Please try again.');
  }
};
