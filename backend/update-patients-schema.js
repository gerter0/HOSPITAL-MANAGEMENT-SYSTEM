import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hospital_management_system'
    });
    
    const columnsToAdd = [
      { name: 'nationality', type: 'VARCHAR(100)', after: 'gender' },
      { name: 'valid_id', type: 'VARCHAR(50)', after: 'nationality' },
      { name: 'address', type: 'TEXT', after: 'valid_id' },
      { name: 'city', type: 'VARCHAR(100)', after: 'address' },
      { name: 'state', type: 'VARCHAR(100)', after: 'city' },
      { name: 'postal_code', type: 'VARCHAR(20)', after: 'state' },
      { name: 'country', type: 'VARCHAR(100)', after: 'postal_code' },
    ];

    for (const column of columnsToAdd) {
      try {
        await conn.query(`ALTER TABLE patients ADD COLUMN ${column.name} ${column.type} AFTER ${column.after}`);
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column')) {
          console.log(`✅ Column ${column.name} already exists`);
        } else {
          throw error;
        }
      }
    }
    
    await conn.end();
    console.log('\n✅ Patients table schema updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
