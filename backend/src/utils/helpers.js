import config from '../config/config.js';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, code = 'GENERAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

// Error response formatter
export const formatErrorResponse = (error, req = null) => {
  const errorResponse = {
    success: false,
    message: error.message || 'Internal server error',
    code: error.code || 'GENERAL_ERROR',
    timestamp: error.timestamp || new Date().toISOString(),
  };

  if (config.nodeEnv === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error.details || error;
  }

  if (req) {
    errorResponse.requestId = req.id;
  }

  return errorResponse;
};

// Success response formatter
export const formatSuccessResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    statusCode,
    data,
    timestamp: new Date().toISOString(),
  };
};

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePasswordStrength = (password) => {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain number' };
  if (!/[!@#$%^&*]/.test(password)) return { valid: false, message: 'Password must contain special character' };
  return { valid: true };
};

// Sanitize input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 255); // Limit length
};

// Pagination helper
export const getPaginationParams = (query) => {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || config.pagination.defaultLimit;

  limit = Math.min(limit, config.pagination.maxLimit);
  page = Math.max(1, page);

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

export default {
  AppError,
  formatErrorResponse,
  formatSuccessResponse,
  validateEmail,
  validatePasswordStrength,
  sanitizeInput,
  getPaginationParams,
};
