import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('=== DEBUG: Connection Config ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? `[${process.env.DB_PASSWORD.length} chars]` : '[EMPTY]');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

import mysql from 'mysql2/promise';

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME,
  port: 3306,
};

console.log('\n=== DEBUG: Final Config ===');
console.log(JSON.stringify(config, null, 2));

try {
  console.log('\n⏳ Attempting connection...');
  const conn = await mysql.createConnection(config);
  console.log('✅ SUCCESS: Connected to MySQL');
  await conn.end();
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
