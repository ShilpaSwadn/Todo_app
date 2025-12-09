import nodemailer from 'nodemailer'

// Create transporter for sending emails
const createTransporter = () => {
  // For development, you can use Gmail or other SMTP services
  // For production, use proper SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  // Default: Use Gmail (requires app password)
  // For production, configure proper SMTP settings
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
    }
  })
}

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@profileapp.com',
      to: email,
      subject: 'Your Login OTP - Profile App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Profile App - Login OTP</h2>
          <p>Hello,</p>
          <p>You requested a one-time password (OTP) to login to your account.</p>
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
      text: `
        Profile App - Login OTP
        
        Your OTP is: ${otp}
        
        This OTP will expire in 10 minutes.
        
        If you didn't request this OTP, please ignore this email.
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('OTP email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending OTP email:', error)
    throw new Error('Failed to send OTP email. Please try again.')
  }
}
