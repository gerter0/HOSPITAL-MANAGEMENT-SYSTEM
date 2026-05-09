import axios from 'axios';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:5001/api/v1';
const JWT_SECRET = 'your-super-secret-key-change-this-in-production';

async function testPatientsAPI() {
  try {
    // Create a valid admin token
    const token = jwt.sign(
      { user_id: 11, email: 'admin@hospital.com', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('\n🔑 Token created');
    
    // Try the API call
    console.log('\n📡 Calling /admin/patients...');
    const response = await axios.get(`${API_URL}/admin/patients`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, limit: 10 }
    });

    console.log('\n✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data) {
      console.log(`\n📊 Found ${response.data.data.length} patients in response.data.data`);
    }
    
    if (response.data && response.data.patients) {
      console.log(`\n📊 Found ${response.data.patients.length} patients in response.data.patients`);
    }
  } catch (error) {
    console.error('\n❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testPatientsAPI();
