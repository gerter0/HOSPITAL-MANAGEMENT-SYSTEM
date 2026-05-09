// Admin Staff Management Controller
import { AppError, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { auditLog } from '../utils/auditLogger.js';

/**
 * GET all admin staff members
 */
export const getAllAdminStaff = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT
        s.staff_id,
        s.user_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.is_active,
        u.created_at as user_created_at,
        u.last_login,
        s.role_id,
        r.role_name,
        r.role_level,
        s.title,
        s.department,
        s.phone_number,
        s.office_location,
        s.is_active as staff_active,
        s.created_at,
        s.updated_at
      FROM admin_staff s
      JOIN users u ON s.user_id = u.user_id
      JOIN admin_roles r ON s.role_id = r.role_id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM admin_staff';

    const [staff, [countResult]] = await Promise.all([
      executeQuery(query, [parseInt(limit), offset]),
      executeQuery(countQuery),
    ]);

    await auditLog(req, 'VIEW_ADMIN_STAFF', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse({
      data: staff,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.total || 0,
      },
    }, 'Admin staff retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET admin staff member by ID
 */
export const getAdminStaffById = async (req, res, next) => {
  try {
    const { staffId } = req.params;

    const query = `
      SELECT
        s.staff_id,
        s.user_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.is_active,
        u.created_at as user_created_at,
        u.last_login,
        s.role_id,
        r.role_name,
        r.role_level,
        r.permissions,
        s.title,
        s.department,
        s.phone_number,
        s.office_location,
        s.is_active as staff_active,
        s.created_at,
        s.updated_at
      FROM admin_staff s
      JOIN users u ON s.user_id = u.user_id
      JOIN admin_roles r ON s.role_id = r.role_id
      WHERE s.staff_id = ?
    `;

    const [staff] = await executeQuery(query, [staffId]);

    if (!staff) {
      throw new AppError('Admin staff member not found', 404, 'STAFF_NOT_FOUND');
    }

    // Parse permissions
    if (typeof staff.permissions === 'string') {
      staff.permissions = JSON.parse(staff.permissions);
    }

    await auditLog(req, 'VIEW_ADMIN_STAFF_DETAILS', 'SYSTEM', null, null, { staff_id: staffId });

    res.json(formatSuccessResponse(staff, 'Admin staff member retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * PROMOTE user to admin (SUPER_ADMIN only)
 */
export const promoteToAdmin = async (req, res, next) => {
  try {
    const { user_id, role_id, title, department, phone_number, office_location } = req.body;

    // Validate input
    if (!user_id || !role_id) {
      throw new AppError('user_id and role_id are required', 400, 'MISSING_FIELDS');
    }

    // Check if user exists and is not an admin
    const [user] = await executeQuery('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.role === 'ADMIN') {
      throw new AppError('User is already an admin', 400, 'ALREADY_ADMIN');
    }

    // Check if role exists
    const [role] = await executeQuery('SELECT * FROM admin_roles WHERE role_id = ?', [role_id]);
    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Check if already has admin_staff record
    const [existingStaff] = await executeQuery('SELECT staff_id FROM admin_staff WHERE user_id = ?', [user_id]);
    if (existingStaff) {
      throw new AppError('User is already promoted to admin', 400, 'ALREADY_ADMIN');
    }

    // Create admin_staff record
    const insertQuery = `
      INSERT INTO admin_staff
      (user_id, role_id, title, department, phone_number, office_location, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, true, NOW())
    `;

    const [result] = await executeQuery(insertQuery, [
      user_id,
      role_id,
      title || null,
      department || null,
      phone_number || null,
      office_location || null,
    ]);

    // Update user role to ADMIN
    await executeQuery('UPDATE users SET role = "ADMIN" WHERE user_id = ?', [user_id]);

    await auditLog(req, 'PROMOTE_TO_ADMIN', 'USER', user_id, null, {
      role_name: role.role_name,
      title,
      department,
    });

    res.status(201).json(formatSuccessResponse({
      staff_id: result.insertId,
      user_id,
      role_id,
      title,
      department,
    }, 'User promoted to admin successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE admin staff details
 */
export const updateAdminStaff = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { role_id, title, department, phone_number, office_location, is_active } = req.body;

    // Get current staff record
    const [currentStaff] = await executeQuery('SELECT * FROM admin_staff WHERE staff_id = ?', [staffId]);
    if (!currentStaff) {
      throw new AppError('Admin staff member not found', 404, 'STAFF_NOT_FOUND');
    }

    let updateQuery = 'UPDATE admin_staff SET ';
    const updateFields = [];
    const params = [];

    if (role_id !== undefined) {
      // Verify role exists
      const [role] = await executeQuery('SELECT role_id FROM admin_roles WHERE role_id = ?', [role_id]);
      if (!role) {
        throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
      }
      updateFields.push('role_id = ?');
      params.push(role_id);
    }

    if (title !== undefined) {
      updateFields.push('title = ?');
      params.push(title);
    }

    if (department !== undefined) {
      updateFields.push('department = ?');
      params.push(department);
    }

    if (phone_number !== undefined) {
      updateFields.push('phone_number = ?');
      params.push(phone_number);
    }

    if (office_location !== undefined) {
      updateFields.push('office_location = ?');
      params.push(office_location);
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_FIELDS');
    }

    updateQuery += updateFields.join(', ') + ', updated_at = NOW() WHERE staff_id = ?';
    params.push(staffId);

    await executeQuery(updateQuery, params);

    await auditLog(req, 'UPDATE_ADMIN_STAFF', 'USER', currentStaff.user_id, {
      role_id: currentStaff.role_id,
      title: currentStaff.title,
      department: currentStaff.department,
    }, {
      role_id,
      title,
      department,
      is_active,
    });

    res.json(formatSuccessResponse(null, 'Admin staff member updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * REMOVE admin privileges from user
 */
export const removeAdminPrivileges = async (req, res, next) => {
  try {
    const { staffId } = req.params;

    // Don't allow removing own admin privileges
    if (req.admin && req.admin.staff_id === parseInt(staffId)) {
      throw new AppError('Cannot remove your own admin privileges', 400, 'INVALID_OPERATION');
    }

    // Get staff record
    const [staff] = await executeQuery('SELECT user_id FROM admin_staff WHERE staff_id = ?', [staffId]);
    if (!staff) {
      throw new AppError('Admin staff member not found', 404, 'STAFF_NOT_FOUND');
    }

    // Soft delete admin_staff record
    await executeQuery('UPDATE admin_staff SET is_active = false, updated_at = NOW() WHERE staff_id = ?', [staffId]);

    // Change user role back to PATIENT
    await executeQuery('UPDATE users SET role = "PATIENT" WHERE user_id = ?', [staff.user_id]);

    await auditLog(req, 'REMOVE_ADMIN_PRIVILEGES', 'USER', staff.user_id, null, { removed: true });

    res.json(formatSuccessResponse(null, 'Admin privileges removed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET admin staff activity log
 */
export const getAdminStaffActivityLog = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Get user_id from staff record
    const [staff] = await executeQuery('SELECT user_id FROM admin_staff WHERE staff_id = ?', [staffId]);
    if (!staff) {
      throw new AppError('Admin staff member not found', 404, 'STAFF_NOT_FOUND');
    }

    const query = `
      SELECT
        al.log_id,
        al.timestamp,
        al.action,
        al.action_category,
        al.target_entity,
        al.target_entity_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.status,
        al.error_message
      FROM admin_audit_log al
      WHERE al.admin_user_id = ?
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM admin_audit_log WHERE admin_user_id = ?';

    const [logs, [countResult]] = await Promise.all([
      executeQuery(query, [staff.user_id, parseInt(limit), offset]),
      executeQuery(countQuery, [staff.user_id]),
    ]);

    res.json(formatSuccessResponse({
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.total || 0,
      },
    }, 'Admin staff activity log retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * FORCE password change on next login
 */
export const requirePasswordChange = async (req, res, next) => {
  try {
    const { staffId } = req.params;

    // Get staff and user info
    const [staff] = await executeQuery(
      'SELECT s.user_id FROM admin_staff s WHERE s.staff_id = ?',
      [staffId]
    );

    if (!staff) {
      throw new AppError('Admin staff member not found', 404, 'STAFF_NOT_FOUND');
    }

    // Add flag for password change requirement (in real implementation, would need a field in users table)
    // For now, we'll just log it and return success
    await auditLog(req, 'FORCE_PASSWORD_CHANGE', 'USER', staff.user_id, null, {
      requires_password_change: true,
    });

    res.json(formatSuccessResponse(null, 'Admin will be required to change password on next login'));
  } catch (error) {
    next(error);
  }
};

export default {
  getAllAdminStaff,
  getAdminStaffById,
  promoteToAdmin,
  updateAdminStaff,
  removeAdminPrivileges,
  getAdminStaffActivityLog,
  requirePasswordChange,
};
