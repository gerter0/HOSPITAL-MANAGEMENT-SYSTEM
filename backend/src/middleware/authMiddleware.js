import { verifyJWT, verify2FAToken } from '../utils/security.js';
import { AppError, formatErrorResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';

// JWT Authentication Middleware
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No authorization token provided', 401, 'NO_TOKEN');
    }

    const decoded = verifyJWT(token);

    // Get user details
    const userQuery = 'SELECT * FROM users WHERE user_id = ? AND is_active = true';
    const users = await executeQuery(userQuery, [decoded.user_id]);

    if (users.length === 0) {
      throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
    }

    const user = users[0];
    const lockedUntil = user.locked_until ? new Date(String(user.locked_until).replace(' ', 'T')) : null;

    // Check if account is locked
    if (lockedUntil && lockedUntil > new Date()) {
      throw new AppError('Account is locked', 423, 'ACCOUNT_LOCKED');
    }

    req.user = {
      user_id: decoded.user_id,
      role: decoded.role,
      email: decoded.email,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    // Load admin permissions if user is admin
    if (user.role === 'ADMIN') {
      try {
        const adminQuery = `
          SELECT
            s.staff_id,
            s.role_id,
            r.role_name,
            r.role_level,
            r.permissions
          FROM admin_staff s
          JOIN admin_roles r ON s.role_id = r.role_id
          WHERE s.user_id = ? AND s.is_active = true
        `;

        const adminResult = await executeQuery(adminQuery, [user.user_id]);

        if (adminResult.length > 0) {
          const adminData = adminResult[0];
          let permissions = adminData.permissions;

          if (typeof permissions === 'string') {
            permissions = JSON.parse(permissions);
          }

          req.user.admin = {
            staff_id: adminData.staff_id,
            role_id: adminData.role_id,
            role_name: adminData.role_name,
            role_level: adminData.role_level,
            permissions: permissions || {},
          };
        }
      } catch (error) {
        // Log error but don't fail auth - user can still use basic admin endpoints
        console.error('Error loading admin permissions:', error);
      }
    }

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json(formatErrorResponse(error));
  }
};

// Role-Based Access Control (RBAC)
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        formatErrorResponse(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(
        formatErrorResponse(new AppError('Forbidden: Insufficient permissions', 403, 'FORBIDDEN'))
      );
    }

    next();
  };
};

// Two-Factor Authentication Middleware
export const verify2FA = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const userQuery = 'SELECT two_factor_enabled, two_factor_secret FROM users WHERE user_id = ?';
    const users = await executeQuery(userQuery, [req.user.user_id]);

    if (users[0].two_factor_enabled) {
      const token2FA = req.headers['x-2fa-token'];

      if (!token2FA) {
        throw new AppError('2FA token required', 403, '2FA_REQUIRED');
      }

      const isValid = verify2FAToken(users[0].two_factor_secret, token2FA);

      if (!isValid) {
        throw new AppError('Invalid 2FA token', 403, 'INVALID_2FA');
      }
    }

    next();
  } catch (error) {
    console.error('2FA verification error:', error);
    return res.status(error.statusCode || 400).json(formatErrorResponse(error));
  }
};

export default { authMiddleware, authorize, verify2FA };
