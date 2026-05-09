import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import config from '../config/config.js';

// Encryption utility for sensitive data
export const encryptData = (data) => {
  try {
    const iv = crypto.randomBytes(16);
    const encryptionKey = Buffer.from(config.encryption.encryptionKey, 'utf-8');
    
    const cipher = crypto.createCipheriv(
      config.encryption.algorithm,
      encryptionKey,
      iv
    );

    let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decryption utility
export const decryptData = (encryptedObject) => {
  try {
    const encryptionKey = Buffer.from(config.encryption.encryptionKey, 'utf-8');
    const iv = Buffer.from(encryptedObject.iv, 'hex');
    const authTag = Buffer.from(encryptedObject.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(
      config.encryption.algorithm,
      encryptionKey,
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedObject.encryptedData, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Hash password with bcrypt
export const hashPassword = async (password) => {
  const bcrypt = (await import('bcrypt')).default;
  return bcrypt.hash(password, config.security.bcryptRounds);
};

// Compare password
export const comparePassword = async (password, hash) => {
  const bcrypt = (await import('bcrypt')).default;
  return bcrypt.compare(password, hash);
};

// Generate secure random token
export const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate JWT token
export const generateJWT = (payload, expiresIn = config.jwt.accessTokenExpiry) => {
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    config.jwt.secret,
    { expiresIn, issuer: config.jwt.issuer }
  );
};

// Verify JWT token
export const verifyJWT = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret, { issuer: config.jwt.issuer });
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

// Generate two-factor authentication secret
export const generate2FASecret = () => {
  return speakeasy.generateSecret({
    name: 'Hospital Management System',
    issuer: 'Hospital Management System',
  });
};

// Verify two-factor authentication token
export const verify2FAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2,
  });
};

export default {
  encryptData,
  decryptData,
  hashPassword,
  comparePassword,
  generateToken,
  generateJWT,
  verifyJWT,
  generate2FASecret,
  verify2FAToken,
};
