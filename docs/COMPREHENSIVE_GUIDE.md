# Hospital Management System - Complete Documentation

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Database Design](#database-design)
4. [Security Implementation](#security-implementation)
5. [API Documentation](#api-documentation)
6. [Tech Stack](#tech-stack)
7. [Setup & Installation](#setup--installation)
8. [Best Practices](#best-practices)

---

## System Architecture

### Architecture Type: Monolithic (Scalable)

The system uses a monolithic architecture with clear separation of concerns, allowing future migration to microservices if needed.

**Components:**
- **Frontend**: React SPA (Single Page Application)
- **Backend**: Node.js/Express API Server
- **Database**: MySQL (Relational)
- **Authentication**: JWT-based with session management
- **Encryption**: AES-256-GCM for sensitive data

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│                    (React Frontend - Port 3000)              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               API Gateway & Security Layer                   │
│  ├─ CORS & HTTPS Enforcement                                │
│  ├─ Rate Limiting                                            │
│  ├─ Request Validation                                       │
│  └─ Security Headers                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            Express.js Backend Server (Port 5000)             │
│  ├─ Authentication Routes                                    │
│  ├─ Patient Routes                                           │
│  ├─ Doctor Routes                                            │
│  ├─ Admin Routes                                             │
│  └─ Audit & Logging                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         MySQL Database (Port 3306)                           │
│  ├─ User Management                                          │
│  ├─ Medical Records (Encrypted)                              │
│  ├─ Prescriptions (Encrypted)                                │
│  ├─ Audit Logs (HIPAA Compliance)                            │
│  └─ Session Management                                       │
└─────────────────────────────────────────────────────────────┘
```

### Scalability Features

- **Connection Pooling**: MySQL connection pool (10 connections)
- **Rate Limiting**: Request throttling (100 req/15min)
- **Session Management**: Redis-compatible session store (future)
- **Caching**: Query result caching for performance
- **Microservices Ready**: Clear module separation

---

## Authentication & Authorization

### Authentication Flow

```
1. User Login
   ├─ Validate email & password
   ├─ Verify account is active
   ├─ Check for account lockout
   ├─ Validate 2FA (if enabled)
   └─ Generate JWT Token

2. JWT Token Structure
   ├─ Header: { alg: "HS256", typ: "JWT" }
   ├─ Payload: { user_id, email, role, iat, exp }
   └─ Signature: HMAC-SHA256(secret)

3. Session Management
   ├─ Store token hash in database
   ├─ Track session expiry (7 days)
   ├─ Record IP & User-Agent
   └─ Enable multi-device tracking
```

### Role-Based Access Control (RBAC)

**Three Main Roles:**

| Role | Permissions | Capabilities |
|------|-------------|--------------|
| **PATIENT** | • View own profile<br/>• View own medical records<br/>• View prescriptions<br/>• Book appointments<br/>• View appointment history | 30 endpoints |
| **DOCTOR** | • View patient list<br/>• Add medical records<br/>• Write prescriptions<br/>• View appointments<br/>• Manage patient records | 25 endpoints |
| **ADMIN** | • All user management<br/>• System statistics<br/>• Audit logs<br/>• User deactivation<br/>• System configuration | 20 endpoints |

### Authentication Implementation

```javascript
// JWT Token Generation
const jwtToken = generateJWT({
  user_id: user.user_id,
  email: user.email,
  role: user.role,
});

// Token Verification
const decoded = verifyJWT(token);

// Session Validation
const session = await validateSession(tokenHash);
```

### Two-Factor Authentication (2FA)

- **Method**: TOTP (Time-based One-Time Password)
- **Library**: Speakeasy
- **Window**: 2-minute time window
- **Optional**: Can be enabled per user

---

## Database Design

### ER Diagram Description

```
USERS (Core)
├─── PATIENTS (1:1 relationship)
├─── DOCTORS (1:1 relationship)
└─── ADMINS (1:1 relationship)

DOCTORS ──┐
          ├──→ MEDICAL_RECORDS ←─── PATIENTS
          ├──→ PRESCRIPTIONS
          └──→ APPOINTMENTS ←─────── PATIENTS

MEDICAL_RECORDS ──→ APPOINTMENTS
                 ├─→ LAB_TESTS
                 └─→ AUDIT_LOG

DEPARTMENTS ──→ DOCTORS
```

### Key Tables & Schemas

#### 1. **USERS** (Core authentication)
- `user_id` (PK)
- `email` (UNIQUE)
- `password_hash` (bcrypt)
- `role` (ENUM: PATIENT, DOCTOR, ADMIN)
- `two_factor_enabled`, `two_factor_secret`
- `failed_login_attempts`, `locked_until`
- `verification_token`, `verification_token_expiry`

#### 2. **PATIENTS**
- `patient_id` (PK)
- `user_id` (FK, UNIQUE)
- `date_of_birth`
- `blood_group` (ENUM)
- `emergency_contact_name`, `emergency_contact_phone`
- `allergies`, `current_medications`
- `insurance_provider`, `insurance_policy_number`

#### 3. **DOCTORS**
- `doctor_id` (PK)
- `user_id` (FK, UNIQUE)
- `specialization`
- `license_number` (UNIQUE)
- `qualifications`, `years_of_experience`
- `consultation_fee`
- `is_available`

#### 4. **MEDICAL_RECORDS** (Encrypted)
- `record_id` (PK)
- `patient_id` (FK)
- `doctor_id` (FK)
- `diagnosis` (ENCRYPTED)
- `symptoms`, `examination_findings`
- `treatment_plan`, `test_recommendations`
- `record_type` (ENUM)
- `is_encrypted` (Boolean)

#### 5. **PRESCRIPTIONS** (Encrypted)
- `prescription_id` (PK)
- `patient_id` (FK)
- `doctor_id` (FK)
- `medication_name`, `dosage`
- `frequency`, `duration_days`
- `start_date`, `end_date`
- `is_active`, `is_encrypted`

#### 6. **AUDIT_LOG** (HIPAA Compliance)
- `log_id` (PK)
- `user_id` (FK)
- `action` (What was done)
- `entity_type`, `entity_id` (What was affected)
- `old_values`, `new_values` (JSON)
- `ip_address`, `user_agent`
- `status`, `error_message`
- `timestamp`

#### 7. **LOGIN_SESSIONS**
- `session_id` (PK)
- `user_id` (FK)
- `token_hash` (SHA-256)
- `ip_address`, `user_agent`
- `expires_at`
- `is_active`

### Indexing Strategy

- **User lookups**: `idx_email`, `idx_role`
- **Record lookups**: `idx_patient_records`, `idx_doctor_records`
- **Date filtering**: `idx_appointment_date`, `idx_created_at`
- **Audit trails**: `idx_user_audit`, `idx_timestamp`

---

## Security Implementation

### 1. Authentication Security

**Password Hashing:**
- Algorithm: bcrypt
- Rounds: 12 (configurable)
- Salt: Automatically generated
- Never store plaintext passwords

**Account Lockout:**
- Max failed attempts: 5
- Lockout duration: 15 minutes
- Automatic unlock after duration

### 2. Data Encryption

**Medical Records & Prescriptions:**
```javascript
// Encryption Algorithm: AES-256-GCM
{
  iv: "random-16-bytes",
  encryptedData: "ciphertext",
  authTag: "authentication-tag"
}
```

**Key Management:**
- 32-character encryption key from environment
- Unique IV per encryption
- Authentication tag for integrity verification

### 3. SQL Injection Prevention

**Parameterized Queries:**
```javascript
// SAFE - Using parameters
const query = 'SELECT * FROM users WHERE email = ? AND role = ?';
const results = await executeQuery(query, [email, role]);

// UNSAFE - DO NOT USE
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

### 4. API Security

**HTTPS Enforcement:**
```javascript
// Redirect all HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production' && !isHTTPS) {
  res.redirect(301, `https://${host}${url}`);
}
```

**Security Headers:**
```
X-Content-Type-Options: nosniff        // Prevent MIME sniffing
X-Frame-Options: DENY                  // Prevent clickjacking
X-XSS-Protection: 1; mode=block        // XSS protection
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Rate Limiting:**
- General API: 100 requests/15 minutes
- Login: 5 attempts/15 minutes
- Password Reset: 3 attempts/hour
- Sensitive Operations: 10 requests/5 minutes

### 5. CORS Configuration

```javascript
corsOptions = {
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
  optionsSuccessStatus: 200
}
```

### 6. Input Validation

- Email: RFC 5322 compliant regex
- Password: Minimum 8 characters with:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*)
- All inputs: Length limits (max 255 chars)
- Sanitization: Remove dangerous characters

### 7. Audit Logging (HIPAA Compliance)

**Logged Actions:**
- User login/logout
- Profile updates
- Medical record access
- Prescription creation
- User deactivation
- System changes

**Audit Log Contents:**
```json
{
  "user_id": 123,
  "action": "VIEW_MEDICAL_RECORDS",
  "entity_type": "MEDICAL_RECORD",
  "entity_id": 456,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "SUCCESS"
}
```

---

## API Documentation

### Base URL
```
Production: https://api.hospital.com/api/v1
Development: http://localhost:5000/api/v1
```

### Common Headers
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-Request-ID: {unique-request-id}
X-2FA-Token: {2fa-token} (if 2FA enabled)
```

### Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "statusCode": 200,
  "data": { /* response data */ },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Authentication Endpoints

#### 1. Register User
```
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "patient@email.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "1234567890",
  "role": "PATIENT"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "patient@email.com",
    "role": "PATIENT",
    "message": "Registration successful. Please verify your email."
  }
}
```

#### 2. Login
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "patient@email.com",
  "password": "SecurePass123!",
  "twoFactorToken": "123456" (optional)
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 1,
      "email": "patient@email.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "PATIENT"
    }
  }
}
```

#### 3. Logout
```
POST /auth/logout
Authorization: Bearer {token}

Response: 200 OK
```

### Patient Endpoints

#### 1. Get Patient Profile
```
GET /patients/{patientId}/profile
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "patient_id": 1,
    "date_of_birth": "1990-01-15",
    "gender": "MALE",
    "blood_group": "O+",
    "emergency_contact_name": "Jane Doe",
    "emergency_contact_phone": "9876543210",
    "allergies": "Penicillin",
    "email": "patient@email.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

#### 2. Update Patient Profile
```
PUT /patients/{patientId}/profile
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "date_of_birth": "1990-01-15",
  "gender": "MALE",
  "blood_group": "O+",
  "allergies": "Penicillin"
}

Response: 200 OK
```

#### 3. Get Medical Records
```
GET /patients/{patientId}/medical-records?page=1&limit=20
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "data": [{
      "record_id": 1,
      "diagnosis": { /* decrypted */ },
      "symptoms": "...",
      "treatment_plan": "...",
      "record_type": "GENERAL",
      "created_at": "2024-01-15T10:30:00Z"
    }],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

#### 4. Book Appointment
```
POST /patients/{patientId}/appointments
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "doctor_id": 5,
  "appointment_date": "2024-02-15T14:00:00Z",
  "reason_for_visit": "Regular checkup",
  "notes": "Have blood pressure concerns"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "appointment_id": 42
  }
}
```

### Doctor Endpoints

#### 1. Get Doctor Profile
```
GET /doctors/{doctorId}/profile
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "doctor_id": 5,
    "specialization": "Cardiology",
    "license_number": "LIC123456",
    "years_of_experience": 10,
    "consultation_fee": 150.00,
    "is_available": true
  }
}
```

#### 2. Add Medical Record
```
POST /doctors/{doctorId}/patients/{patientId}/medical-records
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "diagnosis": "Hypertension",
  "symptoms": "High blood pressure readings",
  "examination_findings": "BP: 160/100 mmHg",
  "treatment_plan": "Start medication and lifestyle changes",
  "record_type": "DIAGNOSIS"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "record_id": 12
  }
}
```

#### 3. Write Prescription
```
POST /doctors/{doctorId}/patients/{patientId}/prescriptions
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "medication_name": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "duration_days": 30,
  "instructions": "Take in the morning with food",
  "start_date": "2024-01-15"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "prescription_id": 23
  }
}
```

### Admin Endpoints

#### 1. Get All Users
```
GET /admin/users?role=PATIENT&page=1&limit=20
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "data": [{
      "user_id": 1,
      "email": "patient@email.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "PATIENT",
      "is_active": true,
      "created_at": "2024-01-01"
    }],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156
    }
  }
}
```

#### 2. Get System Statistics
```
GET /admin/statistics
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "totalUsers": 156,
    "totalPatients": 120,
    "totalDoctors": 32,
    "totalAppointments": 542,
    "activeAppointments": 45,
    "pendingAppointments": 8
  }
}
```

#### 3. Get Audit Logs
```
GET /admin/audit-logs?action=LOGIN_SUCCESS&page=1&limit=50
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "data": [{
      "log_id": 1,
      "user_id": 1,
      "action": "LOGIN_SUCCESS",
      "entity_type": "USER",
      "ip_address": "192.168.1.1",
      "status": "SUCCESS",
      "timestamp": "2024-01-15T10:30:00Z"
    }],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5000
    }
  }
}
```

---

## Tech Stack

### Frontend
- **Framework**: React 18.2
- **Router**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: React Icons

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js 4.18
- **Database Driver**: mysql2 (with promises)
- **Password Hashing**: bcrypt
- **JWT**: jsonwebtoken
- **Validation**: Joi
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet
- **Environment**: dotenv

### Database
- **DBMS**: MySQL 8.0+
- **Connection Pool**: mysql2 connection pooling
- **Max Connections**: 10 (configurable)
- **Character Set**: utf8mb4

### DevOps & Tools
- **Development**: Nodemon
- **Task Runner**: npm scripts
- **Version Control**: Git
- **Package Manager**: npm

---

## Setup & Installation

### Prerequisites
- Node.js 16+ and npm 8+
- MySQL 8.0+
- Git

### Database Setup

1. **Create database and user:**
```bash
mysql -u root -p

CREATE DATABASE hospital_management_system;

CREATE USER 'hospital_app'@'localhost' IDENTIFIED BY 'secure_password_change_this';
GRANT SELECT, INSERT, UPDATE, DELETE ON hospital_management_system.* TO 'hospital_app'@'localhost';

FLUSH PRIVILEGES;
```

2. **Run schema:**
```bash
mysql -u hospital_app -p hospital_management_system < database/schema.sql
```

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start backend:**
```bash
npm run dev
```

Backend runs on `http://localhost:5000`

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Create .env.local:**
```bash
VITE_API_URL=http://localhost:5000/api/v1
```

3. **Start frontend:**
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## Best Practices

### Security Best Practices

1. **Never commit `.env` files** - use `.env.example` instead
2. **Rotate JWT secrets** regularly in production
3. **Use HTTPS only** in production (enforce with middleware)
4. **Implement WAF** (Web Application Firewall) for production
5. **Regular security audits** and penetration testing
6. **Keep dependencies updated** - run `npm audit fix`
7. **Use VPN** for database access
8. **Enable 2FA** for admin accounts
9. **Regular backups** of encryption keys and database
10. **Monitor audit logs** for suspicious activities

### Code Best Practices

1. **Error Handling**: Always catch errors, don't expose sensitive info
2. **Logging**: Log all critical operations for debugging
3. **Validation**: Validate all user inputs
4. **Comments**: Document complex logic
5. **Testing**: Write unit and integration tests
6. **DRY**: Don't repeat yourself
7. **SOLID**: Follow SOLID principles

### Performance Best Practices

1. **Database Indexing**: Index frequently queried columns
2. **Connection Pooling**: Reuse database connections
3. **Caching**: Cache frequent queries
4. **Pagination**: Limit query results with pagination
5. **Compression**: Use gzip for responses
6. **CDN**: Serve static files from CDN

### Deployment Best Practices

1. **Environment Variables**: Use .env for sensitive data
2. **Docker**: Containerize application
3. **Load Balancing**: Distribute traffic across servers
4. **Monitoring**: Monitor application health
5. **Logging**: Centralized logging (ELK stack)
6. **CI/CD**: Automated testing and deployment
7. **Database Backup**: Regular automated backups
8. **SSL Certificate**: Use valid SSL certificates

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Database connection failed | MySQL not running | Start MySQL service: `mysql.server start` |
| CORS error | Frontend origin not allowed | Add origin to CORS_ORIGINS in .env |
| 401 Unauthorized | Invalid/expired token | Re-login and get new token |
| 429 Too Many Requests | Rate limit exceeded | Wait and retry after cooldown |
| Invalid password hash | Bcrypt rounds mismatch | Ensure BCRYPT_ROUNDS is same for hashing |

---

## Future Enhancements

- [ ] Implement microservices architecture
- [ ] Add Redis for caching & sessions
- [ ] Implement ELK stack for logging
- [ ] Add Docker containerization
- [ ] Implement CI/CD pipeline
- [ ] Add automated testing suite
- [ ] Implement push notifications
- [ ] Add video consultation feature
- [ ] Implement payment gateway
- [ ] Mobile app (React Native)
- [ ] GraphQL API layer
- [ ] Machine learning for appointments

