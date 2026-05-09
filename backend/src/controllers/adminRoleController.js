// Admin Role Management Controller
import { AppError, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { auditLog } from '../utils/auditLogger.js';

/**
 * GET all admin roles
 */
export const getAllRoles = async (req, res, next) => {
  try {
    const query = `
      SELECT
        role_id,
        role_name,
        role_level,
        description,
        permissions,
        is_active,
        created_at,
        updated_at
      FROM admin_roles
      ORDER BY role_level ASC
    `;

    const roles = await executeQuery(query);

    // Parse permissions JSON
    const parsedRoles = roles.map(role => ({
      ...role,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions,
    }));

    await auditLog(req, 'VIEW_ADMIN_ROLES', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse(parsedRoles, 'Admin roles retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET role by ID
 */
export const getRoleById = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    const query = `
      SELECT
        role_id,
        role_name,
        role_level,
        description,
        permissions,
        is_active,
        created_at,
        updated_at
      FROM admin_roles
      WHERE role_id = ?
    `;

    const [role] = await executeQuery(query, [roleId]);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    const parsedRole = {
      ...role,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions,
    };

    await auditLog(req, 'VIEW_ADMIN_ROLE', 'SYSTEM', null, null, { role_id: roleId });

    res.json(formatSuccessResponse(parsedRole, 'Admin role retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * CREATE new admin role (SUPER_ADMIN only)
 */
export const createRole = async (req, res, next) => {
  try {
    const { role_name, role_level, description, permissions } = req.body;

    // Validate input
    if (!role_name || !role_level || !permissions) {
      throw new AppError('role_name, role_level, and permissions are required', 400, 'MISSING_FIELDS');
    }

    if (typeof role_level !== 'number' || role_level < 1 || role_level > 100) {
      throw new AppError('role_level must be a number between 1 and 100', 400, 'INVALID_ROLE_LEVEL');
    }

    // Check if role name already exists
    const [existing] = await executeQuery('SELECT role_id FROM admin_roles WHERE role_name = ?', [role_name]);
    if (existing) {
      throw new AppError('Role with this name already exists', 400, 'ROLE_EXISTS');
    }

    // Validate permissions object
    if (typeof permissions !== 'object' || Array.isArray(permissions)) {
      throw new AppError('Permissions must be an object', 400, 'INVALID_PERMISSIONS');
    }

    const insertQuery = `
      INSERT INTO admin_roles
      (role_name, role_level, description, permissions, is_active, created_at)
      VALUES (?, ?, ?, ?, true, NOW())
    `;

    const [result] = await executeQuery(insertQuery, [
      role_name,
      role_level,
      description || null,
      JSON.stringify(permissions),
    ]);

    await auditLog(req, 'CREATE_ADMIN_ROLE', 'SYSTEM', null, null, {
      role_name,
      role_level,
      permissions,
    });

    res.status(201).json(formatSuccessResponse({
      role_id: result.insertId,
      role_name,
      role_level,
      permissions,
    }, 'Admin role created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE admin role permissions (SUPER_ADMIN only)
 */
export const updateRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { description, permissions, is_active } = req.body;

    // Get current role
    const [currentRole] = await executeQuery('SELECT * FROM admin_roles WHERE role_id = ?', [roleId]);
    if (!currentRole) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    let updateQuery = 'UPDATE admin_roles SET ';
    const updateFields = [];
    const params = [];

    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }

    if (permissions !== undefined) {
      if (typeof permissions !== 'object' || Array.isArray(permissions)) {
        throw new AppError('Permissions must be an object', 400, 'INVALID_PERMISSIONS');
      }
      updateFields.push('permissions = ?');
      params.push(JSON.stringify(permissions));
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_FIELDS');
    }

    updateQuery += updateFields.join(', ') + ', updated_at = NOW() WHERE role_id = ?';
    params.push(roleId);

    await executeQuery(updateQuery, params);

    await auditLog(req, 'UPDATE_ADMIN_ROLE', 'SYSTEM', null, {
      role_name: currentRole.role_name,
      permissions: currentRole.permissions,
      is_active: currentRole.is_active,
    }, {
      description,
      permissions,
      is_active,
    });

    res.json(formatSuccessResponse(null, 'Admin role updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE admin role (soft delete - mark inactive)
 */
export const deleteRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    // Check if role exists
    const [role] = await executeQuery('SELECT * FROM admin_roles WHERE role_id = ?', [roleId]);
    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Check if any staff members have this role
    const [staffCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM admin_staff WHERE role_id = ? AND is_active = true',
      [roleId]
    );

    if (staffCount && staffCount.count > 0) {
      throw new AppError(
        `Cannot delete role - ${staffCount.count} active admin staff members have this role`,
        400,
        'ROLE_IN_USE'
      );
    }

    // Soft delete by marking inactive
    await executeQuery('UPDATE admin_roles SET is_active = false, updated_at = NOW() WHERE role_id = ?', [roleId]);

    await auditLog(req, 'DELETE_ADMIN_ROLE', 'SYSTEM', null, {
      role_name: role.role_name,
    }, {
      is_active: false,
    });

    res.json(formatSuccessResponse(null, 'Admin role deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET detailed permission breakdown for a role
 */
export const getRolePermissionBreakdown = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    const query = `
      SELECT
        role_name,
        role_level,
        permissions
      FROM admin_roles
      WHERE role_id = ?
    `;

    const [role] = await executeQuery(query, [roleId]);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    let permissions = role.permissions;
    if (typeof permissions === 'string') {
      permissions = JSON.parse(permissions);
    }

    // Create breakdown with descriptions
    const permissionBreakdown = {
      role_name: role.role_name,
      role_level: role.role_level,
      permissions: {
        user_management: {
          manage_patients: permissions.manage_patients || false,
          manage_doctors: permissions.manage_doctors || false,
          manage_admins: permissions.manage_admins || false,
        },
        credential_management: {
          reset_credentials: permissions.reset_credentials || false,
        },
        account_management: {
          suspend_accounts: permissions.suspend_accounts || false,
        },
        system_access: {
          view_audit_logs: permissions.view_audit_logs || false,
          generate_reports: permissions.generate_reports || false,
          system_settings: permissions.system_settings || false,
          manage_roles: permissions.manage_roles || false,
        },
        data_management: {
          export_data: permissions.export_data || false,
        },
      },
    };

    res.json(formatSuccessResponse(permissionBreakdown, 'Permission breakdown retrieved'));
  } catch (error) {
    next(error);
  }
};

export default {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissionBreakdown,
};
