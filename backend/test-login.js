import axios from 'axios';

const testLogin = async () => {
  try {
    console.log('🧪 Testing User Login...');
    const userResponse = await axios.post('http://localhost:5001/auth/login', {
      email: 'enterochad@gmail.com',
      password: 'Chad1454@'
    });
    console.log('✅ User Login Success:', {
      token: userResponse.data.data?.token ? 'Token received ✓' : 'No token ✗',
      user: userResponse.data.data?.user?.email
    });
  } catch (err) {
    console.log('❌ User Login Error:', err.response?.data || err.message);
  }

  try {
    console.log('\n🧪 Testing Admin Login...');
    const adminResponse = await axios.post('http://localhost:5001/admin/auth/login', {
      email: 'enterochad@gmail.com',
      password: 'Chad1454@'
    });
    console.log('✅ Admin Login Success:', {
      token: adminResponse.data.data?.token ? 'Token received ✓' : 'No token ✗',
      user: adminResponse.data.data?.user?.email,
      role: adminResponse.data.data?.user?.role
    });
  } catch (err) {
    console.log('❌ Admin Login Error:', err.response?.data || err.message);
  }
};

testLogin();
