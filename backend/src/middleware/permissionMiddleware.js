// Permission-based access control middleware
import { AppError, formatErrorResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';

/**
 * Permission checking middleware
 * Verifies if the current admin user has specific permissions
 * @param {...string} requiredPermissions - Permission keys to check
 */
export const checkPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated and is admin
      if (!req.user) {
        return res.status(401).json(
          formatErrorResponse(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
        );
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json(
          formatErrorResponse(new AppError('Only admins can access this resource', 403, 'FORBIDDEN'))
        );
      }

      // Get admin staff record with role and permissions
      const staffQuery = `
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

      const staffResult = await executeQuery(staffQuery, [req.user.user_id]);

      if (staffResult.length === 0) {
        return res.status(403).json(
          formatErrorResponse(new AppError('Admin staff record not found or inactive', 403, 'FORBIDDEN'))
        );
      }

      const staffRecord = staffResult[0];
      let permissions;

      // Parse JSON permissions
      if (typeof staffRecord.permissions === 'string') {
        permissions = JSON.parse(staffRecord.permissions);
      } else {
        permissions = staffRecord.permissions || {};
      }

      // Attach admin info to request
      req.admin = {
        staff_id: staffRecord.staff_id,
        role_id: staffRecord.role_id,
        role_name: staffRecord.role_name,
        role_level: staffRecord.role_level,
        permissions,
      };

      // Check if user has all required permissions
      const missingPermissions = requiredPermissions.filter(p => !permissions[p]);

      if (missingPermissions.length > 0) {
        return res.status(403).json(
          formatErrorResponse(
            new AppError(
              `Missing required permissions: ${missingPermissions.join(', ')}`,
              403,
              'INSUFFICIENT_PERMISSIONS'
            )
          )
        );
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json(
        formatErrorResponse(new AppError('Internal server error', 500, 'INTERNAL_ERROR'))
      );
    }
  };
};

/**
 * Permission checking for granular access (can be used at route level)
 * Example: checkAnyPermission('manage_patients', 'manage_doctors') - allows if user has ANY of these
 */
export const checkAnyPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(
          formatErrorResponse(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
        );
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json(
          formatErrorResponse(new AppError('Only admins can access this resource', 403, 'FORBIDDEN'))
        );
      }

      // Get admin staff record
      const staffQuery = `
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

      const staffResult = await executeQuery(staffQuery, [req.user.user_id]);

      if (staffResult.length === 0) {
        return res.status(403).json(
          formatErrorResponse(new AppError('Admin staff record not found or inactive', 403, 'FORBIDDEN'))
        );
      }

      const staffRecord = staffResult[0];
      let permissions;

      if (typeof staffRecord.permissions === 'string') {
        permissions = JSON.parse(staffRecord.permissions);
      } else {
        permissions = staffRecord.permissions || {};
      }

      req.admin = {
        staff_id: staffRecord.staff_id,
        role_id: staffRecord.role_id,
        role_name: staffRecord.role_name,
        role_level: staffRecord.role_level,
        permissions,
      };

      // Check if user has ANY of the required permissions
      const hasAnyPermission = requiredPermissions.some(p => permissions[p]);

      if (!hasAnyPermission) {
        return res.status(403).json(
          formatErrorResponse(
            new AppError(
              `Requires at least one of these permissions: ${requiredPermissions.join(', ')}`,
              403,
              'INSUFFICIENT_PERMISSIONS'
            )
          )
        );
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json(
        formatErrorResponse(new AppError('Internal server error', 500, 'INTERNAL_ERROR'))
      );
    }
  };
};

/**
 * Check admin role level (hierarchical: 1=SUPER_ADMIN, 2=HOSPITAL_MANAGER, etc)
 * Lower numbers = higher access
 */
export const checkMinimumRoleLevel = (maxRoleLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(
          formatErrorResponse(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
        );
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json(
          formatErrorResponse(new AppError('Only admins can access this resource', 403, 'FORBIDDEN'))
        );
      }

      const staffQuery = `
        SELECT r.role_level, r.role_name
        FROM admin_staff s
        JOIN admin_roles r ON s.role_id = r.role_id
        WHERE s.user_id = ? AND s.is_active = true
      `;

      const staffResult = await executeQuery(staffQuery, [req.user.user_id]);

      if (staffResult.length === 0) {
        return res.status(403).json(
          formatErrorResponse(new AppError('Admin staff record not found', 403, 'FORBIDDEN'))
        );
      }

      const roleLevel = staffResult[0].role_level;

      if (roleLevel > maxRoleLevel) {
        return res.status(403).json(
          formatErrorResponse(
            new AppError(
              `This action requires role level ${maxRoleLevel} or higher (you are level ${roleLevel})`,
              403,
              'INSUFFICIENT_ROLE_LEVEL'
            )
          )
        );
      }

      next();
    } catch (error) {
      console.error('Role level check error:', error);
      return res.status(500).json(
        formatErrorResponse(new AppError('Internal server error', 500, 'INTERNAL_ERROR'))
      );
    }
  };
};

export default { checkPermission, checkAnyPermission, checkMinimumRoleLevel };
