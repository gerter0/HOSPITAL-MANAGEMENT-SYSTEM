import { comparePassword, generateJWT } from '../utils/security.js';
import { AppError, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { auditLog, auditLogFailure } from '../utils/auditLogger.js';

const parseDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  const normalized = String(value).replace(' ', 'T');
  return new Date(normalized);
};


// Admin Login - Dedicated endpoint for admin authentication
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    // Get admin user
    const userQuery = `
      SELECT u.* 
      FROM users u
      WHERE u.email = ? AND u.is_active = true AND u.role = 'ADMIN'
    `;

    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      await auditLogFailure(req, 'ADMIN_LOGIN_ATTEMPT', 'ADMIN', 'Admin user not found or inactive');
      throw new AppError('Invalid admin credentials', 401, 'INVALID_CREDENTIALS');
    }

    const user = users[0];
    const lockedUntil = parseDateTime(user.locked_until);

    // Check if account is locked
    if (lockedUntil && lockedUntil > new Date()) {
      console.log(`🔐 Admin login blocked: Account locked until ${lockedUntil.toISOString()}`);
      await auditLogFailure(req, 'ADMIN_LOGIN_ATTEMPT', 'ADMIN', 'Admin account locked due to multiple failed attempts');
      throw new AppError('Account locked due to multiple failed login attempts. Please contact system administrator.', 423, 'ACCOUNT_LOCKED');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newAttempts = user.failed_login_attempts + 1;
      let updateQuery = 'UPDATE users SET failed_login_attempts = ? WHERE user_id = ?';
      let updateParams = [newAttempts, user.user_id];

      // Lock account after 3 failed attempts
      if (newAttempts >= 3) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        // Format date properly for MySQL: YYYY-MM-DD HH:MM:SS
        const lockUntilFormatted = lockUntil.toISOString().slice(0, 19).replace('T', ' ');
        updateQuery = 'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE user_id = ?';
        updateParams = [newAttempts, lockUntilFormatted, user.user_id];
        console.log(`🔒 Admin account locked for ${user.email}. Unlock time: ${lockUntilFormatted}`);
      }

      await executeQuery(updateQuery, updateParams);

      await auditLogFailure(req, 'ADMIN_LOGIN_ATTEMPT', 'ADMIN', `Invalid password (attempt ${newAttempts}/3)`);
      throw new AppError('Invalid admin credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed login attempts on successful login
    if (user.failed_login_attempts > 0) {
      await executeQuery('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?', [user.user_id]);
    }

    // Update last login
    await executeQuery('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);

    // Log successful admin login
    await auditLog(req, 'ADMIN_LOGIN_SUCCESS', 'ADMIN', user.user_id, null, {
      email: user.email,
      role: user.role,
    });

    // Generate JWT token
    const jwtToken = generateJWT({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });

    res.json(
      formatSuccessResponse({
        token: jwtToken,
        user: {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        },
      }, 'Admin login successful')
    );
  } catch (error) {
    next(error);
  }
};
