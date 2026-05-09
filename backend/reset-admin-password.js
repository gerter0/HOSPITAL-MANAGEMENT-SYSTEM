import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function resetAdminPassword() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'hospital_management_system'
    });

    const email = 'admin@hospital.com';
    const newPassword = 'Chad1454@';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE email = ? AND role = "ADMIN"',
      [hashedPassword, email]
    );

    console.log('✅ Admin password updated successfully!');
    console.log('   Email:', email);
    console.log('   New Password:', newPassword);
    console.log('   Rows updated:', result.affectedRows);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetAdminPassword();
