-- Admin Control Server Database Schema
-- Hospital Management System
-- Created: April 12, 2026
-- Purpose: Centralized admin management, credential control, and audit logging

-- ============================================
-- 1. Admin Roles Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_roles (
  role_id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  role_level INT NOT NULL DEFAULT 0,
  description TEXT,
  permissions JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role_level (role_level),
  INDEX idx_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Admin Staff Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_staff (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  role_id INT NOT NULL,
  title VARCHAR(100),
  department VARCHAR(100),
  phone_number VARCHAR(20),
  last_login TIMESTAMP,
  login_count INT DEFAULT 0,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES admin_roles(role_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role_id (role_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. Credential Audit Log
-- ============================================
CREATE TABLE IF NOT EXISTS credential_audit_log (
  audit_id INT PRIMARY KEY AUTO_INCREMENT,
  target_user_id INT NOT NULL,
  admin_user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_value VARCHAR(255),
  new_value_hash VARCHAR(255),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'SUCCESS',
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_user_id) REFERENCES users(user_id),
  INDEX idx_target_user (target_user_id),
  INDEX idx_admin_user (admin_user_id),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Account Status History
-- ============================================
CREATE TABLE IF NOT EXISTS account_status_history (
  status_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  admin_user_id INT,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reactivation_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_user_id) REFERENCES users(user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_new_status (new_status),
  INDEX idx_effective_date (effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Credential Management
-- ============================================
CREATE TABLE IF NOT EXISTS credential_management (
  credential_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  admin_user_id INT,
  reset_token VARCHAR(255) UNIQUE,
  new_credential_hash VARCHAR(255),
  credential_type VARCHAR(50) NOT NULL DEFAULT 'PASSWORD',
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_user_id) REFERENCES users(user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_reset_token (reset_token),
  INDEX idx_is_used (is_used),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. Admin Audit Log (Complete Action Log)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50),
  target_type VARCHAR(50),
  target_id INT,
  details JSON,
  status VARCHAR(20) DEFAULT 'SUCCESS',
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_user_id) REFERENCES users(user_id),
  INDEX idx_admin_user (admin_user_id),
  INDEX idx_action (action),
  INDEX idx_action_category (action_category),
  INDEX idx_target_id (target_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. Admin Dashboard Stats (Cache)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_dashboard_stats (
  stat_id INT PRIMARY KEY AUTO_INCREMENT,
  total_patients INT DEFAULT 0,
  active_patients INT DEFAULT 0,
  total_doctors INT DEFAULT 0,
  active_doctors INT DEFAULT 0,
  scheduled_appointments INT DEFAULT 0,
  completed_appointments INT DEFAULT 0,
  new_patients_today INT DEFAULT 0,
  suspended_accounts INT DEFAULT 0,
  new_registrations_this_month INT DEFAULT 0,
  system_health VARCHAR(50) DEFAULT 'NORMAL',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_last_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. System Notifications
-- ============================================
CREATE TABLE IF NOT EXISTS system_notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id INT,
  notification_type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  priority VARCHAR(20) DEFAULT 'NORMAL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_admin_user (admin_user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_priority (priority),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT ADMIN ROLES
-- ============================================

INSERT INTO admin_roles (role_name, role_level, description, permissions) VALUES
(
  'SUPER_ADMIN',
  1,
  'Full system access. Can manage all users and system settings.',
  JSON_OBJECT(
    'manage_patients', TRUE,
    'manage_doctors', TRUE,
    'manage_admins', TRUE,
    'reset_credentials', TRUE,
    'suspend_accounts', TRUE,
    'view_audit_logs', TRUE,
    'export_data', TRUE,
    'manage_roles', TRUE,
    'system_settings', TRUE,
    'generate_reports', TRUE
  )
),
(
  'HOSPITAL_MANAGER',
  2,
  'Can manage patients and doctors, reset credentials, and suspend accounts.',
  JSON_OBJECT(
    'manage_patients', TRUE,
    'manage_doctors', TRUE,
    'manage_admins', FALSE,
    'reset_credentials', TRUE,
    'suspend_accounts', TRUE,
    'view_audit_logs', TRUE,
    'export_data', TRUE,
    'manage_roles', FALSE,
    'system_settings', FALSE,
    'generate_reports', TRUE
  )
),
(
  'CREDENTIAL_MANAGER',
  3,
  'Specialized in password resets and credential management.',
  JSON_OBJECT(
    'manage_patients', FALSE,
    'manage_doctors', FALSE,
    'manage_admins', FALSE,
    'reset_credentials', TRUE,
    'suspend_accounts', FALSE,
    'view_audit_logs', TRUE,
    'export_data', FALSE,
    'manage_roles', FALSE,
    'system_settings', FALSE,
    'generate_reports', FALSE
  )
),
(
  'SUPPORT_STAFF',
  4,
  'Limited access for support and data viewing only.',
  JSON_OBJECT(
    'manage_patients', FALSE,
    'manage_doctors', FALSE,
    'manage_admins', FALSE,
    'reset_credentials', FALSE,
    'suspend_accounts', FALSE,
    'view_audit_logs', FALSE,
    'export_data', FALSE,
    'manage_roles', FALSE,
    'system_settings', FALSE,
    'generate_reports', FALSE
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all tables created
SELECT 'Tables Created Successfully' as Status;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN (
  'admin_roles',
  'admin_staff',
  'credential_audit_log',
  'account_status_history',
  'credential_management',
  'admin_audit_log',
  'admin_dashboard_stats',
  'system_notifications'
) ORDER BY TABLE_NAME;

-- Verify admin roles inserted
SELECT 'Admin Roles:' as Type;
SELECT role_id, role_name, role_level, description FROM admin_roles ORDER BY role_level;

-- Show schema summary
SELECT 'Schema Applied Successfully!' as Message;
