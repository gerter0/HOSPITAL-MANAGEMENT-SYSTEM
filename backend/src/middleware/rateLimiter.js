import rateLimit from 'express-rate-limit';
import config from '../config/config.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => config.nodeEnv === 'development',
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
});

// Strict rate limiter for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. If you keep failing more than 3 times, your account may become locked. Please wait 15 minutes or recover your account.',
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      timestamp: new Date().toISOString(),
    });
  },
  skipSuccessfulRequests: true,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
  keyGenerator: (req) => req.body.email || req.ip,
});

// Strict rate limiter for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again later.',
      code: 'TOO_MANY_PASSWORD_RESET_ATTEMPTS',
      timestamp: new Date().toISOString(),
    });
  },
});

// Rate limiter for sensitive operations (medical records, etc)
export const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Too many requests for sensitive operations.',
});

export default {
  apiLimiter,
  loginLimiter,
  passwordResetLimiter,
  sensitiveLimiter,
};
