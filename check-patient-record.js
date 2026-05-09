import mysql from 'mysql2/promise';
import config from './backend/src/config/config.js';

async function checkPatientRecord() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    });

    const [userRows] = await connection.execute(
      'SELECT user_id, email, first_name FROM users WHERE email = ?',
      ['test@patient.com']
    );

    if (userRows.length > 0) {
      console.log('\n✅ User found:', userRows[0]);
      const userId = userRows[0].user_id;

      const [patientRows] = await connection.execute(
        'SELECT patient_id, user_id FROM patients WHERE user_id = ?',
        [userId]
      );

      if (patientRows.length > 0) {
        console.log('✅ Patient record found:', patientRows[0]);
      } else {
        console.log('❌ No patient record found for user:', userId);
        console.log('\n📝 Creating patient record...');
        
        // Create patient record
        const [result] = await connection.execute(
          `INSERT INTO patients (user_id, date_of_birth, gender) 
           VALUES (?, ?, ?)`,
          [userId, '2000-01-01', 'OTHER']
        );
        
        console.log('✅ Patient record created:', result.insertId);
      }
    } else {
      console.log('❌ No user found with email: test@patient.com');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkPatientRecord();
