-- ============================================
-- ADMIN SYSTEM ENHANCEMENTS
-- Additional tables for new features
-- ============================================

-- 1. SYSTEM_ALERTS TABLE
-- Store system alerts and warnings
CREATE TABLE IF NOT EXISTS system_alerts (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    alert_type VARCHAR(100) NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    details JSON,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at DATETIME,
    acknowledged_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (acknowledged_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_is_acknowledged (is_acknowledged),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ADMIN_SESSIONS TABLE
-- Track admin login sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT NOT NULL,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info VARCHAR(255),
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    logout_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_is_active (is_active),
    INDEX idx_login_at (login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ADMIN_AUDIT_LOG TABLE (if not exists from admin-schema.sql)
-- Comprehensive audit log for all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    action_category ENUM(
        'USER_MANAGEMENT',
        'CREDENTIAL_MANAGEMENT',
        'ACCOUNT_STATUS',
        'ROLE_MANAGEMENT',
        'SYSTEM_CONFIG',
        'DATA_EXPORT',
        'REPORT_GENERATION',
        'BULK_OPERATION'
    ) NOT NULL,
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
    INDEX idx_target (target_entity, target_entity_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. APPROVAL_REQUESTS TABLE
-- Track approval workflows for sensitive operations
CREATE TABLE IF NOT EXISTS approval_requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    requester_id INT NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100),
    target_entity_id INT,
    operation_details JSON NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
    required_approvals INT DEFAULT 1,
    approvals_received INT DEFAULT 0,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decision_at DATETIME,
    decided_by INT,
    expires_at DATETIME,
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (decided_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_operation_type (operation_type),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. APPROVAL_HISTORY TABLE
-- Track individual approvals
CREATE TABLE IF NOT EXISTS approval_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    approver_id INT NOT NULL,
    decision ENUM('APPROVED', 'REJECTED') NOT NULL,
    reason TEXT,
    decision_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES approval_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_request_id (request_id),
    INDEX idx_approver_id (approver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. CONFIRMATION_TOKENS TABLE
-- Temporary tokens for sensitive operations
CREATE TABLE IF NOT EXISTS confirmation_tokens (
    token_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    operation_details JSON,
    is_used BOOLEAN DEFAULT FALSE,
    used_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_is_used (is_used),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. EXPORT_JOBS TABLE
-- Track data export jobs
CREATE TABLE IF NOT EXISTS export_jobs (
    job_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT NOT NULL,
    export_type VARCHAR(100) NOT NULL,
    format ENUM('CSV', 'JSON', 'PDF') NOT NULL,
    filters JSON,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    file_path VARCHAR(500),
    file_size_bytes INT,
    total_records INT,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BULK_OPERATION_JOBS TABLE
-- Track bulk operations (deactivate, reset, etc.)
CREATE TABLE IF NOT EXISTS bulk_operation_jobs (
    job_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    filters JSON NOT NULL,
    parameters JSON,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    total_affected INT,
    processed_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    error_message TEXT,
    reason TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_operation_type (operation_type),
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. ADD force_password_change COLUMN to users table (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at DATETIME;
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_force_password_change (force_password_change);

-- ============================================
-- ENSURE ADMIN ROLES TABLE EXISTS
-- ============================================

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
    INDEX idx_role_level (role_level),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ENSURE ADMIN_STAFF TABLE EXISTS
-- ============================================

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

-- ============================================
-- DEFAULT ADMIN ROLES (UPSERT)
-- ============================================

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
)
ON DUPLICATE KEY UPDATE description=VALUES(description), permissions=VALUES(permissions);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all tables were created
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'hospital_management_system'
AND TABLE_NAME IN (
    'system_alerts',
    'admin_sessions',
    'admin_audit_log',
    'approval_requests',
    'approval_history',
    'confirmation_tokens',
    'export_jobs',
    'bulk_operation_jobs',
    'admin_roles',
    'admin_staff'
);

-- Verify default roles exist
SELECT role_id, role_name, role_level FROM admin_roles ORDER BY role_level;
