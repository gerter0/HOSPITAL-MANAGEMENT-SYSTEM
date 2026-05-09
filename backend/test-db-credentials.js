import mysql from 'mysql2/promise';

const credentials = [
  { user: 'root', password: '', host: '127.0.0.1' },
  { user: 'root', password: '', host: 'localhost' },
  { user: 'hospital_app', password: 'secure_password', host: '127.0.0.1' },
  { user: 'hospital_app', password: 'secure_password', host: 'localhost' },
  { user: 'root', password: 'root_password_123', host: '127.0.0.1' },
  { user: 'root', password: 'root_password_123', host: 'localhost' },
];

for (const cred of credentials) {
  try {
    const conn = await mysql.createConnection({
      host: cred.host,
      user: cred.user,
      password: cred.password || undefined,
      database: 'hospital_management_system',
    });
    console.log(`✅ SUCCESS: ${cred.user}@${cred.host} (password: ${cred.password ? 'YES' : 'NO'})`);
    await conn.end();
    process.exit(0);
  } catch (e) {
    console.log(`❌ FAILED: ${cred.user}@${cred.host} - ${e.message.split('\n')[0]}`);
  }
}

console.log('\n❌ No credentials worked');
process.exit(1);
