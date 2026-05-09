import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function createTestPatient() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hospital_management_system'
    });

    // Create patient user
    const patientEmail = 'john.doe@hospital.com';
    const patientPassword = 'Patient@123';
    const patientUsername = 'johndoe';
    const hashedPassword = await bcrypt.hash(patientPassword, 10);

    // Check if patient already exists
    const [existing] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ? OR username = ?',
      [patientEmail, patientUsername]
    );

    if (existing.length > 0) {
      console.log('✅ Test patient already exists:', patientEmail);
      console.log('   User ID:', existing[0].user_id);
      await connection.end();
      return;
    }

    // Create patient user
    const [userResult] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone_number, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [patientUsername, patientEmail, hashedPassword, 'PATIENT', 'John', 'Doe', '+1-555-0101', 1]
    );

    const userId = userResult.insertId;

    // Create patient record
    const [patientResult] = await connection.execute(
      'INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, city, country, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId, '1990-05-15', 'M', 'O+', '123 Main Street', 'New York', 'USA']
    );

    console.log('✅ Test patient created successfully!');
    console.log('   User ID:', userId);
    console.log('   Patient ID:', patientResult.insertId);
    console.log('   Email:', patientEmail);
    console.log('   Password:', patientPassword);

    // Create more test patients
    for (let i = 2; i <= 5; i++) {
      const email = `patient${i}@hospital.com`;
      const [exists] = await connection.execute(
        'SELECT user_id FROM users WHERE email = ?',
        [email]
      );
      
      if (exists.length === 0) {
        const pwd = await bcrypt.hash(`Patient@${i}23`, 10);
        const [userRes] = await connection.execute(
          'INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone_number, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [`patient${i}`, email, pwd, 'PATIENT', `Patient`, `${i}`, `+1-555-010${i}`, 1]
        );
        
        await connection.execute(
          'INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, city, country, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [userRes.insertId, `199${i}-01-${10+i}`, i % 2 === 0 ? 'F' : 'M', 'A+', `${100+i} Oak Ave`, 'Los Angeles', 'USA']
        );
        
        console.log(`✅ Created patient ${i}: ${email}`);
      }
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error creating test patient:', error.message);
    process.exit(1);
  }
}

createTestPatient();
