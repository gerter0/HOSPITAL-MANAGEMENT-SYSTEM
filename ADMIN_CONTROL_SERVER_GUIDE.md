# Admin Control Server - Complete Documentation

## Overview

The **Admin Control Server** is a centralized management system for controlling patient and doctor accounts, managing credentials, and monitoring system-wide data. It provides administrators with tools to:

- View and manage all patient accounts
- Reset user passwords
- Control account status (activate/suspend/deactivate)
- Track credential changes with audit logs
- View comprehensive system statistics
- Manage user access and permissions

---

## System Architecture

### Database Schema

#### New Tables Added

1. **admin_roles**
   - Define role levels (Super Admin, Manager, Credential Manager, Support Staff)
   - Store permissions for each role
   - Control access levels

2. **admin_staff**
   - Admin user profiles
   - Role assignments
   - Department tracking
   - Last login tracking

3. **credential_audit_log**
   - Track all password resets
   - Log credential changes
   - Maintain compliance records
   - Record admin actions

4. **account_status_history**
   - Track account status changes
   - Record effective dates
   - Maintain suspension/reactivation history
   - Compliance tracking

5. **credential_management**
   - Store password reset tokens
   - Manage temporary credentials
   - Track reset usage
   - Expiration management

6. **admin_audit_log**
   - Comprehensive audit trail
   - All admin actions logged
   - IP address and user agent tracked
   - Success/failure status

7. **admin_dashboard_stats**
   - Cached statistics for performance
   - Daily statistics tracking
   - System health metrics

8. **system_notifications**
   - Admin alerts and notifications
   - Alert management
   - Notification tracking

#### Default Admin Roles

```
1. SUPER_ADMIN (Level 1)
   - Full system access
   - Can manage all users (patients, doctors, admins)
   - Can reset credentials and suspend accounts
   - Can manage roles and system settings
   - Can export data and generate reports

2. HOSPITAL_MANAGER (Level 2)
   - Can manage patients and doctors
   - Can reset credentials and suspend accounts
   - Can view audit logs
   - Can generate reports
   - Cannot manage admin staff

3. CREDENTIAL_MANAGER (Level 3)
   - Specializes in password resets
   - Can only reset credentials
   - Can view audit logs for credential changes
   - Limited to credential management

4. SUPPORT_STAFF (Level 4)
   - Can view user data
   - Minimal permissions
   - Primary role is data access
```

---

## API Endpoints

### Base URL
```
http://localhost:5001/api/v1/admin
```

### Authentication
All endpoints require:
- `Authorization: Bearer <JWT_TOKEN>`
- `User role: ADMIN`

---

## Patient Management Endpoints

### 1. Get All Patients (Paginated & Searchable)
```
GET /admin/patients
Query Parameters:
  - page: Integer (default: 1)
  - limit: Integer (default: 10)
  - search: String (email, username, first_name, last_name)
  - status: String (all, active, inactive, unverified)

Response:
{
  "success": true,
  "data": {
    "patients": [
      {
        "user_id": 1,
        "email": "patient@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1-555-0100",
        "is_active": true,
        "is_verified": true,
        "created_at": "2026-04-12T10:00:00Z",
        "last_login": "2026-04-12T15:30:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "pages": 10
    }
  }
}
```

### 2. Get Patient Details
```
GET /admin/patients/:userId

Response:
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "patient@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1-555-0100",
    "is_active": true,
    "is_verified": true,
    "created_at": "2026-04-12T10:00:00Z",
    "last_login": "2026-04-12T15:30:00Z",
    // Patient-specific fields...
    "patient_id": 5,
    "date_of_birth": "1990-01-15",
    "gender": "MALE",
    "blood_group": "O+",
    "address": "123 Main Street",
    "city": "New York",
    "country": "United States"
  }
}
```

### 3. Reset Patient Password
```
POST /admin/patients/:userId/reset-password

Body:
{
  "newPassword": "NewSecurePassword123!",
  "reason": "User forgot password - password reset requested"
}

Response:
{
  "success": true,
  "message": "Patient password has been reset",
  "data": {
    "message": "Password reset successfully"
  }
}
```

### 4. Change Patient Account Status
```
POST /admin/patients/:userId/status

Body:
{
  "status": "SUSPENDED",  // ACTIVE, SUSPENDED, DEACTIVATED, LOCKED
  "reason": "Suspicious login activity detected"
}

Response:
{
  "success": true,
  "message": "Patient status updated successfully",
  "data": {
    "status": "SUSPENDED",
    "message": "Patient account has been suspended"
  }
}
```

### 5. Get Credential Audit Log
```
GET /admin/patients/:userId/credential-audit
Query Parameters:
  - page: Integer (default: 1)
  - limit: Integer (default: 20)

Response:
{
  "success": true,
  "data": {
    "logs": [
      {
        "audit_id": 1,
        "target_user_id": 1,
        "admin_user_id": 2,
        "action": "PASSWORD_RESET",
        "action_type": "PASSWORD_RESET",
        "reason": "User requested password reset",
        "timestamp": "2026-04-12T14:30:00Z",
        "status": "SUCCESS"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

---

## Dashboard & Statistics Endpoints

### Get Dashboard Statistics
```
GET /admin/dashboard/stats

Response:
{
  "success": true,
  "data": {
    "total_patients": 150,
    "active_patients": 145,
    "total_doctors": 25,
    "active_doctors": 24,
    "scheduled_appointments": 48,
    "completed_appointments": 1250,
    "new_patients_today": 5,
    "suspended_accounts": 2
  }
}
```

---

## Frontend Admin Control Panel

### Location
```
/frontend/src/pages/AdminControlPanel.jsx
/frontend/src/pages/AdminControlPanel.css
```

### Features

#### Dashboard Tab
- Real-time system statistics
- Total patients and doctors count
- Active users count
- Appointment metrics
- New registrations today
- Suspended accounts count

#### Patient Management Tab
- Search patients by email, username, or name
- Filter by account status (active, inactive, unverified)
- View detailed patient information
- Multi-action buttons for each patient:
  - **View Details**: See complete patient profile
  - **Reset Password**: Generate new password
  - **Change Status**: Suspend/activate account
- Pagination controls
- Responsive design

#### Modal Actions
- **View Details Modal**: Complete patient information
- **Reset Password Modal**: Confirm password reset with reason
- **Change Status Modal**: Confirm account status change

---

## Setup Instructions

### Step 1: Apply Database Schema
```bash
cd backend
mysql -u root < ../database/admin-schema.sql
```

This will create:
- 8 new tables for admin system
- 4 default admin roles
- Indexes for performance

### Step 2: Create Super Admin Account
```bash
# Create a new admin user in the database
INSERT INTO users (email, username, password_hash, first_name, last_name, phone_number, role, is_active, is_verified)
VALUES (
  'admin@hospital.com',
  'super_admin',
  '[HASHED_PASSWORD]',  # Use bcrypt hash
  'System',
  'Administrator',
  '+1-555-9999',
  'ADMIN',
  TRUE,
  TRUE
);

# Assign role
INSERT INTO admin_staff (user_id, role_id, title)
SELECT user_id, 1, 'System Administrator'
FROM users WHERE email = 'admin@hospital.com';
```

### Step 3: Verify Backend Endpoints
```bash
# Start backend
cd backend
npm start

# Test endpoint
curl -X GET http://localhost:5001/api/v1/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Access Admin Dashboard
```
Application URL: http://localhost:3001/admin
(or http://localhost:5173/admin if using dev server)
```

---

## Usage Guide

### For Super Admin

1. **Access Control Panel**
   - Navigate to http://localhost:5173/admin
   - Login with admin credentials
   - View dashboard and patient management

2. **Manage Patient Credentials**
   - Go to "Patient Management" tab
   - Search for patient by email or name
   - Click "View Details" to see full profile
   - Click "Reset Password" to set new password

3. **Control Account Status**
   - Select patient from list
   - Click "Change Status" button
   - Choose: Active, Suspended, Deactivated, Locked
   - Provide reason for status change
   - Confirm action

4. **View Statistics**
   - Dashboard tab shows real-time system stats
   - View patient count, doctor count, appointments
   - Monitor system health

### For Credential Manager

1. **Access Credential Reset Function**
   - Login with credential manager role
   - Navigate to Patient Management
   - Only "Reset Password" action available

2. **Reset Passwords**
   - Search for user
   - Click "Reset Password" button
   - Enter new password and reason
   - System logs the action for audit

### For Hospital Manager

1. **Full Patient Management**
   - Can view, manage, and reset credentials
   - Can suspend or activate accounts
   - Can generate reports
   - Cannot manage other admin staff

---

## Security Features

### 1. Role-Based Access Control (RBAC)
- Multiple role levels
- Granular permissions
- Least privilege principle

### 2. Credential Audit Logging
```
Every credential change is logged with:
- Target user ID
- Admin user who made change
- Action type (password reset, email change, etc)
- Timestamp
- Reason for change
- Success/failure status
```

### 3. Account Status History
```
Tracks all account status changes:
- Previous status
- New status
- Effective date
- Reactivation date (if applicable)
- Reason for change
```

### 4. Admin Audit Log
```
Complete audit trail of admin actions:
- Admin user ID
- Action performed
- Target entity
- IP address
- User agent
- Success/failure
- Error details if failed
```

### 5. JWT Authentication
- All endpoints require valid JWT token
- Token must have ADMIN role
- Session validation on every request

---

## Integration with Existing System

### Database Integration
- Uses same `hospital_management_system` database
- New tables for admin functionality
- No modifications to existing tables

### User Table Integration
```
users table now supports:
- role = 'ADMIN' (in addition to PATIENT, DOCTOR)
- is_active flag to control access
- is_verified for security
- failed_login_attempts tracking
- locked_until timestamp
```

### Patient Data Access
```
Admins can access:
- Basic user info (email, name, phone)
- Account status
- Verification status
- Verification date
- Last login timestamp
- Registration date
```

---

## Audit Log Examples

### Example 1: Password Reset
```json
{
  "audit_id": 1,
  "target_user_id": 5,
  "admin_user_id": 2,
  "action": "ADMIN_RESET_PATIENT_PASSWORD",
  "action_category": "CREDENTIAL_MANAGEMENT",
  "action_type": "PASSWORD_RESET",
  "reason": "Patient requested password reset",
  "status": "SUCCESS",
  "timestamp": "2026-04-12T14:30:00Z"
}
```

### Example 2: Account Suspension
```json
{
  "audit_id": 2,
  "target_user_id": 8,
  "admin_user_id": 2,
  "action": "ADMIN_CHANGE_PATIENT_STATUS",
  "action_category": "ACCOUNT_STATUS",
  "new_status": "SUSPENDED",
  "reason": "Suspicious activity detected",
  "status": "SUCCESS",
  "timestamp": "2026-04-12T15:45:00Z"
}
```

---

## Future Enhancements

1. **Doctor Management** (To be implemented)
   - Doctor account creation
   - License verification
   - Specialization management
   - Doctor data reset

2. **Advanced Reporting**
   - User activity reports
   - Credential change reports
   - Account status change reports
   - Audit log exports

3. **Bulk Operations**
   - Bulk password resets
   - Bulk status changes
   - Bulk user imports

4. **Custom Notifications**
   - Alert rules setup
   - Email notifications
   - SMS alerts
   - Dashboard notifications

5. **Admin Role Management**
   - Dynamic role creation
   - Custom permission assignment
   - Role hierarchy management

---

## Troubleshooting

### Issue: "Cannot access admin dashboard"
**Solution:**
1. Verify user has ADMIN role in database
2. Check JWT token validity
3. Ensure admin record exists in admin_staff table

### Issue: "Password reset fails"
**Solution:**
1. Check backend error logs
2. Verify database connection
3. Ensure password meets requirements (8+ chars)

### Issue: "Status change not reflected"
**Solution:**
1. Refresh page after status change
2. Check database for record
3. Verify admin has permission

### Issue: "Audit logs not appearing"
**Solution:**
1. Check credential_audit_log table
2. Verify logging is enabled
3. Check for database errors

---

## Configuration

### Backend Configuration
```
File: backend/src/routes/adminRoutes.js
- All routes use requireAuth middleware
- All routes require ADMIN role
- All actions are logged
```

### Frontend Configuration
```
File: frontend/src/pages/AdminControlPanel.jsx
- Base API URL from apiClient configuration
- Pagination default: 10 records per page
- Audit log default: 20 records per page
```

---

## Compliance

### HIPAA Compliance
- All patient data access logged
- Audit trail maintained
- Role-based access control
- Encryption of sensitive data (in production)

### Data Protection
- Password hashes (bcrypt)
- Secure token transmission
- HTTPS only (production)
- Audit logs retention

---

## Support Contact

For issues or questions about the Admin Control Server, please refer to:
- Backend logs: `backend/logs/`
- Database audit tables: `credential_audit_log`, `admin_audit_log`
- Frontend console: Browser Developer Tools

---

**Status**: ✅ Admin Control Server Fully Implemented
**Version**: 1.0.0
**Last Updated**: April 12, 2026

