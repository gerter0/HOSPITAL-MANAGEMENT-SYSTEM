// Move to backend directory first
const path = require('path');
process.chdir(path.join(__dirname, 'backend'));

// Now load the backend's config
const executeQuery = require('./src/config/database').default || require('./src/config/database');

async function testProfile() {
  try {
    // Get first user with patient record
    const [users] = await executeQuery(
      'SELECT u.id as user_id, u.email, p.patient_id FROM users u LEFT JOIN patients p ON u.id = p.user_id LIMIT 1'
    );

    if (users.length === 0) {
      console.log('No users found');
      process.exit(0);
    }

    const user = users[0];
    console.log('✅ Found user:', user);
    
    // Try to get their profile
    const [profile] = await executeQuery(
      'SELECT * FROM patients WHERE user_id = ?',
      [user.user_id]
    );

    console.log('✅ User profile:', profile);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testProfile();
