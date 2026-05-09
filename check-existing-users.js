const mysql = require('mysql2/promise');

async function checkUsers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'hospital_user',
      password: 'secure_password_123',
      database: 'hospital_management',
      ssl: 'Amazon RDS' in process.env ? { rejectUnauthorized: false } : false
    });

    // Get all users
    const [users] = await connection.execute(`
      SELECT id, username, email, created_at FROM users LIMIT 10
    `);

    console.log('👥 Existing Users:');
    console.table(users);

    // Get users with patients
    const [userPatients] = await connection.execute(`
      SELECT u.id, u.username, u.email, p.patient_id, p.first_name, p.last_name 
      FROM users u 
      LEFT JOIN patients p ON u.id = p.user_id 
      LIMIT 10
    `);

    console.log('\n👤 Users with Patient Records:');
    console.table(userPatients);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
