import mysql from 'mysql2/promise';
import config from './backend/src/config/config.js';

async function checkUsers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    });

    const [rows] = await connection.execute(
      'SELECT user_id, email, failed_login_attempts, locked_until, is_active FROM users'
    );

    console.log('Users in database:');
    console.log(rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

checkUsers();