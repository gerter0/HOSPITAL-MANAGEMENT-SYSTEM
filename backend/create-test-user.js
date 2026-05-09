import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function createTestUser() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'hospital_management_system'
    });

    // Create test user
    const testEmail = 'profile-test@hospital.com';
    const testPassword = 'TestPass123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Check if user already exists
    const [existing] = await connection.execute('SELECT user_id FROM users WHERE email = ?', [testEmail]);
    
    if (existing.length > 0) {
      console.log('✅ Test user already exists:', testEmail);
      const userId = existing[0].user_id;
      console.log('   User ID:', userId);
      
      // Check if patient record exists
      const [patients] = await connection.execute('SELECT * FROM patients WHERE user_id = ?', [userId]);
      if (patients.length > 0) {
        console.log('   Patient ID:', patients[0].patient_id);
        console.log('   First Name:', patients[0].first_name);
      } else {
        console.log('   No patient record found');
      }
      
      await connection.end();
      return;
    }

    // Insert new user
    const [userResult] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      ['profile_test', testEmail, hashedPassword, 'PATIENT', 'Test', 'Patient', '+1-555-0100']
    );

    const userId = userResult.insertId;
    console.log('✅ Created test user:');
    console.log('   User ID:', userId);
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);

    // Create patient record
    const [patientResult] = await connection.execute(
      `INSERT INTO patients (
        user_id, date_of_birth, gender, nationality, valid_id,
        address, city, state, postal_code, country, blood_group,
        emergency_contact_name, emergency_contact_phone, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        '1990-01-15',
        'MALE',
        'United States',
        'ID123456',
        '123 Main Street',
        'New York',
        'NY',
        '10001',
        'United States',
        'O+',
        'Jane Doe',
        '+1-555-0101'
      ]
    );

    console.log('   Patient ID:', patientResult.insertId);
    console.log('\n✅ Test credentials ready!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestUser();
