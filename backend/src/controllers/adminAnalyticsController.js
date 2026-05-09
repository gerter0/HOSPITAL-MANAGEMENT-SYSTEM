// Admin Analytics & Dashboard Controller
import { AppError, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { auditLog } from '../utils/auditLogger.js';

/**
 * GET main admin dashboard with key metrics
 */
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'PATIENT' AND is_active = true AND deleted_at IS NULL) as active_patients,
        (SELECT COUNT(*) FROM users WHERE role = 'PATIENT' AND deleted_at IS NULL) as total_patients,
        (SELECT COUNT(*) FROM users WHERE role = 'DOCTOR' AND is_active = true AND deleted_at IS NULL) as active_doctors,
        (SELECT COUNT(*) FROM users WHERE role = 'DOCTOR' AND deleted_at IS NULL) as total_doctors,
        (SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true) as active_admins,
        (SELECT COUNT(*) FROM users WHERE is_active = false AND deleted_at IS NULL) as suspended_accounts,
        (SELECT COUNT(*) FROM users WHERE locked_until IS NOT NULL AND locked_until > NOW()) as locked_accounts,
        (SELECT COUNT(*) FROM users WHERE is_verified = false AND deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as unverified_recent,
        (SELECT COUNT(*) FROM users WHERE two_factor_enabled = true AND role = 'ADMIN') as admins_with_2fa,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) AND deleted_at IS NULL) as new_users_today,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) AND deleted_at IS NULL) as new_users_week,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) AND deleted_at IS NULL) as new_users_month
    `;

    const [metrics] = await executeQuery(query);

    await auditLog(req, 'VIEW_DASHBOARD_METRICS', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse(metrics, 'Dashboard metrics retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET user registration trends
 */
export const getUserTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    const query = `
      SELECT
        DATE(created_at) as registration_date,
        COUNT(*) as total_registrations,
        SUM(CASE WHEN role = 'PATIENT' THEN 1 ELSE 0 END) as patient_registrations,
        SUM(CASE WHEN role = 'DOCTOR' THEN 1 ELSE 0 END) as doctor_registrations,
        SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as verified_count
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY registration_date DESC
    `;

    const trends = await executeQuery(query, [daysNum]);

    // Calculate summary stats
    const summary = {
      period_days: daysNum,
      total_registrations: trends.reduce((sum, t) => sum + t.total_registrations, 0),
      avg_daily: Math.round(trends.reduce((sum, t) => sum + t.total_registrations, 0) / daysNum),
      patient_total: trends.reduce((sum, t) => sum + t.patient_registrations, 0),
      doctor_total: trends.reduce((sum, t) => sum + t.doctor_registrations, 0),
      verified_total: trends.reduce((sum, t) => sum + t.verified_count, 0),
    };

    await auditLog(req, 'VIEW_USER_TRENDS', 'SYSTEM', null, null, { days: daysNum });

    res.json(formatSuccessResponse({
      summary,
      daily_breakdown: trends,
    }, 'User registration trends retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET account health metrics
 */
export const getAccountHealth = async (req, res, next) => {
  try {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND role IN ('PATIENT', 'DOCTOR', 'ADMIN')) as total_accounts,
        (SELECT COUNT(*) FROM users WHERE is_active = true AND deleted_at IS NULL) as active_accounts,
        (SELECT COUNT(*) FROM users WHERE is_active = false AND deleted_at IS NULL) as suspended_accounts,
        (SELECT COUNT(*) FROM users WHERE locked_until > NOW()) as locked_accounts,
        (SELECT COUNT(*) FROM users WHERE is_verified = false AND deleted_at IS NULL) as unverified_accounts,
        (SELECT COUNT(*) FROM users WHERE failed_login_attempts >= 3) as high_failed_attempts,
        (SELECT COUNT(*) FROM users WHERE last_login IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)) as never_logged_in_30d,
        (SELECT COUNT(*) FROM users WHERE two_factor_enabled = true) as 2fa_enabled_count,
        (SELECT COUNT(*) FROM users WHERE two_factor_enabled = false) as 2fa_disabled_count,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL) as soft_deleted_accounts
    `;

    const [health] = await executeQuery(query);

    // Calculate percentages
    const accountHealth = {
      ...health,
      active_percentage: health.total_accounts > 0 ? Math.round((health.active_accounts / health.total_accounts) * 100) : 0,
      suspended_percentage: health.total_accounts > 0 ? Math.round((health.suspended_accounts / health.total_accounts) * 100) : 0,
      verified_percentage: health.total_accounts > 0 ? Math.round(((health.total_accounts - health.unverified_accounts) / health.total_accounts) * 100) : 0,
      '2fa_adoption_rate': health.total_accounts > 0 ? Math.round((health['2fa_enabled_count'] / health.total_accounts) * 100) : 0,
    };

    await auditLog(req, 'VIEW_ACCOUNT_HEALTH', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse(accountHealth, 'Account health retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET credential management analytics
 */
export const getCredentialAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    const query = `
      SELECT
        action_type,
        COUNT(*) as count,
        DATE(timestamp) as date
      FROM credential_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY action_type, DATE(timestamp)
      ORDER BY date DESC, action_type
    `;

    const logs = await executeQuery(query, [daysNum]);

    // Summary stats
    const summary = {
      total_credential_changes: logs.reduce((sum, log) => sum + log.count, 0),
      password_resets: logs.filter(l => l.action_type === 'PASSWORD_RESET').reduce((sum, l) => sum + l.count, 0),
      email_changes: logs.filter(l => l.action_type === 'EMAIL_CHANGE').reduce((sum, l) => sum + l.count, 0),
      account_unlocks: logs.filter(l => l.action_type === 'ACCOUNT_UNLOCK').reduce((sum, l) => sum + l.count, 0),
      username_changes: logs.filter(l => l.action_type === 'USERNAME_CHANGE').reduce((sum, l) => sum + l.count, 0),
    };

    await auditLog(req, 'VIEW_CREDENTIAL_ANALYTICS', 'SYSTEM', null, null, { days: daysNum });

    res.json(formatSuccessResponse({
      summary,
      daily_breakdown: logs,
    }, 'Credential analytics retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET admin actions activity heatmap
 */
export const getAdminActivityHeatmap = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = Math.min(Math.max(parseInt(days) || 7, 1), 90);

    const query = `
      SELECT
        HOUR(timestamp) as hour,
        DATE(timestamp) as date,
        COUNT(*) as action_count,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failure_count,
        action_category
      FROM admin_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY HOUR(timestamp), DATE(timestamp), action_category
      ORDER BY date DESC, hour DESC
    `;

    const heatmapData = await executeQuery(query, [daysNum]);

    // Calculate peak hours
    const hourlyStats = {};
    heatmapData.forEach(entry => {
      const hour = entry.hour;
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { hour, total_actions: 0, categories: {} };
      }
      hourlyStats[hour].total_actions += entry.action_count;
      if (!hourlyStats[hour].categories[entry.action_category]) {
        hourlyStats[hour].categories[entry.action_category] = 0;
      }
      hourlyStats[hour].categories[entry.action_category] += entry.action_count;
    });

    const peakHours = Object.values(hourlyStats).sort((a, b) => b.total_actions - a.total_actions).slice(0, 5);

    await auditLog(req, 'VIEW_ADMIN_ACTIVITY_HEATMAP', 'SYSTEM', null, null, { days: daysNum });

    res.json(formatSuccessResponse({
      period_days: daysNum,
      hourly_breakdown: heatmapData,
      peak_hours: peakHours,
    }, 'Admin activity heatmap retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET system health metrics (database, storage, performance)
 */
export const getSystemHealthMetrics = async (req, res, next) => {
  try {
    // Database size and table information
    const dbQuery = `
      SELECT
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb,
        table_rows
      FROM information_schema.TABLES
      WHERE table_schema = 'hospital_management_system'
      ORDER BY (data_length + index_length) DESC
    `;

    const auditLogQuery = `
      SELECT
        COUNT(*) as total_records,
        ROUND(SUM(CHAR_LENGTH(CAST(details AS CHAR))) / 1024 / 1024, 2) as storage_mb,
        MIN(timestamp) as oldest_record,
        MAX(timestamp) as newest_record
      FROM admin_audit_log
    `;

    const [tableStats, [auditLogStats]] = await Promise.all([
      executeQuery(dbQuery),
      executeQuery(auditLogQuery),
    ]);

    const totalSize = tableStats.reduce((sum, t) => sum + t.size_mb, 0);

    await auditLog(req, 'VIEW_SYSTEM_HEALTH', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse({
      database: {
        total_size_mb: Math.round(totalSize * 100) / 100,
        table_count: tableStats.length,
        tables: tableStats,
      },
      audit_log: {
        total_records: auditLogStats.total_records,
        storage_mb: auditLogStats.storage_mb,
        oldest_record: auditLogStats.oldest_record,
        newest_record: auditLogStats.newest_record,
        daily_growth_estimate_mb: Math.round((auditLogStats.storage_mb / Math.max((new Date(auditLogStats.newest_record) - new Date(auditLogStats.oldest_record)) / (1000 * 60 * 60 * 24), 1)) * 100) / 100,
      },
    }, 'System health metrics retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET anomaly detection report
 */
export const getAnomalies = async (req, res, next) => {
  try {
    const anomalies = [];

    // Check for brute force attempts
    const bruteForceQuery = `
      SELECT
        user_id,
        COUNT(*) as failed_attempts,
        MAX(timestamp) as last_attempt
      FROM audit_log
      WHERE action = 'LOGIN_ATTEMPT' AND status = 'FAILURE'
      AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY user_id
      HAVING failed_attempts >= 5
    `;

    const bruteForceAttempts = await executeQuery(bruteForceQuery);
    if (bruteForceAttempts.length > 0) {
      anomalies.push({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        count: bruteForceAttempts.length,
        details: bruteForceAttempts,
        description: `Detected ${bruteForceAttempts.length} user(s) with 5+ failed login attempts in the last hour`,
      });
    }

    // Check for mass user deactivations
    const massDeactivationQuery = `
      SELECT
        user_id,
        COUNT(*) as deactivations,
        DATE(timestamp) as date
      FROM admin_audit_log
      WHERE action = 'DEACTIVATE_USER'
      AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY user_id, DATE(timestamp)
      HAVING deactivations >= 10
    `;

    const massDeactivations = await executeQuery(massDeactivationQuery);
    if (massDeactivations.length > 0) {
      anomalies.push({
        type: 'MASS_DEACTIVATION',
        severity: 'MEDIUM',
        count: massDeactivations.length,
        details: massDeactivations,
        description: `Detected mass account deactivations: ${massDeactivations.length} admin(s) deactivated 10+ accounts`,
      });
    }

    // Check for unusual IP addresses in admin actions
    const unusualIPQuery = `
      SELECT
        ip_address,
        COUNT(*) as action_count,
        COUNT(DISTINCT admin_user_id) as unique_admins,
        GROUP_CONCAT(DISTINCT action SEPARATOR ', ') as actions
      FROM admin_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY ip_address
      ORDER BY action_count DESC
      LIMIT 10
    `;

    const unusualIPs = await executeQuery(unusualIPQuery);

    await auditLog(req, 'VIEW_ANOMALIES', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse({
      total_anomalies: anomalies.length,
      anomalies,
      recent_ip_activities: unusualIPs,
    }, 'Anomaly detection report retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET analytics export (CSV/JSON)
 */
export const exportAnalytics = async (req, res, next) => {
  try {
    const { format = 'json', start_date, end_date, report_type = 'summary' } = req.query;

    if (!['json', 'csv'].includes(format)) {
      throw new AppError('Format must be json or csv', 400, 'INVALID_FORMAT');
    }

    let query = `
      SELECT * FROM admin_audit_log
      WHERE timestamp >= ? AND timestamp <= ?
    `;

    const params = [
      start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end_date || new Date(),
    ];

    const data = await executeQuery(query, params);

    await auditLog(req, 'EXPORT_ANALYTICS', 'SYSTEM', null, null, {
      format,
      report_type,
      record_count: data.length,
    });

    if (format === 'json') {
      res.json(formatSuccessResponse({
        export_date: new Date().toISOString(),
        record_count: data.length,
        data,
      }, 'Analytics exported as JSON'));
    } else {
      // CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');

      // Create CSV header
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(',')),
      ].join('\n');

      res.send(csvContent);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboardMetrics,
  getUserTrends,
  getAccountHealth,
  getCredentialAnalytics,
  getAdminActivityHeatmap,
  getSystemHealthMetrics,
  getAnomalies,
  exportAnalytics,
};
