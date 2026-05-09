import mysql from 'mysql2/promise';
import config from './config.js';

let pool;

export const initializeDatabase = async () => {
  try {
    const poolConfig = {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: config.database.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: config.database.enableKeepAlive,
    };

    // Only include password if it's provided and non-empty
    if (config.database.password && config.database.password.trim() !== '') {
      poolConfig.password = config.database.password;
    }

    pool = mysql.createPool(poolConfig);

    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');

    // Check if password_reset_tokens table exists, create if not
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          token_id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token_hash VARCHAR(255) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          INDEX idx_user_tokens (user_id),
          INDEX idx_token_hash (token_hash),
          INDEX idx_expires_at (expires_at),
          INDEX idx_used (used)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Password reset tokens table verified/created');
    } catch (tableError) {
      console.log('⚠️  Could not create password_reset_tokens table:', tableError.message);
    }

    // Check if security_questions table exists, create if not
    try {
      await connection.execute(`DROP TABLE IF EXISTS user_security_answers`);
      await connection.execute(`DROP TABLE IF EXISTS account_recovery_tokens`);
      await connection.execute(`DROP TABLE IF EXISTS security_questions`);
      
      await connection.execute(`
        CREATE TABLE security_questions (
          question_id INT PRIMARY KEY AUTO_INCREMENT,
          question_text VARCHAR(255) NOT NULL UNIQUE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Security questions table created');

      // Insert default security questions
      await connection.execute(`
        INSERT INTO security_questions (question_text) VALUES
        ('What is your pet''s name?'),
        ('What is your hobby?'),
        ('What skills do you have?'),
        ('What is your favorite food?'),
        ('What is your childhood nickname?'),
        ('What is your favorite color?')
      `);
      console.log('✅ Default security questions inserted');
    } catch (tableError) {
      console.log('⚠️  Could not create security_questions table:', tableError.message);
    }

    // Check if user_security_answers table exists, create if not
    try {
      await connection.execute(`
        CREATE TABLE user_security_answers (
          answer_id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          question_id INT NOT NULL,
          answer_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES security_questions(question_id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_question (user_id, question_id),
          INDEX idx_user_answers (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ User security answers table created');
    } catch (tableError) {
      console.log('⚠️  Could not create user_security_answers table:', tableError.message);
    }

    // Check if account_recovery_tokens table exists, create if not
    try {
      await connection.execute(`
        CREATE TABLE account_recovery_tokens (
          token_id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token_hash VARCHAR(255) NOT NULL UNIQUE,
          pin_hash VARCHAR(255),
          email_verified BOOLEAN DEFAULT FALSE,
          questions_verified BOOLEAN DEFAULT FALSE,
          expires_at DATETIME NOT NULL,
          pin_expires_at DATETIME,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          INDEX idx_user_recovery (user_id),
          INDEX idx_token_hash (token_hash),
          INDEX idx_expires_at (expires_at),
          INDEX idx_used (used)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Account recovery tokens table created');
    } catch (tableError) {
      console.log('⚠️  Could not create account_recovery_tokens table:', tableError.message);
    }

    try {
      await connection.execute(`
        ALTER TABLE account_recovery_tokens
        ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS pin_expires_at DATETIME
      `);
      console.log('✅ Account recovery tokens table updated with PIN fields');
    } catch (alterError) {
      console.log('⚠️  Could not update account_recovery_tokens table:', alterError.message);
    }

    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
};

export const executeQuery = async (query, params = []) => {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(query, params);
    return results;
  } finally {
    connection.release();
  }
};

export default { initializeDatabase, getPool, executeQuery };
