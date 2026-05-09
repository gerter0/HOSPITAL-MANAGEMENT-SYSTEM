// Bulk Operations Controller
import { AppError, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { hashPassword } from '../utils/security.js';
import { auditLog } from '../utils/auditLogger.js';

/**
 * BULK DEACTIVATE users by filter
 */
export const bulkDeactivateUsers = async (req, res, next) => {
  try {
    const { filter, reason } = req.body;

    if (!filter || !reason) {
      throw new AppError('filter and reason are required', 400, 'MISSING_FIELDS');
    }

    // Build WHERE clause based on filter
    let whereClause = 'WHERE deleted_at IS NULL AND is_active = true';
    const params = [];

    if (filter.role) {
      whereClause += ' AND role = ?';
      params.push(filter.role);
    }

    if (filter.registration_before_date) {
      whereClause += ' AND created_at < ?';
      params.push(filter.registration_before_date);
    }

    if (filter.never_logged_in) {
      whereClause += ' AND last_login IS NULL';
    }

    if (filter.unverified_only) {
      whereClause += ' AND is_verified = false';
    }

    // Count affected users
    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const [countResult] = await executeQuery(countQuery, params);
    const affectedCount = countResult.count;

    if (affectedCount === 0) {
      throw new AppError('No users match the specified filter', 400, 'NO_USERS_MATCHED');
    }

    if (affectedCount > 5000) {
      throw new AppError('Bulk operation would affect more than 5000 users. Please refine your filter.', 400, 'TOO_MANY_USERS');
    }

    // Execute deactivation
    const updateQuery = `
      UPDATE users
      SET is_active = false, deleted_at = NOW()
      ${whereClause}
    `;

    await executeQuery(updateQuery, params);

    // Get list of affected users for audit
    const listQuery = `SELECT user_id, email FROM users ${whereClause}`;
    const affectedUsers = await executeQuery(listQuery, params);

    await auditLog(req, 'BULK_DEACTIVATE_USERS', 'USER', null, null, {
      reason,
      affected_count: affectedCount,
      filter,
      affected_user_ids: affectedUsers.map(u => u.user_id),
    });

    res.json(formatSuccessResponse({
      affected_count: affectedCount,
      action: 'DEACTIVATED',
      reason,
      affected_users: affectedUsers,
    }, `Successfully deactivated ${affectedCount} user(s)`));
  } catch (error) {
    next(error);
  }
};

/**
 * BULK ASSIGN ROLE to users
 */
export const bulkAssignRole = async (req, res, next) => {
  try {
    const { filter, new_role, reason } = req.body;

    if (!filter || !new_role || !reason) {
      throw new AppError('filter, new_role, and reason are required', 400, 'MISSING_FIELDS');
    }

    if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(new_role)) {
      throw new AppError('Invalid role', 400, 'INVALID_ROLE');
    }

    // Build WHERE clause
    let whereClause = 'WHERE deleted_at IS NULL';
    const params = [];

    if (filter.current_role) {
      whereClause += ' AND role = ?';
      params.push(filter.current_role);
    }

    if (filter.exclude_role) {
      whereClause += ' AND role != ?';
      params.push(filter.exclude_role);
    }

    // Count affected users
    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const [countResult] = await executeQuery(countQuery, params);
    const affectedCount = countResult.count;

    if (affectedCount === 0) {
      throw new AppError('No users match the specified filter', 400, 'NO_USERS_MATCHED');
    }

    if (affectedCount > 1000) {
      throw new AppError('Bulk operation would affect more than 1000 users. Please refine your filter.', 400, 'TOO_MANY_USERS');
    }

    // Execute role assignment
    const updateQuery = `UPDATE users SET role = ? ${whereClause}`;
    const updateParams = [new_role, ...params];
    await executeQuery(updateQuery, updateParams);

    // Get affected users
    const listQuery = `SELECT user_id, email, role FROM users ${whereClause}`;
    const affectedUsers = await executeQuery(listQuery, params);

    await auditLog(req, 'BULK_ASSIGN_ROLE', 'USER', null, null, {
      reason,
      new_role,
      affected_count: affectedCount,
      filter,
      affected_user_ids: affectedUsers.map(u => u.user_id),
    });

    res.json(formatSuccessResponse({
      affected_count: affectedCount,
      new_role,
      reason,
      affected_users: affectedUsers,
    }, `Successfully assigned role to ${affectedCount} user(s)`));
  } catch (error) {
    next(error);
  }
};

/**
 * BULK RESET PASSWORDS for users
 */
export const bulkResetPasswords = async (req, res, next) => {
  try {
    const { filter, new_password, reason, notify_users } = req.body;

    if (!filter || !new_password || !reason) {
      throw new AppError('filter, new_password, and reason are required', 400, 'MISSING_FIELDS');
    }

    // Validate password
    if (new_password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    }

    // Build WHERE clause
    let whereClause = 'WHERE deleted_at IS NULL';
    const params = [];

    if (filter.role) {
      whereClause += ' AND role = ?';
      params.push(filter.role);
    }

    if (filter.locked_only) {
      whereClause += ' AND locked_until > NOW()';
    }

    // Count affected users
    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const [countResult] = await executeQuery(countQuery, params);
    const affectedCount = countResult.count;

    if (affectedCount === 0) {
      throw new AppError('No users match the specified filter', 400, 'NO_USERS_MATCHED');
    }

    if (affectedCount > 500) {
      throw new AppError('Bulk operation would affect more than 500 users. Please refine your filter.', 400, 'TOO_MANY_USERS');
    }

    const passwordHash = await hashPassword(new_password);

    // Execute password reset
    const updateQuery = `
      UPDATE users
      SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL
      ${whereClause}
    `;

    const updateParams = [passwordHash, ...params];
    await executeQuery(updateQuery, updateParams);

    // Get affected users
    const listQuery = `SELECT user_id, email FROM users ${whereClause}`;
    const affectedUsers = await executeQuery(listQuery, params);

    await auditLog(req, 'BULK_RESET_PASSWORDS', 'USER', null, null, {
      reason,
      affected_count: affectedCount,
      filter,
      notify_users: notify_users || false,
      affected_user_ids: affectedUsers.map(u => u.user_id),
    });

    res.json(formatSuccessResponse({
      affected_count: affectedCount,
      reason,
      notify_sent: notify_users || false,
      affected_users: affectedUsers,
    }, `Successfully reset passwords for ${affectedCount} user(s)`));
  } catch (error) {
    next(error);
  }
};

/**
 * BULK UNLOCK ACCOUNTS
 */
export const bulkUnlockAccounts = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      throw new AppError('reason is required', 400, 'MISSING_FIELD');
    }

    // Count locked accounts
    const countQuery = 'SELECT COUNT(*) as count FROM users WHERE locked_until IS NOT NULL AND locked_until > NOW()';
    const [countResult] = await executeQuery(countQuery);
    const affectedCount = countResult.count;

    if (affectedCount === 0) {
      res.json(formatSuccessResponse({
        affected_count: 0,
        message: 'No locked accounts to unlock',
      }, 'No locked accounts found'));
      return;
    }

    // Unlock accounts
    const updateQuery = 'UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE locked_until > NOW()';
    await executeQuery(updateQuery);

    // Get affected users
    const listQuery = 'SELECT user_id, email FROM users WHERE locked_until IS NULL AND failed_login_attempts = 0';
    const affectedUsers = await executeQuery(listQuery);

    await auditLog(req, 'BULK_UNLOCK_ACCOUNTS', 'USER', null, null, {
      reason,
      affected_count: affectedCount,
      affected_user_ids: affectedUsers.map(u => u.user_id),
    });

    res.json(formatSuccessResponse({
      affected_count: affectedCount,
      reason,
      affected_users: affectedUsers,
    }, `Successfully unlocked ${affectedCount} account(s)`));
  } catch (error) {
    next(error);
  }
};

export default {
  bulkDeactivateUsers,
  bulkAssignRole,
  bulkResetPasswords,
  bulkUnlockAccounts,
};
