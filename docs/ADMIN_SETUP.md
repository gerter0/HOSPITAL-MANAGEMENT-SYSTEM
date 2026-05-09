# Admin System Setup Guide

## Overview

This guide walks you through setting up the admin system for the Hospital Management System, including creating the first admin user, configuring permissions, and managing admin staff.

## Prerequisites

- MySQL/MariaDB database running
- Node.js backend server running
- Admin enhancements database migration applied

## Step 1: Apply Database Migration

First, apply the admin enhancements schema to add all necessary tables and default roles:

```bash
mysql -u your_username -p hospital_management_system < database/admin-enhancements.sql
```

This creates:
- `admin_roles` - Admin role definitions
- `admin_staff` - Admin staff assignments
- `admin_audit_log` - Audit trail for admin actions
- `system_alerts` - System alert management
- `approval_requests` - Approval workflow
- `export_jobs` - Data export tracking
- `bulk_operation_jobs` - Bulk operation tracking
- And other supporting tables

Verify tables were created:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'hospital_management_system'
AND TABLE_NAME IN ('admin_roles', 'admin_staff', 'admin_audit_log');
```

Verify default roles exist:
```sql
SELECT role_id, role_name, role_level FROM admin_roles ORDER BY role_level;
```

## Step 2: Create First SUPER_ADMIN User

There are two approaches to bootstrap the first admin:

### Option A: Direct Database Insert

Insert directly into database (for initial setup only):

```sql
-- First create regular user
INSERT INTO users (
  email, username, password_hash, first_name, last_name, 
  phone_number, role, is_active, is_verified, created_at
) VALUES (
  'admin@hospital.com',
  'super_admin',
  '$2a$10$...',  -- bcrypt hash of password (generate separately)
  'System',
  'Administrator',
  '+1234567890',
  'ADMIN',
  true,
  true,
  NOW()
);

-- Get the user_id of newly created user
SELECT user_id FROM users WHERE email = 'admin@hospital.com';

-- Promote to SUPER_ADMIN
INSERT INTO admin_staff (user_id, role_id, title, department, is_active, created_at) 
VALUES (
  1,  -- Replace with actual user_id
  1,  -- role_id for SUPER_ADMIN
  'System Administrator',
  'IT',
  true,
  NOW()
);
```

**Note:** To generate a bcrypt password hash, you can use:
```javascript
// In Node.js
const bcrypt = require('bcryptjs');
const password = 'YourSecurePassword123!@#';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

### Option B: API Registration + Promotion

1. Register user normally through registration endpoint
2. Use admin endpoint to promote to admin:
```bash
curl -X POST http://localhost:3000/api/admin/staff \
  -H "Authorization: Bearer <existing_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "role_id": 1,
    "title": "System Administrator",
    "department": "IT"
  }'
```

## Step 3: Enable 2FA for SUPER_ADMIN

2FA is mandatory for admin users. After creating first admin:

1. Admin logs in
2. System prompts to set up 2FA
3. Admin scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Admin saves backup codes
5. Admin must include 2FA token on all subsequent requests

## Step 4: Configure Admin Staff

### Create Additional Admin Roles

As SUPER_ADMIN, create custom role if needed:

```bash
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role_name": "DEPARTMENT_MANAGER",
    "role_level": 5,
    "description": "Department-level management",
    "permissions": {
      "manage_patients": true,
      "manage_doctors": false,
      "manage_admins": false,
      "reset_credentials": true,
      "suspend_accounts": true,
      "view_audit_logs": true,
      "generate_reports": true,
      "manage_roles": false,
      "system_settings": false,
      "export_data": true
    }
  }'
```

### Promote Users to Admin Staff

Promote existing users to admin roles:

```bash
# Promote to HOSPITAL_MANAGER
curl -X POST http://localhost:3000/api/admin/staff \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "X-2FA-Token: <2fa_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 456,
    "role_id": 2,
    "title": "Hospital Manager",
    "department": "Administration",
    "phone_number": "+1234567890",
    "office_location": "Building A, Room 101"
  }'
```

## Step 5: Verify Admin Setup

### Check Admin Staff List

```bash
curl http://localhost:3000/api/admin/staff \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>"
```

### Check Audit Logs

```bash
curl http://localhost:3000/api/admin/audit-logs \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>"
```

### View Dashboard Statistics

```bash
curl http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>"
```

## Step 6: Configure Security Settings

### Environment Variables (Optional)

Add to `.env` file in backend directory:

```env
# Admin Security Settings
ADMIN_2FA_REQUIRED=true
ADMIN_SESSION_TIMEOUT=1800
ADMIN_PASSWORD_MIN_LENGTH=8
ADMIN_MAX_LOGIN_ATTEMPTS=5
ADMIN_LOCK_DURATION=900

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_SENSITIVE_RATE_LIMIT=10

# Audit Configuration
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_POLICY=archive
```

### Update Config File

Update `backend/src/config/config.js` if needed:

```javascript
export default {
  // ... other config
  admin: {
    twoFactorRequired: process.env.ADMIN_2FA_REQUIRED === 'true',
    sessionTimeout: parseInt(process.env.ADMIN_SESSION_TIMEOUT || 1800),
    passwordMinLength: parseInt(process.env.ADMIN_PASSWORD_MIN_LENGTH || 8),
    maxLoginAttempts: parseInt(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || 5),
    lockDuration: parseInt(process.env.ADMIN_LOCK_DURATION || 900),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 60000),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
    sensitiveMax: parseInt(process.env.ADMIN_SENSITIVE_RATE_LIMIT || 10),
  },
};
```

## Step 7: Test Admin Functions

### Test User Creation

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@hospital.com",
    "username": "newuser",
    "first_name": "New",
    "last_name": "User",
    "phone_number": "+1234567890",
    "role": "PATIENT",
    "password": "SecurePassword123!@#"
  }'
```

### Test User Deactivation

```bash
curl -X PUT http://localhost:3000/api/admin/users/123/deactivate \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>" \
  -H "Content-Type: application/json"
```

### Test Analytics Dashboard

```bash
curl http://localhost:3000/api/admin/analytics/dashboard \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>"
```

### Test Monitoring

```bash
curl http://localhost:3000/api/admin/monitoring/system-health \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-2FA-Token: <2fa_token>"
```

## Step 8: Set Up Scheduled Maintenance (Optional)

### Audit Log Cleanup

Schedule periodic cleanup of old audit logs:

```javascript
// In backend/src/jobs/maintenance.js
import cron from 'node-cron';
import { executeQuery } from '../config/database.js';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    const retentionDays = 90;
    await executeQuery(
      'DELETE FROM admin_audit_log WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [retentionDays]
    );
    console.log('Audit log cleanup completed');
  } catch (error) {
    console.error('Audit log cleanup failed:', error);
  }
});
```

### Export Job Cleanup

Clean up old export files:

```javascript
// In backend/src/jobs/maintenance.js
// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  try {
    const expiredJobs = await executeQuery(
      'SELECT file_path FROM export_jobs WHERE expires_at < NOW()'
    );
    
    for (const job of expiredJobs) {
      // Delete file
      fs.unlinkSync(job.file_path);
    }
    
    // Remove expired records
    await executeQuery('DELETE FROM export_jobs WHERE expires_at < NOW()');
    console.log('Export job cleanup completed');
  } catch (error) {
    console.error('Export job cleanup failed:', error);
  }
});
```

## Security Best Practices

### For SUPER_ADMIN

1. **Change default password immediately** after first login
2. **Enable 2FA** on all admin accounts
3. **Use strong passwords** (minimum 12 characters recommended)
4. **Review audit logs regularly** for suspicious activity
5. **Restrict admin access** to minimal required users
6. **Implement IP whitelisting** if possible
7. **Monitor failed login attempts** and lock accounts as needed

### For All Admins

1. **Never share credentials** - each admin gets their own account
2. **Log out after sessions** - don't leave browser windows open
3. **Use unique passwords** - don't reuse passwords from other services
4. **Report suspicious activity** to SUPER_ADMIN
5. **Change password periodically** (every 90 days recommended)
6. **Don't perform unnecessary operations** - audit logs track all actions

## Troubleshooting

### Can't Connect to Admin Endpoints

**Check:**
1. User has role = 'ADMIN' in users table
2. User has admin_staff record with is_active = true
3. JWT token is valid and not expired
4. 2FA token is included in headers (if 2FA enabled)

### Permission Denied on Endpoint

**Check:**
1. Admin's role has required permission
2. admin_roles record has correct permissions JSON
3. admin_staff.is_active = true
4. Correct 2FA token included

### Audit Logs Not Recording

**Check:**
1. admin_audit_log table exists
2. User ID is recorded correctly
3. Timestamps are accurate
4. No errors in application logs

## Support

For additional help:
1. Check application logs: `tail -f logs/backend.log`
2. Review API documentation: `docs/ADMIN_API.md`
3. Run database verification queries from Step 1
4. Contact system administrator

## Next Steps

After initial setup:
1. Create additional admin staff with appropriate roles
2. Configure role-based access for different departments
3. Set up monitoring alerts and thresholds
4. Enable audit log archival for compliance
5. Document your admin access policies
6. Train admin staff on system usage

