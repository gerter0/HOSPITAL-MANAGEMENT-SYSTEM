  import { AppError, formatSuccessResponse, getPaginationParams } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { hashPassword } from '../utils/security.js';
import { auditLog } from '../utils/auditLogger.js';
import { validatePasswordResetInput } from '../validators/adminValidator.js';

// Get All Users (Admin)
export const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { role, is_active } = req.query;

    let query = 'SELECT user_id, email, first_name, last_name, role, is_active, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const queryParams = [];
    const countParams = [];

    // Build WHERE clause
    let whereClause = '';
    if (role) {
      whereClause += ' WHERE role = ?';
      queryParams.push(role);
      countParams.push(role);
    }

    if (is_active !== undefined) {
      const isActiveValue = is_active === 'true';
      whereClause += queryParams.length > 0 ? ' AND is_active = ?' : ' WHERE is_active = ?';
      queryParams.push(isActiveValue);
      countParams.push(isActiveValue);
    }

    query += whereClause;
    countQuery += whereClause;

    // Add pagination to main query only
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [users, counts] = await Promise.all([
      executeQuery(query, queryParams),
      executeQuery(countQuery, countParams),
    ]);

    await auditLog(req, 'VIEW_ALL_USERS', 'USER', null, null, null);

    res.json(
      formatSuccessResponse({
        data: users,
        pagination: {
          page,
          limit,
          total: counts[0]?.total || 0,
        },
      }, 'Users retrieved')
    );
  } catch (error) {
    next(error);
  }
};

// Deactivate User (Admin)
export const deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Don't allow deactivating yourself
    if (parseInt(userId) === req.user.user_id) {
      throw new AppError('Cannot deactivate your own account', 400, 'INVALID_OPERATION');
    }

    const updateQuery = 'UPDATE users SET is_active = false, deleted_at = NOW() WHERE user_id = ?';
    await executeQuery(updateQuery, [userId]);

    await auditLog(req, 'DEACTIVATE_USER', 'USER', userId, null, { is_active: false });

    res.json(formatSuccessResponse(null, 'User deactivated successfully'));
  } catch (error) {
    next(error);
  }
};

// Reset User Password (Admin)
export const resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Validate password strength
    const validation = validatePasswordResetInput(newPassword);
    if (!validation.valid) {
      throw new AppError(validation.errors.join('; '), 400, 'WEAK_PASSWORD');
    }

    const passwordHash = await hashPassword(newPassword);

    const updateQuery = `
      UPDATE users SET password_hash = ?
      WHERE user_id = ?
    `;

    await executeQuery(updateQuery, [passwordHash, userId]);

    await auditLog(req, 'RESET_USER_PASSWORD', 'USER', userId, null, null);

    res.json(formatSuccessResponse(null, 'User password reset successfully'));
  } catch (error) {
    next(error);
  }
};

// Get System Statistics (Admin)
export const getSystemStatistics = async (req, res, next) => {
  try {
    const queries = {
      totalUsers: 'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL',
      totalPatients: 'SELECT COUNT(*) as count FROM patients',
      totalDoctors: 'SELECT COUNT(*) as count FROM doctors',
      totalAppointments: 'SELECT COUNT(*) as count FROM appointments WHERE status = "COMPLETED"',
      activeAppointments: 'SELECT COUNT(*) as count FROM appointments WHERE status = "SCHEDULED" AND appointment_date >= NOW()',
      pendingAppointments: 'SELECT COUNT(*) as count FROM appointments WHERE status = "SCHEDULED" AND appointment_date < NOW()',
      totalRecords: 'SELECT COUNT(*) as count FROM medical_records',
      totalPrescriptions: 'SELECT COUNT(*) as count FROM prescriptions WHERE is_active = true',
    };

    const stats = {};

    for (const [key, query] of Object.entries(queries)) {
      const results = await executeQuery(query);
      stats[key] = results[0]?.count || 0;
    }

    // Get recent appointments
    const recentAppointmentsQuery = `
      SELECT a.appointment_id, a.appointment_date, a.status,
        u.first_name, u.last_name, d.specialization
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN users u ON p.user_id = u.user_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      ORDER BY a.appointment_date DESC
      LIMIT 10
    `;

    stats.recentAppointments = await executeQuery(recentAppointmentsQuery);

    await auditLog(req, 'VIEW_SYSTEM_STATISTICS', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse(stats, 'System statistics retrieved'));
  } catch (error) {
    next(error);
  }
};

// Get Audit Log (Admin)
export const getAuditLog = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { action, user_id, entity_type, status } = req.query;

    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }

    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM audit_log
      WHERE 1=1
      ${action ? ' AND action = ?' : ''}
      ${user_id ? ' AND user_id = ?' : ''}
      ${entity_type ? ' AND entity_type = ?' : ''}
      ${status ? ' AND status = ?' : ''}
    `;

    const [logs, counts] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, params.slice(0, -2)),
    ]);

    res.json(
      formatSuccessResponse({
        data: logs,
        pagination: {
          page,
          limit,
          total: counts[0]?.total || 0,
        },
      }, 'Audit logs retrieved')
    );
  } catch (error) {
    next(error);
  }
};

// Manage User Roles (Admin)
export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
      throw new AppError('Invalid role', 400, 'INVALID_ROLE');
    }

    if (parseInt(userId) === req.user.user_id) {
      throw new AppError('Cannot change your own role', 400, 'INVALID_OPERATION');
    }

    // Get old role for audit
    const userQuery = 'SELECT role FROM users WHERE user_id = ?';
    const users = await executeQuery(userQuery, [userId]);

    if (users.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updateQuery = 'UPDATE users SET role = ? WHERE user_id = ?';
    await executeQuery(updateQuery, [role, userId]);

    await auditLog(req, 'UPDATE_USER_ROLE', 'USER', userId, { role: users[0].role }, { role });

    res.json(formatSuccessResponse(null, 'User role updated successfully'));
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN CONTROL SERVER - NEW FEATURES
// ==========================================

/**
 * Get all patients with filtering and search
 */
export const getAllPatients = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        u.user_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.phone_number,
        u.is_active,
        u.is_verified,
        u.created_at,
        u.last_login,
        p.patient_id,
        p.date_of_birth,
        p.gender,
        p.blood_group,
        p.address,
        p.city,
        p.country
      FROM users u
      LEFT JOIN patients p ON u.user_id = p.user_id
      WHERE u.role = 'PATIENT'
    `;

    // Add search filter
    if (search) {
      query += ` AND (u.email LIKE ? OR u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
    }

    // Add status filter
    if (status === 'active') {
      query += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      query += ` AND u.is_active = FALSE`;
    } else if (status === 'unverified') {
      query += ` AND u.is_verified = FALSE`;
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;

    // Build params array
    let params = [];
    if (search) {
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    params.push(parseInt(limit), offset);

    const patients = await executeQuery(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users u WHERE u.role = "PATIENT"';
    if (search) {
      countQuery += ` AND (u.email LIKE ? OR u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
    }
    if (status === 'active') {
      countQuery += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      countQuery += ` AND u.is_active = FALSE`;
    } else if (status === 'unverified') {
      countQuery += ` AND u.is_verified = FALSE`;
    }

    let countParams = [];
    if (search) {
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    await auditLog(req, 'ADMIN_VIEW_PATIENTS', 'USER', null, null, {
      search,
      status,
      page,
      limit,
    });

    res.status(200).json(
      formatSuccessResponse(
        {
          patients,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
          },
        },
        'Patients retrieved successfully',
        200
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient details
 */
export const getPatientDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT 
        u.*,
        p.*
      FROM users u
      LEFT JOIN patients p ON u.user_id = p.user_id
      WHERE u.user_id = ? AND u.role = 'PATIENT'
    `;

    const result = await executeQuery(query, [userId]);

    if (result.length === 0) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    const patient = result[0];

    await auditLog(req, 'ADMIN_VIEW_PATIENT_DETAILS', 'USER', userId, null, {
      email: patient.email,
    });

    res.status(200).json(
      formatSuccessResponse(patient, 'Patient details retrieved successfully', 200)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset patient password with reason
 */
export const resetPatientPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword, reason } = req.body;

    // Validate input
    const validation = validatePasswordResetInput(newPassword);
    if (!validation.valid) {
      throw new AppError(validation.errors.join('; '), 400, 'INVALID_PASSWORD');
    }

    if (!reason) {
      throw new AppError('Reason for password reset is required', 400, 'MISSING_REASON');
    }

    // Check if user exists
    const userQuery = 'SELECT user_id, email FROM users WHERE user_id = ? AND role = "PATIENT"';
    const userResult = await executeQuery(userQuery, [userId]);

    if (userResult.length === 0) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    const user = userResult[0];
    const passwordHash = await hashPassword(newPassword);

    // Update password
    const updateQuery = 'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?';
    await executeQuery(updateQuery, [passwordHash, userId]);

    // Log credential change
    await executeQuery(
      `INSERT INTO credential_audit_log 
       (target_user_id, admin_user_id, action, action_type, reason, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, req.user.user_id, 'PASSWORD_RESET', 'PASSWORD_RESET', reason, 'SUCCESS']
    );

    await auditLog(req, 'ADMIN_RESET_PATIENT_PASSWORD', 'USER', userId, null, {
      email: user.email,
      reason,
    });

    res.status(200).json(
      formatSuccessResponse(
        { message: 'Password reset successfully' },
        'Patient password has been reset',
        200
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Change patient account status
 */
export const changePatientStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'LOCKED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    // Check if user exists
    const userQuery = 'SELECT user_id, email, is_active FROM users WHERE user_id = ? AND role = "PATIENT"';
    const userResult = await executeQuery(userQuery, [userId]);

    if (userResult.length === 0) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    const user = userResult[0];

    // Map status to is_active flag
    const isActive = status === 'ACTIVE';
    const updateQuery = 'UPDATE users SET is_active = ? WHERE user_id = ?';
    await executeQuery(updateQuery, [isActive, userId]);

    // Record status change in history
    await executeQuery(
      `INSERT INTO account_status_history 
       (target_user_id, admin_user_id, previous_status, new_status, reason) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, req.user.user_id, user.is_active ? 'ACTIVE' : 'INACTIVE', status, reason]
    );

    await auditLog(req, 'ADMIN_CHANGE_PATIENT_STATUS', 'USER', userId, user.is_active ? 1 : 0, {
      newStatus: status,
      email: user.email,
      reason,
    });

    res.status(200).json(
      formatSuccessResponse(
        { status, message: `Patient account has been ${status.toLowerCase()}` },
        'Patient status updated successfully',
        200
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get credential audit log
 */
export const getCredentialAuditLog = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user exists
    const userQuery = 'SELECT user_id FROM users WHERE user_id = ?';
    const userResult = await executeQuery(userQuery, [userId]);

    if (userResult.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const query = `
      SELECT * FROM credential_audit_log
      WHERE target_user_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const logs = await executeQuery(query, [userId, parseInt(limit), offset]);

    const countQuery = 'SELECT COUNT(*) as total FROM credential_audit_log WHERE target_user_id = ?';
    const countResult = await executeQuery(countQuery, [userId]);
    const total = countResult[0].total;

    res.status(200).json(
      formatSuccessResponse(
        {
          logs,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
          },
        },
        'Credential audit log retrieved successfully',
        200
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'PATIENT' AND is_active = TRUE) as active_patients,
        (SELECT COUNT(*) FROM users WHERE role = 'PATIENT') as total_patients,
        (SELECT COUNT(*) FROM users WHERE role = 'DOCTOR' AND is_active = TRUE) as active_doctors,
        (SELECT COUNT(*) FROM users WHERE role = 'DOCTOR') as total_doctors,
        (SELECT COUNT(*) FROM appointments WHERE status = 'SCHEDULED') as scheduled_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'COMPLETED') as completed_appointments,
        (SELECT COUNT(*) FROM users WHERE role = 'PATIENT' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) as new_patients_today,
        (SELECT COUNT(*) FROM users WHERE is_active = FALSE) as suspended_accounts
    `;

    const result = await executeQuery(query);
    const stats = result[0];

    await auditLog(req, 'ADMIN_VIEW_DASHBOARD_STATS', 'SYSTEM', null, null, null);

    res.status(200).json(
      formatSuccessResponse(stats, 'Dashboard statistics retrieved successfully', 200)
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getAllUsers,
  deactivateUser,
  resetUserPassword,
  getSystemStatistics,
  getAuditLog,
  updateUserRole,
  getAllPatients,
  getPatientDetails,
  resetPatientPassword,
  changePatientStatus,
  getCredentialAuditLog,
  getDashboardStats,
};
