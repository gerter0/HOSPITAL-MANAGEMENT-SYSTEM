# Hospital Management System - Architecture & Design Document

## System Overview

This document provides a detailed architectural overview of the Hospital Management System, including design patterns, security layers, and scalability considerations.

---

## 1. High-Level Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                   (React Frontend)                           │
│  ├─ User Interface Components                               │
│  ├─ Client-side Routing                                     │
│  └─ State Management (Zustand)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway Layer                           │
│  ├─ CORS Middleware                                         │
│  ├─ Request Validation                                      │
│  ├─ Rate Limiting                                           │
│  └─ Security Headers                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
│  ├─ Controllers                                             │
│  ├─ Services                                                │
│  ├─ Validators                                              │
│  └─ Authentication/Authorization                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                          │
│  ├─ Database Queries                                        │
│  ├─ Connection Pooling                                      │
│  ├─ Transaction Management                                  │
│  └─ Encryption/Decryption                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                              │
│                   (MySQL)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Security Architecture

### Defense-in-Depth Strategy

```
Layer 1: Network Security
├─ HTTPS/TLS Encryption
├─ Firewall Rules
└─ DDoS Protection

Layer 2: Application Security
├─ CORS & CSP Headers
├─ Rate Limiting
├─ Input Validation
└─ Helmet.js Security Headers

Layer 3: Authentication & Authorization
├─ JWT Token Verification
├─ RBAC (Role-Based Access Control)
├─ 2FA (Two-Factor Authentication)
└─ Session Management

Layer 4: Data Security
├─ AES-256-GCM Encryption (for medical records)
├─ bcrypt Password Hashing (12 rounds)
├─ Parameterized SQL Queries
└─ Encrypted Connections

Layer 5: Audit & Compliance
├─ HIPAA Audit Logging
├─ Access Tracking
├─ Change Logging
└─ Incident Reporting
```

### Authentication Flow Diagram

```
┌─────────────────┐
│  User Login     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Validate Email & Password       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Check Account Status            │
│ ├─ is_active = true             │
│ └─ is_verified = true           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Check Account Lockout           │
│ (Failed attempts tracking)       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Verify 2FA (if enabled)         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Generate JWT Token              │
│ Create Login Session            │
│ Record Access Log               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Return Token    │
└─────────────────┘
```

### Authorization Model

```
Request ──→ AuthMiddleware ──→ Verify JWT ──→ Check Role
              │                    │              │
              └─ Invalid Token     │         ┌────┴────┐
                 (401)             │         │          │
                                   │         ▼          ▼
                              Valid Token   Allowed    Forbidden
                                   │       Role(s)     Role(s)
                                   │         │          │
                                   └─────────┼──────────┘
                                           Grant
                                         Access
```

---

## 3. Database Design

### Normalization Strategy

**Normal Form: 3NF (Third Normal Form)**

Benefits:
- Eliminates data redundancy
- Improves data integrity
- Enables efficient indexing
- Reduces storage requirements

### Relationship Diagram

```
┌──────────────┐
│    USERS     │ (Core authentication)
└──────┬───────┘
       │
       ├──────────────┬───────────────┬──────────────┐
       ▼              ▼               ▼              ▼
   ┌────────┐   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │PATIENTS │  │ DOCTORS │   │ ADMINS   │   │DEPARTMENTS
   └────┬───┘   └─────┬───┘   └──────────┘   └──────────┘
        │              │
        ▼              ▼
   ┌─────────────────────────────────┐
   │   APPOINTMENTS                  │
   │   ├─ COMPLETED → MEDICAL_RECORDS
   │   └─ ASSOCIATED → PRESCRIPTIONS
   └─────────────────────────────────┘
        │              │
        ▼              ▼
   ┌──────────────┐ ┌──────────────┐
   │MEDICAL_      │ │PRESCRIPTIONS │
   │RECORDS       │ │              │
   └──────────────┘ └──────────────┘
        │              │
        └──────────────┴──────────────┐
                                      ▼
                                ┌──────────────┐
                                │ AUDIT_LOG    │
                                │ (All actions)│
                                └──────────────┘
```

---

## 4. API Design Pattern

### RESTful Endpoint Structure

```
/api/v1
├── /auth
│   ├── POST   /register        → Create account
│   ├── POST   /login           → Authenticate user
│   ├── POST   /logout          → End session
│   └── POST   /refresh-token   → Renew JWT
│
├── /patients
│   ├── GET    /{id}/profile    → View profile
│   ├── PUT    /{id}/profile    → Update profile
│   ├── GET    /{id}/medical-records  → View medical history
│   ├── GET    /{id}/prescriptions    → View medications
│   └── POST   /{id}/appointments     → Schedule appointment
│
├── /doctors
│   ├── GET    /{id}/profile    → View profile
│   ├── PUT    /{id}/profile    → Update profile
│   ├── GET    /{id}/patients   → View patient list
│   ├── POST   /{id}/patients/{p}/medical-records
│   ├── POST   /{id}/patients/{p}/prescriptions
│   └── GET    /{id}/appointments
│
└── /admin
    ├── GET    /users          → List users
    ├── PUT    /users/{id}/role → Change role
    ├── GET    /statistics     → System stats
    └── GET    /audit-logs     → Access logs
```

### HTTP Status Codes

```
200 OK                    → Request succeeded
201 Created               → Resource created
400 Bad Request          → Invalid input
401 Unauthorized         → Authentication required
403 Forbidden            → Access denied
404 Not Found            → Resource not found
409 Conflict             → Duplicate entry
429 Too Many Requests    → Rate limit exceeded
500 Internal Server Error → Server error
503 Service Unavailable  → Maintenance
```

---

## 5. Data Flow

### Patient Booking Appointment Flow

```
Frontend                Backend              Database
   │                      │                    │
   ├─ Book Appointment ──→│                    │
   │   {doctor_id,        │                    │
   │    date}             │                    │
   │                      ├─ Validate Input    │
   │                      │  ├─ Check doctor   │
   │                      │  │ exists          │
   │                      │  └─ Verify date    │
   │                      │     availability   │
   │                      │                    │
   │                      ├─ Check Conflict ──→│ Query appointments
   │                      │                    │ at same time/doctor
   │                      │←─ No conflicts ────│
   │                      │                    │
   │                      ├─ Create Record ───→│ INSERT appointment
   │                      │                    │
   │                      ├─ Log Action ──────→│ INSERT audit_log
   │                      │                    │
   │←─ Appointment ID ────┤                    │
   │  (Success)           │                    │
```

### Doctor Viewing Medical Records Flow

```
Frontend                Backend              Database
   │                      │                    │
   ├─ Request Records ────→│                    │
   │   {patient_id}        │                    │
   │                      ├─ Verify Auth      │
   │                      │  ├─ Check JWT     │
   │                      │  └─ Check Role    │
   │                      │                    │
   │                      ├─ Query Records ───→│ SELECT medical_records
   │                      │   for patient      │ WHERE patient_id = ?
   │                      │                    │
   │                      │←─ Encrypted data ──│
   │                      │                    │
   │                      ├─ Decrypt Records   │
   │                      │  ├─ Get IV         │
   │                      │  ├─ Get AuthTag    │
   │                      │  └─ Decrypt using  │
   │                      │     AES-256-GCM    │
   │                      │                    │
   │                      ├─ Log Access ─────→│ INSERT audit_log
   │                      │                    │
   │←─ Decrypted Records ──┤                    │
   │   (Success)           │                    │
```

---

## 6. Scalability Considerations

### Horizontal Scaling Strategy

```
┌─────────────────────────────────────────┐
│        Load Balancer (Nginx)            │
└──────────────┬──────────────┬───────────┘
               │              │
       ┌───────▼──┐      ┌──▼────────┐
       │ Backend 1 │      │ Backend 2 │
       │(Node.js)  │      │(Node.js)  │
       └───────┬───┘      └──┬────────┘
               │             │
               └────┬────────┘
                    ▼
           ┌────────────────────┐
           │  MySQL Database    │
           │  with Replication  │
           └────────────────────┘
```

### Caching Strategy

```
Layer 1: Query Result Cache (Redis)
├─ Cache frequently queried data
├─ TTL: 1 hour for non-sensitive data
└─ Invalidate on update

Layer 2: Browser Cache
├─ Static assets (30 days)
├─ API responses (1 hour)
└─ User session (browser storage)
```

### Database Optimization

- **Connection Pool**: Reuse connections (10 max)
- **Indexing**: B-tree indexes on FK and frequently queried columns
- **Partitioning**: Archive old audit logs (>1 year)
- **Replication**: Master-slave setup for read scaling

---

## 7. Error Handling Strategy

### Error Hierarchy

```
AppError
├─ ValidationError (400)
├─ AuthenticationError (401)
├─ AuthorizationError (403)
├─ NotFoundError (404)
├─ ConflictError (409)
├─ RateLimitError (429)
└─ ServerError (500)
```

### Error Response Format

```json
{
  "success": false,
  "message": "User not found",
  "code": "USER_NOT_FOUND",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "uuid"
}
```

---

## 8. Testing Strategy

### Unit Tests
- Service functions
- Validation functions
- Security utilities
- Encryption/decryption

### Integration Tests
- API endpoint functionality
- Database operations
- Authentication flow
- Role-based access

### E2E Tests
- Complete user workflows
- Multi-step operations
- Error scenarios

---

## 9. Deployment Architecture

### Development Environment
```
Your Machine
├─ Frontend: localhost:3000 (Vite Dev Server)
├─ Backend: localhost:5000 (Node.js)
└─ Database: localhost:3306 (MySQL)
```

### Production Environment
```
Cloud Provider (AWS/GCP/Azure)
├─ Load Balancer
│  ├─ SSL/TLS Termination
│  └─ Traffic Distribution
├─ Multiple Backend Instances
│  ├─ Auto-scaling
│  └─ Health Checks
├─ Managed Database
│  ├─ Automated Backups
│  ├─ Replication
│  └─ Encryption at Rest
├─ CDN for Static Assets
│  └─ Global Distribution
└─ Monitoring & Logging
   ├─ Application Metrics
   ├─ Error Tracking
   └─ Audit Logs
```

---

## 10. Security Best Practices Checklist

### Code Level
- [x] Never log sensitive information
- [x] Use parameterized queries
- [x] Validate all inputs
- [x] Sanitize outputs
- [x] Use environment variables
- [x] Implement rate limiting
- [x] Add security headers

### Infrastructure Level
- [x] Use HTTPS/TLS
- [x] Implement WAF
- [x] Setup DDoS protection
- [x] Enable encryption at rest
- [x] Use VPN for database access
- [x] Rotate credentials regularly
- [x] Monitor for suspicious activity

### Compliance Level
- [x] Audit logging
- [x] Data encryption
- [x] Access control
- [x] Backup & recovery
- [x] Incident response plan
- [x] Regular security audits
- [x] Privacy policy compliance

