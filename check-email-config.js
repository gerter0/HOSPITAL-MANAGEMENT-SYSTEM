import config from './backend/src/config/config.js';

console.log('🔍 Email Configuration Check');
console.log('===========================');

console.log(`EMAIL_USER: ${config.email.user}`);
console.log(`EMAIL_PASSWORD: ${config.email.password ? '***SET***' : 'NOT SET'}`);
console.log(`EMAIL_SERVICE: ${config.email.service}`);

const emailConfigured =
  config.email.user &&
  !config.email.user.includes('your-email') &&
  config.email.password &&
  !config.email.password.includes('your-app-password');

console.log(`\n📧 Email Service Status: ${emailConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);

if (!emailConfigured) {
  console.log('\n⚠️  To enable email sending:');
  console.log('1. Edit the .env file in the project root');
  console.log('2. Set EMAIL_USER to your Gmail address');
  console.log('3. Set EMAIL_PASSWORD to your Gmail App Password');
  console.log('4. Restart the backend server');
  console.log('\n📖 Gmail App Password Setup:');
  console.log('   https://support.google.com/accounts/answer/185833');
} else {
  console.log('\n✅ Email service is ready to send recovery emails!');
}