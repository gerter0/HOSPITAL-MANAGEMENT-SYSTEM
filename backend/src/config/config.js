import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Server Configuration
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'hospital_app',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : undefined,
    database: process.env.DB_NAME || 'hospital_management_system',
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
    enableKeepAlive: true,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: 'hospital-management-system',
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '30') * 60000, // 30 minutes
    enableTwoFactor: process.env.ENABLE_2FA === 'true',
  },

  // Encryption Configuration
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here-xxx',
  },

  // CORS Configuration
  cors: {
    origin: true, // Accept all origins (for development)
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // requests per window
  },

  // Email Configuration (for notifications)
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    password: process.env.EMAIL_PASSWORD || 'your-app-password',
    from: process.env.EMAIL_FROM || 'noreply@hospital.com',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // API Documentation
  api: {
    version: '1.0.0',
    prefix: '/api/v1',
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

if (config.nodeEnv === 'production') {
  requiredEnvVars.push('DB_PASSWORD');
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
  }
}

export default config;
