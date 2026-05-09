-- ============================================
-- ADMIN CONTROL SERVER SCHEMA
-- ============================================
-- Add these tables to the hospital_management_system database
-- For managing patient & doctor accounts, credentials, and system control

-- 1. ADMIN_ROLES TABLE
-- Defines different admin role levels with permissions
CREATE TABLE IF NOT EXISTS admin_roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    role_level INT NOT NULL,
    description TEXT,
    permissions JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role_name (role_name),
    INDEX idx_role_level (role_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ADMIN_STAFF TABLE  
-- Admin/Staff accounts with role assignments
CREATE TABLE IF NOT EXISTS admin_staff (
    staff_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    role_id INT NOT NULL,
    title VARCHAR(100),
    department VARCHAR(100),
    phone_number VARCHAR(20),
    office_location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES admin_roles(role_id) ON DELETE RESTRICT,
    INDEX idx_staff_user (user_id),
    INDEX idx_staff_role (role_id),
    INDEX idx_staff_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CREDENTIAL_AUDIT_LOG TABLE
-- Track all credential changes and resets for compliance
CREATE TABLE IF NOT EXISTS credential_audit_log (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    target_user_id INT NOT NULL,
    admin_user_id INT,
    action VARCHAR(100) NOT NULL,
    action_type ENUM('PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_CHANGE', 'ACCOUNT_UNLOCK', 'USERNAME_CHANGE', 'STATUS_CHANGE') NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    reason TEXT,
    ip_address VARCHAR(45),
    status ENUM('SUCCESS', 'FAILURE') DEFAULT 'SUCCESS',
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_target_user (target_user_id),
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ACCOUNT_STATUS_HISTORY TABLE
-- Track account status changes (active, suspended, deactivated, etc.)
CREATE TABLE IF NOT EXISTS account_status_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    target_user_id INT NOT NULL,
    admin_user_id INT,
    previous_status VARCHAR(100),
    new_status ENUM('ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'LOCKED', 'PENDING_VERIFICATION') NOT NULL,
    reason TEXT,
    notes TEXT,
    effective_date DATETIME,
    reactivation_date DATETIME,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_target_user (target_user_id),
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_status (new_status),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CREDENTIAL_MANAGEMENT TABLE
-- Store credential reset links and temporary credentials
CREATE TABLE IF NOT EXISTS credential_management (
    cred_id INT PRIMARY KEY AUTO_INCREMENT,
    target_user_id INT NOT NULL,
    admin_user_id INT,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    reset_type ENUM('PASSWORD', 'EMAIL', 'USERNAME') NOT NULL,
    new_value_encrypted VARCHAR(500),
    is_used BOOLEAN DEFAULT FALSE,
    used_at DATETIME,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_target_user (target_user_id),
    INDEX idx_reset_token (reset_token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ADMIN_AUDIT_LOG TABLE
-- Comprehensive audit log for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    action_category ENUM('USER_MANAGEMENT', 'CREDENTIAL_MANAGEMENT', 'ACCOUNT_STATUS', 'ROLE_MANAGEMENT', 'SYSTEM_CONFIG', 'DATA_EXPORT', 'REPORT_GENERATION') NOT NULL,
    target_entity VARCHAR(100),
    target_entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    status ENUM('SUCCESS', 'FAILURE') DEFAULT 'SUCCESS',
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_action (action),
    INDEX idx_category (action_category),
    INDEX idx_timestamp (timestamp),
    INDEX idx_target (target_entity, target_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ADMIN_DASHBOARD_STATS TABLE
-- Cache frequently accessed admin dashboard statistics
CREATE TABLE IF NOT EXISTS admin_dashboard_stats (
    stat_id INT PRIMARY KEY AUTO_INCREMENT,
    stat_date DATE NOT NULL UNIQUE,
    total_patients INT DEFAULT 0,
    active_patients INT DEFAULT 0,
    total_doctors INT DEFAULT 0,
    active_doctors INT DEFAULT 0,
    total_appointments INT DEFAULT 0,
    completed_appointments INT DEFAULT 0,
    new_registrations_today INT DEFAULT 0,
    suspended_accounts INT DEFAULT 0,
    locked_accounts INT DEFAULT 0,
    total_admin_users INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. SYSTEM_NOTIFICATIONS TABLE
-- Admin notifications and alerts
CREATE TABLE IF NOT EXISTS system_notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT,
    notification_type ENUM('ALERT', 'WARNING', 'INFO', 'SUCCESS', 'ERROR') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_entity VARCHAR(100),
    target_entity_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_type (notification_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DEFAULT ADMIN ROLES SETUP
-- ============================================

-- Insert default admin roles
INSERT INTO admin_roles (role_name, role_level, description, permissions) VALUES
(
    'SUPER_ADMIN',
    1,
    'Full system access - Can manage all users and system settings',
    JSON_OBJECT(
        'manage_patients', true,
        'manage_doctors', true,
        'manage_admins', true,
        'reset_credentials', true,
        'suspend_accounts', true,
        'view_audit_logs', true,
        'generate_reports', true,
        'manage_roles', true,
        'system_settings', true,
        'export_data', true
    )
),
(
    'HOSPITAL_MANAGER',
    2,
    'Hospital management - Can manage patients and doctors, view reports',
    JSON_OBJECT(
        'manage_patients', true,
        'manage_doctors', true,
        'manage_admins', false,
        'reset_credentials', true,
        'suspend_accounts', true,
        'view_audit_logs', true,
        'generate_reports', true,
        'manage_roles', false,
        'system_settings', false,
        'export_data', true
    )
),
(
    'CREDENTIAL_MANAGER',
    3,
    'Credential management - Can reset passwords and manage account credentials',
    JSON_OBJECT(
        'manage_patients', false,
        'manage_doctors', false,
        'manage_admins', false,
        'reset_credentials', true,
        'suspend_accounts', false,
        'view_audit_logs', true,
        'generate_reports', false,
        'manage_roles', false,
        'system_settings', false,
        'export_data', false
    )
),
(
    'SUPPORT_STAFF',
    4,
    'Support staff - Can view user data and manage basic account issues',
    JSON_OBJECT(
        'manage_patients', false,
        'manage_doctors', false,
        'manage_admins', false,
        'reset_credentials', false,
        'suspend_accounts', false,
        'view_audit_logs', false,
        'generate_reports', false,
        'manage_roles', false,
        'system_settings', false,
        'export_data', false
    )
) ON DUPLICATE KEY UPDATE description=VALUES(description);

-- ============================================
-- VERIFICATION & TESTING QUERIES
-- ============================================

-- Verify tables were created
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'hospital_management_system' 
AND TABLE_NAME IN (
    'admin_roles',
    'admin_staff',
    'credential_audit_log',
    'account_status_history',
    'credential_management',
    'admin_audit_log',
    'admin_dashboard_stats',
    'system_notifications'
);

-- Verify admin roles were inserted
SELECT role_id, role_name, role_level, description FROM admin_roles;

