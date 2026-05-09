import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function setupDatabase() {
  // Read the schema file
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Use root credentials for setup (same as setup-mysql.bat)
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: 'root',
    password: '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  };

  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL');

    // Create database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS hospital_management_system');
    console.log('✅ Database created/verified');

    // Switch to the database  
    await connection.query('USE hospital_management_system');

    // Execute schema
    await connection.query(schema);
    console.log('✅ Database schema updated successfully');

    // Verify the password_reset_tokens table exists
    const [rows] = await connection.query('SHOW TABLES LIKE "password_reset_tokens"');
    if (rows.length > 0) {
      console.log('✅ password_reset_tokens table created successfully');
    } else {
      console.log('❌ password_reset_tokens table not found');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.error('Make sure MySQL is running and credentials are correct');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

setupDatabase();
