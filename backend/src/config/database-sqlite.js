import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create database file in backend root
const dbPath = path.join(__dirname, '..', 'hospital.db');

export async function initializeDatabase() {
  try {
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
        is_active BOOLEAN DEFAULT 1,
        is_verified BOOLEAN DEFAULT 0,
        verification_token TEXT,
        verification_token_expiry DATETIME,
        last_login DATETIME,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,
        two_factor_enabled BOOLEAN DEFAULT 0,
        two_factor_secret TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        UNIQUE(email)
      );

      CREATE TABLE IF NOT EXISTS patients (
        patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        blood_type TEXT,
        allergies TEXT,
        medical_conditions TEXT,
        insurance_provider TEXT,
        insurance_number TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS doctors (
        doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        specialization TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        years_of_experience INTEGER,
        consultation_fee DECIMAL(10, 2),
        availability_status TEXT DEFAULT 'available',
        bio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_date DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
        reason_for_visit TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS medical_records (
        record_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER,
        record_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        diagnosis TEXT NOT NULL,
        treatment TEXT,
        notes TEXT,
        attachments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        duration TEXT,
        notes TEXT,
        issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiry_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
      CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `;

    // Execute all statements
    const statements = schema.split(';').filter(s => s.trim());
    statements.forEach(statement => {
      if (statement.trim()) {
        db.exec(statement);
      }
    });

    console.log('✅ SQLite Database initialized successfully');
    console.log(`📁 Database location: ${dbPath}`);
    
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

export function getDatabase() {
  return new Database(dbPath);
}

export const executeQuery = async (query, params = []) => {
  const db = new Database(dbPath);
  try {
    // Enable foreign keys for this connection
    db.pragma('foreign_keys = ON');
    
    // Prepare and execute the statement
    const stmt = db.prepare(query);
    const result = stmt.all(...params);
    
    // For SELECT queries, return the rows
    // For INSERT/UPDATE/DELETE, return affected rows info
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      return result;
    } else {
      // For non-SELECT queries, return an object with affectedRows
      return { affectedRows: db.changes, insertId: db.lastInsertRowid };
    }
  } finally {
    db.close();
  }
};

export default { initializeDatabase, getDatabase, executeQuery };
