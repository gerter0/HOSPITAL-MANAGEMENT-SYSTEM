import config from '../config/config.js';
import { executeQuery } from '../config/database.js';

// Audit logger for HIPAA compliance
export const auditLog = async (req, action, entityType, entityId, oldValues = null, newValues = null) => {
  try {
    const userId = req.user?.user_id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    const query = `
      INSERT INTO audit_log (
        user_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS')
    `;

    await executeQuery(query, [
      userId,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent,
    ]);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
};

// Log failed audit event
export const auditLogFailure = async (req, action, entityType, errorMessage) => {
  try {
    const userId = req.user?.user_id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    const query = `
      INSERT INTO audit_log (
        user_id, action, entity_type,
        ip_address, user_agent, status, error_message
      ) VALUES (?, ?, ?, ?, ?, 'FAILURE', ?)
    `;

    await executeQuery(query, [
      userId,
      action,
      entityType,
      ipAddress,
      userAgent,
      errorMessage,
    ]);
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

export default { auditLog, auditLogFailure };
