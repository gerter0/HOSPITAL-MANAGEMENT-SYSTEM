import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function checkAdmin() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'hospital_management_system'
    });

    const [users] = await connection.execute(
      'SELECT user_id, email, role, password_hash FROM users WHERE role = "ADMIN"'
    );

    console.log('📋 Admin Users:');
    console.table(users);

    if (users.length > 0) {
      const admin = users[0];
      console.log('\n🔐 Testing password:');
      const testPassword = 'Chad1454@';
      const isValid = await bcrypt.compare(testPassword, admin.password_hash);
      console.log(`Password 'Chad1454@' match: ${isValid}`);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdmin();
