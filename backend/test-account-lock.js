import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Test account lockout mechanism
const testAccountLock = async () => {
  const testEmail = 'enterochad@gmail.com';
  const wrongPassword = 'WrongPassword@123';
  
  console.log('\n🧪 Testing Account Lockout Mechanism...');
  console.log(`📧 Test email: ${testEmail}`);
  console.log('❌ Using intentionally wrong password\n');

  try {
    // Attempt 1
    console.log('📍 Attempt 1/3...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: wrongPassword
      });
    } catch (err) {
      console.log(`   Status: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
      console.log(`   Error Code: ${err.response?.data?.code}`);
    }

    // Wait 1 second between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Attempt 2
    console.log('\n📍 Attempt 2/3...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: wrongPassword
      });
    } catch (err) {
      console.log(`   Status: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
      console.log(`   Error Code: ${err.response?.data?.code}`);
    }

    // Wait 1 second between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Attempt 3 (should trigger lock)
    console.log('\n📍 Attempt 3/3 (Should trigger account lock)...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: wrongPassword
      });
    } catch (err) {
      console.log(`   Status: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
      console.log(`   Error Code: ${err.response?.data?.code}`);
    }

    // Wait 1 second before next attempt
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Attempt 4 (should be locked)
    console.log('\n📍 Attempt 4 (Account should now be LOCKED)...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: wrongPassword
      });
      console.log('   ❌ FAILED: Account was not locked!');
    } catch (err) {
      if (err.response?.status === 423) {
        console.log(`   ✅ SUCCESS: Account is locked!`);
        console.log(`   Status: 423 - ${err.response?.data?.message}`);
        console.log(`   Error Code: ${err.response?.data?.code}`);
      } else {
        console.log(`   Status: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
      }
    }

    console.log('\n✅ Account lockout test completed!');
    console.log('⏰ Account will unlock in 15 minutes.\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testAccountLock();
