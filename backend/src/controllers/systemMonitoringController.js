// System Monitoring Controller
import { AppError, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { auditLog } from '../utils/auditLogger.js';

/**
 * GET system health status
 */
export const getSystemHealth = async (req, res, next) => {
  try {
    // Check database connectivity and basic queries
    const dbHealthQuery = `
      SELECT
        'database' as component,
        'healthy' as status,
        NOW() as last_check
    `;

    const [dbHealth] = await executeQuery(dbHealthQuery);

    // Get table row counts
    const tableStatsQuery = `
      SELECT
        table_name,
        table_rows,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
      FROM information_schema.TABLES
      WHERE table_schema = 'hospital_management_system'
      ORDER BY table_rows DESC
      LIMIT 10
    `;

    const tableStats = await executeQuery(tableStatsQuery);

    // Check for slow operations
    const slowOpsQuery = `
      SELECT
        COUNT(*) as total_records,
        SUM(CASE WHEN (UNIX_TIMESTAMP(timestamp) - UNIX_TIMESTAMP(created_at)) > 5 THEN 1 ELSE 0 END) as slow_operations
      FROM admin_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;

    const [slowOps] = await executeQuery(slowOpsQuery);

    // System status summary
    const systemStatus = {
      ...dbHealth,
      timestamp: new Date().toISOString(),
      components: {
        database: { status: 'healthy', message: 'Database connection active' },
        tables: { status: tableStats.length > 0 ? 'healthy' : 'warning', message: `${tableStats.length} tables monitored` },
      },
      database_stats: {
        tables_total: tableStats.length,
        largest_tables: tableStats.slice(0, 3),
        slow_operations_last_hour: slowOps.slow_operations || 0,
      },
    };

    await auditLog(req, 'CHECK_SYSTEM_HEALTH', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse(systemStatus, 'System health status retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET database performance metrics
 */
export const getDatabaseMetrics = async (req, res, next) => {
  try {
    // Database size statistics
    const dbSizeQuery = `
      SELECT
        SUM(ROUND(((data_length + index_length) / 1024 / 1024), 2)) as total_size_mb,
        COUNT(*) as table_count,
        SUM(table_rows) as total_rows
      FROM information_schema.TABLES
      WHERE table_schema = 'hospital_management_system'
    `;

    // Query execution stats from audit log
    const queryStatsQuery = `
      SELECT
        COUNT(*) as total_queries,
        DATE(timestamp) as date,
        HOUR(timestamp) as hour
      FROM audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp), HOUR(timestamp)
      ORDER BY date DESC, hour DESC
    `;

    // Admin audit log volume
    const adminLogQuery = `
      SELECT
        COUNT(*) as total_admin_actions,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_actions,
        SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failed_actions,
        ROUND(SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as failure_rate_percent
      FROM admin_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;

    const [[dbSize], queryStats, [adminLog]] = await Promise.all([
      executeQuery(dbSizeQuery),
      executeQuery(queryStatsQuery),
      executeQuery(adminLogQuery),
    ]);

    const metrics = {
      database: {
        total_size_mb: dbSize?.total_size_mb || 0,
        table_count: dbSize?.table_count || 0,
        total_rows: dbSize?.total_rows || 0,
      },
      query_performance: {
        period: 'last_7_days',
        hourly_data: queryStats,
      },
      admin_operations: {
        period: 'last_24_hours',
        total_actions: adminLog?.total_admin_actions || 0,
        successful_actions: adminLog?.successful_actions || 0,
        failed_actions: adminLog?.failed_actions || 0,
        failure_rate_percent: adminLog?.failure_rate_percent || 0,
      },
    };

    await auditLog(req, 'VIEW_DATABASE_METRICS', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse(metrics, 'Database metrics retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET system alerts
 */
export const getSystemAlerts = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const query = `
      SELECT
        alert_id,
        alert_type,
        severity,
        title,
        message,
        details,
        is_acknowledged,
        acknowledged_at,
        acknowledged_by,
        created_at
      FROM system_alerts
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const alerts = await executeQuery(query, [parseInt(limit)]);

    // Generate alerts based on system state
    const generatedAlerts = [];

    // Check for high audit log volume
    const auditLogSizeQuery = `
      SELECT
        COUNT(*) as record_count,
        ROUND(SUM(CHAR_LENGTH(CAST(details AS CHAR))) / 1024 / 1024, 2) as size_mb
      FROM admin_audit_log
    `;

    const [auditLogSize] = await executeQuery(auditLogSizeQuery);
    if (auditLogSize.record_count > 100000) {
      generatedAlerts.push({
        type: 'HIGH_AUDIT_LOG_VOLUME',
        severity: 'MEDIUM',
        message: `Audit log has ${auditLogSize.record_count} records and is ${auditLogSize.size_mb}MB in size`,
        recommendation: 'Consider archiving or purging old audit log entries',
      });
    }

    // Check for many locked accounts
    const lockedAccountsQuery = `
      SELECT COUNT(*) as count FROM users WHERE locked_until > NOW()
    `;

    const [lockedAccounts] = await executeQuery(lockedAccountsQuery);
    if (lockedAccounts.count > 10) {
      generatedAlerts.push({
        type: 'MANY_LOCKED_ACCOUNTS',
        severity: 'MEDIUM',
        message: `${lockedAccounts.count} user accounts are currently locked`,
        recommendation: 'Review for potential security incidents or unlock manually if resolved',
      });
    }

    // Check for unverified accounts
    const unverifiedQuery = `
      SELECT COUNT(*) as count FROM users WHERE is_verified = false AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    const [unverified] = await executeQuery(unverifiedQuery);
    if (unverified.count > 50) {
      generatedAlerts.push({
        type: 'MANY_UNVERIFIED_ACCOUNTS',
        severity: 'LOW',
        message: `${unverified.count} accounts are unverified for more than 7 days`,
        recommendation: 'Consider deactivating or prompting users to verify',
      });
    }

    await auditLog(req, 'VIEW_SYSTEM_ALERTS', 'SYSTEM', null, null, null);

    res.json(formatSuccessResponse({
      stored_alerts: alerts,
      generated_alerts: generatedAlerts,
      total_alerts: alerts.length + generatedAlerts.length,
    }, 'System alerts retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * ACKNOWLEDGE system alert
 */
export const acknowledgeAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    // Update alert as acknowledged
    await executeQuery(
      `UPDATE system_alerts
       SET is_acknowledged = true,
           acknowledged_at = NOW(),
           acknowledged_by = ?
       WHERE alert_id = ?`,
      [req.user.user_id, alertId]
    );

    await auditLog(req, 'ACKNOWLEDGE_ALERT', 'SYSTEM', alertId, null, { acknowledged: true });

    res.json(formatSuccessResponse(null, 'Alert acknowledged'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET audit log statistics
 */
export const getAuditLogStats = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    // Overall statistics
    const overallQuery = `
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        COUNT(DISTINCT user_id) as unique_admins,
        COUNT(DISTINCT ip_address) as unique_ips,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_count,
        SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failed_count
      FROM admin_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    // Daily breakdown
    const dailyQuery = `
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as record_count,
        COUNT(DISTINCT user_id) as unique_admins,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failed
      FROM admin_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;

    // Top actions
    const topActionsQuery = `
      SELECT
        action,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful
      FROM admin_audit_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `;

    const [[overall], daily, topActions] = await Promise.all([
      executeQuery(overallQuery, [daysNum]),
      executeQuery(dailyQuery, [daysNum]),
      executeQuery(topActionsQuery, [daysNum]),
    ]);

    // Calculate storage growth rate
    const totalSize = daily.reduce((sum, d) => sum + d.record_count, 0);
    const avgDailyGrowth = totalSize / daysNum;

    const stats = {
      period_days: daysNum,
      storage_stats: {
        total_records: overall?.total_records || 0,
        estimated_daily_growth: Math.round(avgDailyGrowth),
        estimated_monthly_growth: Math.round(avgDailyGrowth * 30),
        active_days: overall?.active_days || 0,
      },
      activity_stats: {
        unique_admins: overall?.unique_admins || 0,
        unique_ips: overall?.unique_ips || 0,
        successful_actions: overall?.successful_count || 0,
        failed_actions: overall?.failed_count || 0,
        success_rate_percent: overall?.total_records ? Math.round((overall.successful_count / overall.total_records) * 100) : 0,
      },
      daily_breakdown: daily,
      top_actions: topActions,
    };

    await auditLog(req, 'VIEW_AUDIT_LOG_STATS', 'SYSTEM', null, null, { days: daysNum });

    res.json(formatSuccessResponse(stats, 'Audit log statistics retrieved'));
  } catch (error) {
    next(error);
  }
};

export default {
  getSystemHealth,
  getDatabaseMetrics,
  getSystemAlerts,
  acknowledgeAlert,
  getAuditLogStats,
};
