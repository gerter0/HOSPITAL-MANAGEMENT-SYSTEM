import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function setupAdminSchema() {
  // Read the schema file
  const schemaPath = path.join(__dirname, 'database', 'admin-schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Admin schema file not found:', schemaPath);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Use root credentials for setup
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: 'root',
    password: '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  };

  let connection;

  try {
    console.log('🔄 Connecting to MySQL...');
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL');

    // Switch to the database
    console.log('🔄 Switching to hospital_management_system database...');
    await connection.query('USE hospital_management_system');
    console.log('✅ Switched to database');

    // Execute schema
    console.log('🔄 Applying admin schema...');
    await connection.query(schema);
    console.log('✅ Admin schema applied successfully');

    // Verify tables were created
    const tableNames = [
      'admin_roles',
      'admin_staff',
      'credential_audit_log',
      'account_status_history',
      'credential_management',
      'admin_audit_log',
      'admin_dashboard_stats',
      'system_notifications'
    ];

    console.log('\n📋 Verifying tables...');
    for (const tableName of tableNames) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
      if (rows.length > 0) {
        console.log(`  ✅ ${tableName}`);
      } else {
        console.log(`  ❌ ${tableName} (NOT FOUND)`);
      }
    }

    // Verify admin roles were inserted
    console.log('\n👥 Verifying admin roles...');
    const [roles] = await connection.query('SELECT role_id, role_name, role_level FROM admin_roles ORDER BY role_level');
    if (roles.length === 4) {
      console.log(`  ✅ ${roles.length} admin roles inserted:`);
      roles.forEach(role => {
        console.log(`     - ${role.role_name} (Level ${role.role_level})`);
      });
    } else {
      console.log(`  ❌ Expected 4 admin roles, found ${roles.length}`);
    }

    console.log('\n✨ Admin schema setup completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error setting up admin schema:', error.message);
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('   MySQL server may not be running. Check that MySQL is started.');
    } else if (error.code === 'ER_ACCESS_DENIED_FOR_USER') {
      console.error('   MySQL access denied. Check your MySQL root password in the .env file.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database "hospital_management_system" not found. Run setup-db.js first.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupAdminSchema();
