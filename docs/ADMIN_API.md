# Admin System API Documentation

## Overview

This document describes all admin endpoints for the enhanced Hospital Management System admin control panel, including user management, analytics, monitoring, bulk operations, and role-based access control.

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

For ADMIN users with 2FA enabled, include the 2FA token:

```
X-2FA-Token: <2fa_token>
```

## Permission-Based Access Control

Admin users are assigned roles with specific permissions. Permission checks are performed at the endpoint level.

### Admin Roles (by role level - lower = higher privilege)

| Level | Role | Description | Permissions |
|-------|------|-------------|-------------|
| 1 | SUPER_ADMIN | Full system access | All permissions granted |
| 2 | HOSPITAL_MANAGER | Hospital management | manage_patients, manage_doctors, reset_credentials, suspend_accounts, view_audit_logs, generate_reports, export_data |
| 3 | CREDENTIAL_MANAGER | Credential management | reset_credentials, view_audit_logs |
| 4 | SUPPORT_STAFF | Support functions | None - read-only access |

---

## Admin Role Management

### Get All Roles
```
GET /api/admin/roles
```
**Required Permission:** view_audit_logs  
**Response:** Array of all admin roles with permissions

### Get Role by ID
```
GET /api/admin/roles/:roleId
```
**Response:** Detailed role information

### Create Role
```
POST /api/admin/roles
```
**Required Permission:** manage_roles  
**Body:**
```json
{
  "role_name": "CUSTOM_ROLE",
  "role_level": 5,
  "description": "Custom role description",
  "permissions": {
    "manage_patients": true,
    "manage_doctors": false,
    "reset_credentials": true,
    ...
  }
}
```

### Update Role
```
PUT /api/admin/roles/:roleId
```
**Required Permission:** manage_roles  
**Body:** Same as create (all fields optional)

### Delete Role
```
DELETE /api/admin/roles/:roleId
```
**Required Permission:** manage_roles

### Get Permission Breakdown
```
GET /api/admin/roles/:roleId/permissions
```
Returns detailed permission breakdown organized by category

---

## Admin Staff Management

### Get All Admin Staff
```
GET /api/admin/staff?page=1&limit=10
```
**Response:** Paginated list of admin staff members

### Get Admin Staff by ID
```
GET /api/admin/staff/:staffId
```
**Response:** Detailed admin staff member information

### Promote User to Admin
```
POST /api/admin/staff
```
**Required Permission:** manage_admins  
**Body:**
```json
{
  "user_id": 123,
  "role_id": 2,
  "title": "Administrator",
  "department": "IT",
  "phone_number": "+1234567890",
  "office_location": "Building A, Room 101"
}
```

### Update Admin Staff
```
PUT /api/admin/staff/:staffId
```
**Body:**
```json
{
  "role_id": 3,
  "title": "Senior Administrator",
  "is_active": true
}
```

### Remove Admin Privileges
```
DELETE /api/admin/staff/:staffId
```
**Required Permission:** manage_admins  
User role will be changed back to PATIENT

### Get Admin Activity Log
```
GET /api/admin/staff/:staffId/activity?page=1&limit=50
```
Returns all actions performed by this admin staff member

### Force Password Change
```
POST /api/admin/staff/:staffId/require-password-change
```
Admin will be prompted to change password on next login

---

## User Management (Enhanced)

### Get All Users
```
GET /api/admin/users?page=1&limit=10&role=PATIENT&is_active=true
```
**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `role`: Filter by role (PATIENT, DOCTOR, ADMIN)
- `is_active`: Filter by active status (true/false)

### Get All Patients
```
GET /api/admin/patients?page=1&limit=10&search=&status=all
```
**Query Parameters:**
- `search`: Search by email, username, first_name, last_name
- `status`: Filter (all, active, inactive, unverified)

### Get Patient Details
```
GET /api/admin/patients/:userId
```

### Reset User Password
```
POST /api/admin/users/:userId/reset-password
```
**Required Permission:** reset_credentials  
**Body:**
```json
{
  "newPassword": "NewSecurePassword123!@#"
}
```
**Password Requirements:**
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character

### Reset Patient Password (with reason)
```
POST /api/admin/patients/:userId/reset-password
```
**Body:**
```json
{
  "newPassword": "NewSecurePassword123!@#",
  "reason": "User forgot password"
}
```

### Change Patient Status
```
POST /api/admin/patients/:userId/status
```
**Body:**
```json
{
  "status": "ACTIVE|SUSPENDED|DEACTIVATED|LOCKED",
  "reason": "Account restoration"
}
```

### Update User Role
```
PUT /api/admin/users/:userId/role
```
**Required Permission:** manage_roles  
**Body:**
```json
{
  "role": "DOCTOR"
}
```

### Lock User Account
```
POST /api/admin/users/:userId/lock
```
**Required Permission:** suspend_accounts  
**Body:**
```json
{
  "duration": 3600
}
```
Duration in seconds (max 2592000 = 30 days)

### Unlock User Account
```
POST /api/admin/users/:userId/unlock
```
**Required Permission:** suspend_accounts  

### Verify User Email
```
POST /api/admin/users/:userId/verify-email
```
**Required Permission:** manage_patients  

### Toggle 2FA
```
POST /api/admin/users/:userId/toggle-2fa
```
**Body:**
```json
{
  "enable": true
}
```

### Deactivate User
```
PUT /api/admin/users/:userId/deactivate
```
**Required Permission:** suspend_accounts  

---

## Analytics & Dashboards

### Get Dashboard Metrics
```
GET /api/admin/analytics/dashboard
```
Returns key performance indicators for the dashboard

**Response includes:**
- Active/total patients, doctors, admins
- Suspended and locked accounts
- Unverified accounts
- 2FA adoption rate
- New users (today/week/month)

### Get User Registration Trends
```
GET /api/admin/analytics/users?days=30
```
Returns daily registration breakdown

### Get Account Health Metrics
```
GET /api/admin/analytics/accounts
```
Returns account status distribution and health metrics

### Get Credential Analytics
```
GET /api/admin/analytics/credentials?days=30
```
Returns password resets, email changes, and account unlock trends

### Get Admin Activity Heatmap
```
GET /api/admin/analytics/admin-actions?days=7
```
Returns hourly breakdown of admin activities with peak hours

### Get System Health Metrics
```
GET /api/admin/analytics/system-health
```
Returns database size, storage usage, audit log volume

### Get Anomalies Report
```
GET /api/admin/analytics/anomalies
```
Returns detected anomalies:
- Brute force attempts
- Mass deactivations
- Unusual IP activities

### Export Analytics
```
GET /api/admin/analytics/export?format=json&start_date=2024-01-01&end_date=2024-01-31&report_type=summary
```
**Query Parameters:**
- `format`: json or csv (default: json)
- `start_date`: Start date for export
- `end_date`: End date for export
- `report_type`: summary, detailed, etc.

---

## System Monitoring

### Get System Health
```
GET /api/admin/monitoring/system-health
```
Returns overall system status and health indicators

### Get Database Metrics
```
GET /api/admin/monitoring/database
```
Returns database performance metrics, query stats, table sizes

### Get System Alerts
```
GET /api/admin/monitoring/alerts?limit=20
```
Returns generated and stored system alerts

### Acknowledge Alert
```
POST /api/admin/monitoring/alerts/acknowledge/:alertId
```
Mark alert as reviewed by admin

### Get Audit Log Statistics
```
GET /api/admin/monitoring/audit-log-stats?days=30
```
Returns audit log volume, growth rate, top actions

---

## Monitoring & Activity Logs

### Get Registration Monitoring
```
GET /api/admin/monitoring/registrations?days=30&limit=100
```
Returns recent user registrations with verification status

### Get PIN/OTP Monitoring
```
GET /api/admin/monitoring/pin-otp?limit=100
```
Returns password reset and OTP send logs

### Get Account Changes Monitoring
```
GET /api/admin/monitoring/account-changes?userId=123&limit=100
```
Returns user account modification history

### Get User Activity Log
```
GET /api/admin/monitoring/user-activity/:userId?limit=50
```
Returns detailed activity log for specific user

### Get Admin Audit Logs
```
GET /api/admin/audit-logs?page=1&limit=50&action=&user_id=&status=
```
**Query Parameters:**
- `action`: Filter by action type
- `user_id`: Filter by user ID
- `status`: Filter by status (SUCCESS, FAILURE)

### Get Dashboard Statistics
```
GET /api/admin/dashboard/stats
```
Returns overall system statistics

---

## Bulk Operations

### Bulk Deactivate Users
```
POST /api/admin/bulk/deactivate-users
```
**Required Permission:** manage_patients  
**Body:**
```json
{
  "filter": {
    "role": "PATIENT",
    "registration_before_date": "2023-01-01",
    "never_logged_in": true,
    "unverified_only": true
  },
  "reason": "Account cleanup - inactive for 6+ months"
}
```

### Bulk Assign Role
```
POST /api/admin/bulk/assign-role
```
**Body:**
```json
{
  "filter": {
    "current_role": "PATIENT",
    "exclude_role": "ADMIN"
  },
  "new_role": "DOCTOR",
  "reason": "Bulk promotion based on credentials"
}
```

### Bulk Reset Passwords
```
POST /api/admin/bulk/reset-passwords
```
**Body:**
```json
{
  "filter": {
    "role": "PATIENT",
    "locked_only": false
  },
  "new_password": "TemporaryPassword123!@#",
  "reason": "Security audit - force password reset",
  "notify_users": true
}
```

### Bulk Unlock Accounts
```
POST /api/admin/bulk/unlock-accounts
```
**Body:**
```json
{
  "reason": "Brute force attack resolved"
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "status_code": 400
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | No valid authentication token |
| FORBIDDEN | 403 | User lacks required permissions |
| NOT_FOUND | 404 | Resource not found |
| INVALID_INPUT | 400 | Invalid request parameters |
| WEAK_PASSWORD | 400 | Password doesn't meet requirements |
| INSUFFICIENT_ROLE_LEVEL | 403 | User role level insufficient |
| INSUFFICIENT_PERMISSIONS | 403 | Missing specific permissions |

---

## Rate Limiting

Rate limits are enforced per user ID and per IP address:

- **Normal endpoints**: 100 requests/minute per user
- **Sensitive endpoints** (password reset, user deletion, lock/unlock): 10 requests/minute per user
- **Global limit**: 500 requests/minute per IP

---

## Audit Logging

All admin actions are automatically logged to `admin_audit_log` table with:
- Admin user ID
- Action type and category
- Target entity and ID
- Before/after values
- IP address and user agent
- Success/failure status
- Error message (if failed)

---

## 2FA Requirements for Admins

2FA is mandatory for all ADMIN role users. When logging in:

1. Get initial JWT token with 2FA requirement flag
2. Request 2FA token from authenticator app (TOTP)
3. Include `X-2FA-Token` header in subsequent requests

---

## Permission Matrix

| Endpoint | SUPER_ADMIN | HOSPITAL_MANAGER | CREDENTIAL_MANAGER | SUPPORT_STAFF |
|----------|-------------|------------------|--------------------|---------------|
| Manage Patients | ✓ | ✓ | ✗ | ✗ |
| Manage Doctors | ✓ | ✓ | ✗ | ✗ |
| Manage Admins | ✓ | ✗ | ✗ | ✗ |
| Reset Credentials | ✓ | ✓ | ✓ | ✗ |
| View Audit Logs | ✓ | ✓ | ✓ | ✗ |
| Generate Reports | ✓ | ✓ | ✗ | ✗ |
| Export Data | ✓ | ✓ | ✗ | ✗ |
| Manage Roles | ✓ | ✗ | ✗ | ✗ |
| System Settings | ✓ | ✗ | ✗ | ✗ |

---

## Example: Complete Admin Setup Flow

1. Create SUPER_ADMIN user via direct database insert or initialization script
2. Promote existing users to admin roles:
   ```
   POST /api/admin/staff
   {
     "user_id": 5,
     "role_id": 2,
     "title": "Hospital Administrator"
   }
   ```
3. Verify admin in admin staff table has correct role_id
4. Admin logs in with 2FA token required
5. Admin can now access all admin endpoints based on role permissions
6. All admin actions are automatically audited

---

## Version

API Version: 2.0  
Last Updated: 2024  
Status: Production Ready
