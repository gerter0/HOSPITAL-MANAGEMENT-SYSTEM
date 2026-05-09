import { v4 as uuidv4 } from 'uuid';
import { AppError, formatErrorResponse } from '../utils/helpers.js';
import config from '../config/config.js';

// Request validation middleware
export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.validateAsync(req.body, { abortEarly: false });
      next();
    } catch (error) {
      const validationError = new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR'
      );
      validationError.details = error.details?.map(d => ({
        field: d.context.key,
        message: d.message,
      }));

      console.error('Request validation failed:', {
        url: req.originalUrl,
        body: req.body,
        errors: validationError.details,
      });

      return res.status(400).json(formatErrorResponse(validationError));
    }
  };
};

// Request ID middleware (for tracking and logging)
export const requestIdMiddleware = (req, res, next) => {
  req.id = req.get('x-request-id') || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// HTTPS enforcement middleware
export const httpsRedirect = (req, res, next) => {
  if (config.nodeEnv === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
};

// CORS headers middleware (more secure than express-cors)
export const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;

  if (config.cors.origin.includes(origin) || config.cors.origin.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-2FA-Token');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const errorResponse = formatErrorResponse(err, req);

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req, res) => {
  const error = new AppError('Route not found', 404, 'NOT_FOUND');
  res.status(404).json(formatErrorResponse(error));
};

export default {
  validateRequest,
  requestIdMiddleware,
  securityHeaders,
  httpsRedirect,
  corsMiddleware,
  errorHandler,
  notFoundHandler,
};
