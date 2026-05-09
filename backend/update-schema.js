import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hospital_management_system'
    });
    
    try {
      await conn.query('ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE AFTER email');
      console.log('✅ Username column added to users table');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('✅ Username column already exists');
      } else {
        throw error;
      }
    }
    
    try {
      await conn.query('CREATE INDEX idx_username ON users(username)');
      console.log('✅ Index on username created');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('✅ Username index already exists');
      } else {
        throw error;
      }
    }
    
    await conn.end();
    console.log('\n✅ Database schema updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
