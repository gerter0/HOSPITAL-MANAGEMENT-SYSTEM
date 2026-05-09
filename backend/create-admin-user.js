import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function createAdminUser() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hospital_management_system'
    });

    const adminEmail = 'enterochad@gmail.com';
    const adminPassword = 'Chad1454@';
    const adminUsername = 'admin';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const [existing] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ? OR username = ?',
      [adminEmail, adminUsername]
    );

    if (existing.length > 0) {
      console.log('✅ Admin user already exists:', adminEmail);
      console.log('   User ID:', existing[0].user_id);
      await connection.end();
      return;
    }

    // Create admin user
    const [userResult] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [adminUsername, adminEmail, hashedPassword, 'ADMIN', 'System', 'Administrator', 1]
    );

    const userId = userResult.insertId;

    console.log('✅ Admin user created successfully!');
    console.log('   User ID:', userId);
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('   Username:', adminUsername);
    console.log('\n📝 Login with these credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();
