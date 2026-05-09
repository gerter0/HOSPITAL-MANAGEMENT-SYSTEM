import mysql from 'mysql2/promise';

async function debugDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hospital_management_system'
    });

    // Check users with PATIENT role
    console.log('\n📋 All PATIENT users:');
    const [patients] = await connection.execute(
      'SELECT user_id, email, username, first_name, last_name, role, is_active FROM users WHERE role = "PATIENT"'
    );
    console.table(patients);

    // Check all users
    console.log('\n📋 All users:');
    const [allUsers] = await connection.execute(
      'SELECT user_id, email, username, role, is_active FROM users'
    );
    console.table(allUsers);

    // Check patients table
    console.log('\n📋 Patients table:');
    const [patientsTable] = await connection.execute(
      'SELECT patient_id, user_id, date_of_birth, gender, blood_group, address FROM patients'
    );
    console.table(patientsTable);

    // Check database columns for users table
    console.log('\n📋 Users table schema:');
    const [columns] = await connection.execute(
      'DESCRIBE users'
    );
    console.table(columns);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugDatabase();
