import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Admin credentials for testing
const adminEmail = 'admin@hospital.com';
const adminPassword = 'Chad1454@';

let adminToken = '';

async function testAdminFeatures() {
  try {
    console.log('🛡️ TESTING ADVANCED ADMIN FEATURES\n');
    console.log('='.repeat(60));

    // 1. Admin Login
    console.log('\n1️⃣ ADMIN LOGIN');
    console.log('-'.repeat(60));
    const loginRes = await axios.post(`${API_URL}/admin/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    adminToken = loginRes.data.data.token;
    console.log('✓ Admin logged in successfully');
    console.log('Token:', adminToken.substring(0, 50) + '...');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // 2. Create User
    console.log('\n2️⃣ CREATE USER (CRUD - C)');
    console.log('-'.repeat(60));
    const createRes = await axios.post(`${API_URL}/admin/users`, {
      email: 'newuser@hospital.com',
      username: 'newuser123',
      password: 'SecurePass@123',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '+1-555-9999',
      role: 'PATIENT'
    }, { headers });
    
    const newUserId = createRes.data.data.user_id;
    console.log('✓ New user created successfully');
    console.log(`  User ID: ${newUserId}`);
    console.log(`  Email: ${createRes.data.data.email}`);
    console.log(`  Role: ${createRes.data.data.role}`);

    // 3. Get All Users
    console.log('\n3️⃣ GET ALL USERS (CRUD - R)');
    console.log('-'.repeat(60));
    const usersRes = await axios.get(`${API_URL}/admin/users?limit=5`, { headers });
    console.log(`✓ Retrieved ${usersRes.data.data.length} users`);
    usersRes.data.data.slice(0, 3).forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.email} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });

    // 4. Update User
    console.log('\n4️⃣ UPDATE USER (CRUD - U)');
    console.log('-'.repeat(60));
    const updateRes = await axios.put(`${API_URL}/admin/users/${newUserId}`, {
      first_name: 'Updated',
      phone_number: '+1-555-8888'
    }, { headers });
    console.log('✓ User updated successfully');
    console.log(`  First name changed to: Updated`);
    console.log(`  Phone updated to: +1-555-8888`);

    // 5. Registration Monitoring
    console.log('\n5️⃣ REGISTRATION MONITORING');
    console.log('-'.repeat(60));
    const regRes = await axios.get(`${API_URL}/admin/monitoring/registrations?days=30`, { headers });
    console.log('✓ Registration data retrieved');
    console.log(`  Total registrations (30 days): ${regRes.data.data.stats.total}`);
    console.log(`  Verified: ${regRes.data.data.stats.verified}`);
    console.log(`  Pending: ${regRes.data.data.stats.pending}`);
    console.log(`  Expired: ${regRes.data.data.stats.expired}`);
    if (regRes.data.data.registrations.length > 0) {
      console.log(`\n  Recent registrations:`);
      regRes.data.data.registrations.slice(0, 3).forEach((reg, idx) => {
        console.log(`    ${idx + 1}. ${reg.email} - ${reg.verification_status}`);
      });
    }

    // 6. PIN/OTP Monitoring
    console.log('\n6️⃣ PIN/OTP SEND MONITORING');
    console.log('-'.repeat(60));
    const pinRes = await axios.get(`${API_URL}/admin/monitoring/pin-otp`, { headers });
    console.log('✓ PIN/OTP monitoring data retrieved');
    console.log(`  Total PIN/OTP events: ${pinRes.data.data.logs.length}`);
    console.log(`\n  Activity breakdown:`);
    Object.entries(pinRes.data.data.stats).forEach(([action, count]) => {
      console.log(`    • ${action.replace(/_/g, ' ')}: ${count}`);
    });
    if (pinRes.data.data.logs.length > 0) {
      console.log(`\n  Recent activities:`);
      pinRes.data.data.logs.slice(0, 3).forEach((log, idx) => {
        const time = new Date(log.timestamp).toLocaleString();
        console.log(`    ${idx + 1}. [${time}] ${log.action_description} - ${log.status}`);
      });
    }

    // 7. Account Changes Monitoring
    console.log('\n7️⃣ ACCOUNT CHANGES MONITORING');
    console.log('-'.repeat(60));
    const changeRes = await axios.get(`${API_URL}/admin/monitoring/account-changes`, { headers });
    console.log('✓ Account changes data retrieved');
    console.log(`  Total tracked changes: ${changeRes.data.data.changes.length}`);
    if (changeRes.data.data.changes.length > 0) {
      console.log(`\n  Recent account changes:`);
      changeRes.data.data.changes.slice(0, 5).forEach((change, idx) => {
        const time = new Date(change.timestamp).toLocaleString();
        console.log(`    ${idx + 1}. [${time}] ${change.change_summary} - IP: ${change.ip_address}`);
      });
    }

    // 8. Lock Account
    console.log('\n8️⃣ LOCK ACCOUNT (CONTROL)');
    console.log('-'.repeat(60));
    const lockRes = await axios.post(`${API_URL}/admin/users/${newUserId}/lock`, 
      { duration: 3600 }, { headers });
    console.log('✓ Account locked successfully');
    console.log(`  Duration: 1 hour (3600 seconds)`);
    console.log(`  Locked until: ${lockRes.data.data.message.split('until ')[1]}`);

    // 9. Unlock Account
    console.log('\n9️⃣ UNLOCK ACCOUNT (CONTROL)');
    console.log('-'.repeat(60));
    const unlockRes = await axios.post(`${API_URL}/admin/users/${newUserId}/unlock`, {}, { headers });
    console.log('✓ Account unlocked successfully');

    // 10. Verify Email
    console.log('\n🔟 VERIFY EMAIL (CONTROL)');
    console.log('-'.repeat(60));
    const verifyRes = await axios.post(`${API_URL}/admin/users/${newUserId}/verify-email`, {}, { headers });
    console.log('✓ Email verified successfully');

    // 11. Enable 2FA
    console.log('\n1️⃣1️⃣ ENABLE TWO-FACTOR AUTHENTICATION (CONTROL)');
    console.log('-'.repeat(60));
    const twoFaRes = await axios.post(`${API_URL}/admin/users/${newUserId}/toggle-2fa`, 
      { enable: true }, { headers });
    console.log('✓ Two-factor authentication enabled');

    // 12. Get User Activity Log
    console.log('\n1️⃣2️⃣ GET USER ACTIVITY LOG');
    console.log('-'.repeat(60));
    const activityRes = await axios.get(`${API_URL}/admin/monitoring/user-activity/${newUserId}`, { headers });
    console.log('✓ User activity log retrieved');
    console.log(`  Total activities: ${activityRes.data.data.logs.length}`);
    if (activityRes.data.data.logs.length > 0) {
      console.log(`  Recent activities:`);
      activityRes.data.data.logs.slice(0, 3).forEach((activity, idx) => {
        const time = new Date(activity.timestamp).toLocaleString();
        console.log(`    ${idx + 1}. [${time}] ${activity.action} - ${activity.status}`);
      });
    }

    // 13. Delete User
    console.log('\n1️⃣3️⃣ DELETE USER (CRUD - D)');
    console.log('-'.repeat(60));
    const deleteRes = await axios.delete(`${API_URL}/admin/users/${newUserId}`, { headers });
    console.log('✓ User deleted successfully (soft delete)');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL ADMIN FEATURES TESTED SUCCESSFULLY!\n');
    console.log('SUMMARY OF FEATURES:');
    console.log('  ✓ User CRUD Operations (Create, Read, Update, Delete)');
    console.log('  ✓ Registration Monitoring (Last 30 days)');
    console.log('  ✓ PIN/OTP Send Monitoring');
    console.log('  ✓ Account Changes Monitoring');
    console.log('  ✓ User Account Control (Lock/Unlock)');
    console.log('  ✓ Email Verification Control');
    console.log('  ✓ Two-Factor Authentication Control');
    console.log('  ✓ User Activity Log Tracking');
    console.log('  ✓ Full Audit Trail with IP Addresses');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
    process.exit(1);
  }
}

testAdminFeatures();
