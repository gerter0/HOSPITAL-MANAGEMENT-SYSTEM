import mysql from 'mysql2/promise';

(async () => {
  try {
    // Connect as root (default XAMPP MySQL root has no password)
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });

    console.log('✓ Connected as root');

    // Create user
    await conn.query('CREATE USER IF NOT EXISTS hospital_app@localhost IDENTIFIED BY "secure_password"');
    console.log('✓ User hospital_app created/exists');

    // Create database
    await conn.query('CREATE DATABASE IF NOT EXISTS hospital_management_system');
    console.log('✓ Database hospital_management_system created/exists');

    // Grant privileges
    await conn.query('GRANT ALL PRIVILEGES ON hospital_management_system.* TO hospital_app@localhost');
    console.log('✓ Privileges granted');

    // Flush privileges
    await conn.query('FLUSH PRIVILEGES');
    console.log('✓ Privileges flushed');

    await conn.end();
    console.log('\n✅ MySQL setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
