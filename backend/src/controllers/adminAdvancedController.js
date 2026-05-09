// ==========================================
// ENHANCED ADMIN CONTROL - ADVANCED FEATURES
// ==========================================

import { AppError, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { hashPassword } from '../utils/security.js';
import { auditLog } from '../utils/auditLogger.js';
import { validateCreateUserInput, validateUpdateUserInput, validatePasswordResetInput } from '../validators/adminValidator.js';

/**
 * 1. CREATE USER (Admin can create new users directly)
 */
export const createUserByAdmin = async (req, res, next) => {
  try {
    const { email, username, first_name, last_name, phone_number, role, password } = req.body;

    // Validate input
    const validation = validateCreateUserInput({
      email,
      username,
      password,
      role,
      first_name,
      last_name,
      phone_number,
    });

    if (!validation.valid) {
      throw new AppError(validation.errors.join('; '), 400, 'INVALID_INPUT');
    }

    // Check if user already exists
    const [existing] = await executeQuery('SELECT user_id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length > 0) {
      throw new AppError('User with this email or username already exists', 400, 'USER_EXISTS');
    }

    const passwordHash = await hashPassword(password);

    const insertQuery = `
      INSERT INTO users
      (email, username, password_hash, first_name, last_name, phone_number, role, is_active, is_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, true, true, NOW())
    `;

    const [result] = await executeQuery(insertQuery, [
      email, username, passwordHash, first_name || 'User', last_name || 'Account', phone_number || '', role
    ]);

    await auditLog(req, 'CREATE_USER', 'USER', result.insertId, null, { email, username, role });

    res.status(201).json(formatSuccessResponse({
      user_id: result.insertId,
      email,
      username,
      role
    }, 'User created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * 2. UPDATE USER (Admin can modify user details)
 */
export const updateUserByAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { email, username, first_name, last_name, phone_number, role, is_active } = req.body;

    // Prevent self-deactivation
    if (parseInt(userId) === req.user.user_id && is_active === false) {
      throw new AppError('Cannot deactivate your own account', 400, 'INVALID_OPERATION');
    }

    let updateQuery = 'UPDATE users SET ';
    const updateFields = [];
    const params = [];

    if (email !== undefined) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (username !== undefined) {
      updateFields.push('username = ?');
      params.push(username);
    }
    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      params.push(last_name);
    }
    if (phone_number !== undefined) {
      updateFields.push('phone_number = ?');
      params.push(phone_number);
    }
    if (role !== undefined) {
      if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
        throw new AppError('Invalid role', 400, 'INVALID_ROLE');
      }
      updateFields.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_FIELDS');
    }

    updateQuery += updateFields.join(', ') + ', updated_at = NOW() WHERE user_id = ?';
    params.push(userId);

    // Get old data for audit
    const oldUserResult = await executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (oldUserResult.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const oldUser = oldUserResult[0];

    await executeQuery(updateQuery, params);

    await auditLog(req, 'UPDATE_USER', 'USER', userId,
      { email: oldUser.email, username: oldUser.username, role: oldUser.role },
      { email, username, role });

    res.json(formatSuccessResponse(null, 'User updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * 3. DELETE USER (Soft delete)
 */
export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) === req.user.user_id) {
      throw new AppError('Cannot delete your own account', 400, 'INVALID_OPERATION');
    }

    const deleteQuery = 'UPDATE users SET deleted_at = NOW(), is_active = false WHERE user_id = ?';
    await executeQuery(deleteQuery, [userId]);

    await auditLog(req, 'DELETE_USER', 'USER', userId, null, { deleted: true });

    res.json(formatSuccessResponse(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * 4. REGISTRATION MONITORING - Get Recent User Registrations
 */
export const getRegistrationMonitoring = async (req, res, next) => {
  try {
    const { days = 30, limit = 100 } = req.query;

    const query = `
      SELECT 
        user_id,
        email,
        username,
        first_name,
        last_name,
        role,
        is_verified,
        is_active,
        created_at,
        verification_token_expiry,
        CASE 
          WHEN is_verified = 1 THEN 'Verified'
          WHEN verification_token_expiry < NOW() THEN 'Verification Expired'
          ELSE 'Pending Verification'
        END as verification_status
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const registrations = await executeQuery(query, [days, limit]);

    // Calculate statistics
    const stats = {
      total: registrations.length,
      verified: registrations.filter(r => r.is_verified).length,
      pending: registrations.filter(r => !r.is_verified && r.verification_token_expiry > new Date()).length,
      expired: registrations.filter(r => !r.is_verified && r.verification_token_expiry <= new Date()).length,
    };

    await auditLog(req, 'VIEW_REGISTRATION_MONITORING', 'SYSTEM', null, null, { days });

    res.json(formatSuccessResponse({
      registrations,
      stats
    }, 'Registration monitoring data retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * 5. PIN/OTP SEND MONITORING - Track password resets and OTPs sent
 */
export const getPINOTPMonitoring = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;

    const query = `
      SELECT 
        al.log_id,
        al.timestamp,
        al.user_id,
        u.email,
        u.username,
        al.action,
        al.status,
        CASE 
          WHEN al.action = 'PASSWORD_RESET_REQUEST' THEN 'Password Reset Requested'
          WHEN al.action = 'VERIFICATION_EMAIL_SENT' THEN 'Verification Email Sent'
          WHEN al.action = 'RECOVERY_PIN_SENT' THEN 'Recovery PIN Sent'
          ELSE al.action
        END as action_description,
        al.ip_address,
        al.user_agent
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE al.action IN ('PASSWORD_RESET_REQUEST', 'VERIFICATION_EMAIL_SENT', 'RECOVERY_PIN_SENT', 'OTP_SENT')
      ORDER BY al.timestamp DESC
      LIMIT ?
    `;

    const pinOtpLogs = await executeQuery(query, [limit]);

    // Count by action
    const actionStats = {};
    pinOtpLogs.forEach(log => {
      if (!actionStats[log.action]) actionStats[log.action] = 0;
      actionStats[log.action]++;
    });

    await auditLog(req, 'VIEW_PINOTP_MONITORING', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse({
      logs: pinOtpLogs,
      stats: actionStats
    }, 'PIN/OTP monitoring data retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * 6. ACCOUNT CHANGES MONITORING - Track user account modifications
 */
export const getAccountChangesMonitoring = async (req, res, next) => {
  try {
    const { userId, limit = 100 } = req.query;

    let query = `
      SELECT 
        log_id,
        timestamp,
        user_id,
        action,
        status,
        CONCAT(
          CASE 
            WHEN action = 'UPDATE_USER' THEN 'User account updated'
            WHEN action = 'CHANGE_PASSWORD' THEN 'Password changed'
            WHEN action = 'UPDATE_PROFILE' THEN 'Profile updated'
            WHEN action = 'LOGIN_SUCCESS' THEN 'Successful login'
            WHEN action = 'LOGIN_ATTEMPT' THEN 'Login attempt'
            WHEN action = 'ACCOUNT_LOCKED' THEN 'Account locked'
            WHEN action = 'ACCOUNT_UNLOCKED' THEN 'Account unlocked'
            ELSE action
          END,
          ' - ',
          CASE 
            WHEN status = 'SUCCESS' THEN '✓'
            WHEN status = 'FAILURE' THEN '✗'
            ELSE '○'
          END
        ) as change_summary,
        ip_address,
        request_details
      FROM audit_log
      WHERE action IN ('UPDATE_USER', 'CHANGE_PASSWORD', 'UPDATE_PROFILE', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED')
      ${userId ? 'AND user_id = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const params = userId ? [userId, limit] : [limit];
    const changes = await executeQuery(query, params);

    await auditLog(req, 'VIEW_ACCOUNT_CHANGES', 'SYSTEM', null, null, { userId });

    res.json(formatSuccessResponse({
      changes
    }, 'Account changes monitoring data retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * 7. FULL USER CONTROL - Lock/Unlock account, Force logout, etc.
 */
export const lockUserAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { duration = 3600 } = req.body; // Default 1 hour in seconds

    if (parseInt(userId) === req.user.user_id) {
      throw new AppError('Cannot lock your own account', 400, 'INVALID_OPERATION');
    }

    // Validate duration: must be positive and max 30 days (2592000 seconds)
    const durationNum = parseInt(duration);
    if (durationNum <= 0 || durationNum > 2592000) {
      throw new AppError('Lock duration must be between 1 second and 30 days', 400, 'INVALID_DURATION');
    }

    const lockUntil = new Date(Date.now() + durationNum * 1000);
    const lockUntilFormatted = lockUntil.toISOString().slice(0, 19).replace('T', ' ');

    await executeQuery(
      'UPDATE users SET locked_until = ?, failed_login_attempts = 3 WHERE user_id = ?',
      [lockUntilFormatted, userId]
    );

    await auditLog(req, 'LOCK_ACCOUNT', 'USER', userId, null, { duration_seconds: durationNum, locked_until: lockUntilFormatted });

    res.json(formatSuccessResponse(null, `User account locked until ${lockUntil.toISOString()}`));
  } catch (error) {
    next(error);
  }
};

/**
 * UNLOCK USER ACCOUNT
 */
export const unlockUserAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;

    await executeQuery(
      'UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE user_id = ?',
      [userId]
    );

    await auditLog(req, 'UNLOCK_ACCOUNT', 'USER', userId, null, { unlocked: true });

    res.json(formatSuccessResponse(null, 'User account unlocked successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * VERIFY USER EMAIL (Admin action)
 */
export const verifyUserEmail = async (req, res, next) => {
  try {
    const { userId } = req.params;

    await executeQuery(
      'UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expiry = NULL WHERE user_id = ?',
      [userId]
    );

    await auditLog(req, 'ADMIN_VERIFY_EMAIL', 'USER', userId, null, { is_verified: true });

    res.json(formatSuccessResponse(null, 'User email verified successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * ENABLE/DISABLE TWO-FACTOR AUTHENTICATION
 */
export const toggleUserTwoFA = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { enable = true } = req.body;

    const updateQuery = enable
      ? 'UPDATE users SET two_factor_enabled = true WHERE user_id = ?'
      : 'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE user_id = ?';

    await executeQuery(updateQuery, [userId]);

    await auditLog(req, 'TOGGLE_2FA', 'USER', userId, null, { two_factor_enabled: enable });

    res.json(formatSuccessResponse(null, `Two-factor authentication ${enable ? 'enabled' : 'disabled'}`));
  } catch (error) {
    next(error);
  }
};

/**
 * GET USER DETAILED ACTIVITY LOG
 */
export const getUserActivityLog = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const query = `
      SELECT 
        log_id,
        timestamp,
        action,
        status,
        ip_address,
        user_agent,
        request_details,
        response_details
      FROM audit_log
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const logs = await executeQuery(query, [userId, limit]);

    res.json(formatSuccessResponse({
      user_id: userId,
      logs
    }, 'User activity log retrieved'));
  } catch (error) {
    next(error);
  }
};

export default {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  getRegistrationMonitoring,
  getPINOTPMonitoring,
  getAccountChangesMonitoring,
  lockUserAccount,
  unlockUserAccount,
  verifyUserEmail,
  toggleUserTwoFA,
  getUserActivityLog
};
