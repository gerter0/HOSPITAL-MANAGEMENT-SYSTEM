import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testEmail() {
  try {
    console.log('🧪 Testing Email Service...\n');
    console.log('📧 Email User:', process.env.EMAIL_USER);
    console.log('📧 Email Service:', process.env.EMAIL_SERVICE);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Test connection
    console.log('\n🔐 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    // Send test email
    console.log('📤 Sending test email to enterochad@gmail.com...\n');
    const info = await transporter.sendMail({
      from: `Hospital System Test <${process.env.EMAIL_USER}>`,
      to: 'enterochad@gmail.com',
      subject: '🧪 Hospital System - Test Email (PIN: 123456)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Service Test</h2>
          <p>This is a test email from the Hospital Management System.</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0;">123456</h1>
            <p style="color: #666;">Test PIN Code</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you received this email, the email service is working correctly!
          </p>
          <p style="color: #999; font-size: 12px;">
            Test sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: 'Test PIN: 123456\n\nIf you received this email, the email service is working correctly!',
    });

    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📮 Response:', info.response);
    console.log('\n✨ Check your email (enterochad@gmail.com) to verify receipt!\n');
    
  } catch (error) {
    console.error('\n❌ Email test failed:');
    console.error('Error Message:', error.message);
    console.error('\nFull Error:', error);
    
    if (error.message.includes('Invalid login')) {
      console.error('\n⚠️  Gmail might be blocking the login. Try:');
      console.error('1. Enable "Less secure app access" in Gmail settings');
      console.error('2. Or use an "App password" instead of regular password');
      console.error('3. Ensure 2FA is enabled on the Gmail account');
    }
    
    process.exit(1);
  }
}

testEmail();
