import nodemailer from 'nodemailer';
import config from '../config/config.js';

// Create email transporter
const createTransporter = () => {
  // Check if email is properly configured
  if (!config.email.user || config.email.user.includes('your-email') ||
      !config.email.password || config.email.password.includes('your-app-password')) {
    throw new Error('Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD in your .env file.');
  }

  // Using Gmail SMTP (you can replace with your email service)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email.user,
      pass: config.email.password, // Use app-specific password for Gmail
    },
  });
};

// Send verification PIN email
export const sendVerificationPINEmail = async (email, pin) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `Hospital Management System <${config.email.user}>`,
      to: email,
      subject: 'Email Verification - PIN Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; }
              .pin-box { background-color: #fff; border: 2px solid #2563eb; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
              .pin-code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; font-family: monospace; }
              .note { color: #666; font-size: 14px; margin-top: 10px; }
              .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verification</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering with Hospital Management System. To complete your email verification, please use the PIN code below:</p>
                
                <div class="pin-box">
                  <div class="pin-code">${pin}</div>
                  <p class="note">This PIN is valid for 10 minutes</p>
                </div>

                <p style="color: #666; font-size: 14px;">
                  <strong>Do NOT share this PIN with anyone.</strong> Our staff will never ask for your PIN.
                </p>

                <p style="color: #666; font-size: 14px;">
                  If you did not request this, please ignore this email.
                </p>

                <div class="footer">
                  <p>Hospital Management System</p>
                  <p>© ${new Date().getFullYear()} All rights reserved</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Your verification PIN is: ${pin}\n\nThis PIN is valid for 10 minutes.\n\nDo not share this PIN with anyone.`,
    };

    console.log(`📧 Attempting to send PIN email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    console.log(`📧 Response ID: ${info.response}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    console.error('❌ Full error details:', error);
    if (config.nodeEnv === 'development') {
      console.warn('⚠️ In development mode, PIN is displayed on frontend. Email service error can be ignored for testing.');
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send registration confirmation email
export const sendRegistrationConfirmationEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `Hospital Management System <${config.email.user}>`,
      to: email,
      subject: 'Registration Successful',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; }
              .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Hospital Management System</h1>
              </div>
              <div class="content">
                <p>Hello ${firstName},</p>
                <p>Your account has been successfully created. You can now login with your email and password.</p>
                
                <p style="margin-top: 20px;">
                  <a href="http://localhost:3000/login" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Login to Your Account
                  </a>
                </p>

                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  If you have any questions, please contact our support team.
                </p>

                <div class="footer">
                  <p>Hospital Management System</p>
                  <p>© ${new Date().getFullYear()} All rights reserved</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Hello ${firstName},\n\nYour account has been successfully created. You can now login with your email and password.\n\nVisit: http://localhost:3000/login`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Confirmation email send failed:', error.message);
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `Hospital Management System <${config.email.user}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; }
              .reset-button { background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
              .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You have requested to reset your password for your Hospital Management System account. Click the button below to reset your password:</p>

                <div style="text-align: center;">
                  <a href="${resetLink}" class="reset-button">Reset Password</a>
                </div>

                <div class="warning">
                  <strong>Security Notice:</strong><br>
                  This link will expire in 1 hour for your security.<br>
                  If you did not request this password reset, please ignore this email.
                </div>

                <p style="color: #666; font-size: 14px;">
                  If the button doesn't work, you can copy and paste this link into your browser:<br>
                  <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
                </p>

                <div class="footer">
                  <p>Hospital Management System</p>
                  <p>© ${new Date().getFullYear()} All rights reserved</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Password Reset Request\n\nYou have requested to reset your password. Click this link to reset: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Password reset email send failed:', error.message);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// Send account recovery email with PIN
export const sendAccountRecoveryEmail = async (email, recoveryPin) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `Hospital Management System <${config.email.user}>`,
      to: email,
      subject: 'Account Recovery PIN',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; }
              .pin-box { background-color: #fff; border: 2px solid #2563eb; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
              .pin-code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 10px; font-family: monospace; }
              .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Account Recovery PIN</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Your account has been locked due to multiple failed login attempts. Use the PIN below to verify your recovery request in the app:</p>

                <div class="pin-box">
                  <div class="pin-code">${recoveryPin}</div>
                  <p class="note">This PIN expires in 60 minutes</p>
                </div>

                <p style="color: #666; font-size: 14px;">
                  Copy and paste this PIN into the account recovery form.
                </p>

                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  If you did not request this, please ignore this email.
                </p>

                <div class="footer">
                  <p>Hospital Management System</p>
                  <p>© ${new Date().getFullYear()} All rights reserved</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Your account recovery PIN is: ${recoveryPin}\n\nThis PIN expires in 60 minutes. Copy and paste it into the account recovery form.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Account recovery email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Account recovery email send failed:', error.message);
    throw new Error(`Failed to send account recovery email: ${error.message}`);
  }
};

export default { sendVerificationPINEmail, sendRegistrationConfirmationEmail, sendPasswordResetEmail, sendAccountRecoveryEmail };
