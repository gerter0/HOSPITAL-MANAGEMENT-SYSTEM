# Quick Reference Guide

## 🚀 Getting Started (5 minutes)

### 1. Database Setup
```bash
# Create database from schema
mysql -u root -p < database/schema.sql

# Test connection
mysql -h localhost -u hospital_app -p hospital_management_system -e "SELECT 1"
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env - Change JWT_SECRET and ENCRYPTION_KEY
npm run dev
# ✅ Backend on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# ✅ Frontend on http://localhost:3000
```

### 4. Login
- Go to http://localhost:3000
- Use demo credentials (see [README.md](../README.md#demo-credentials))

---

## 📚 Key Files Guide

| File | Purpose |
|------|---------|
| `backend/server.js` | Express app entry point |
| `backend/src/config/config.js` | Configuration management |
| `backend/src/config/database.js` | Database connection setup |
| `backend/src/middleware/authMiddleware.js` | JWT & RBAC |
| `backend/src/utils/security.js` | Encryption & hashing |
| `backend/src/controllers/authController.js` | Login/register logic |
| `database/schema.sql` | Complete database schema |
| `frontend/src/App.jsx` | React router setup |
| `frontend/src/store/authStore.js` | State management |
| `frontend/src/api/client.js` | HTTP client setup |

---

## 🔐 Important Security Files

```
backend/src/utils/
├── security.js          # JWT, encryption, hashing
├── helpers.js          # Validation, error handling
└── auditLogger.js      # Audit logging

backend/src/middleware/
├── authMiddleware.js   # JWT verification, RBAC
├── rateLimiter.js      # Rate limiting
└── commonMiddleware.js # Security headers, CORS
```

---

## 📝 Common Commands

### Backend
```bash
npm run dev              # Start dev server with auto-reload
npm start               # Start production server
npm audit              # Check security vulnerabilities
npm audit fix          # Auto-fix vulnerabilities
```

### Frontend
```bash
npm run dev            # Start dev server on port 3000
npm run build          # Create production build
npm run preview        # Preview production build
npm run lint           # Run linter
npm run format         # Format code with Prettier
```

### Database
```bash
# Connect to database
mysql -u hospital_app -p hospital_management_system

# Common queries
SELECT * FROM users;
SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10;
SELECT * FROM appointments WHERE status = 'SCHEDULED';
```

---

## 🔑 Environment Variables

### Essential (.env)
```
JWT_SECRET=your-secret-key-min-32-characters
ENCRYPTION_KEY=your-32-char-encryption-key-xxx
DB_PASSWORD=your-secure-db-password
```

### Optional (with defaults)
```
PORT=5000                        # Backend port
NODE_ENV=development            # dev/production
DB_HOST=localhost               # Database host
DB_PORT=3306                    # Database port
DB_USER=hospital_app            # Database user
CORS_ORIGINS=http://localhost:3000  # Allowed origins
```

---

## 🧪 Testing API Endpoints

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@hospital.com","password":"Patient@123456"}'
```

### Get Patient Profile
```bash
curl -X GET http://localhost:5000/api/v1/patients/1/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Book Appointment
```bash
curl -X POST http://localhost:5000/api/v1/patients/1/appointments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 1,
    "appointment_date": "2024-02-15T14:00:00Z",
    "reason_for_visit": "Regular checkup"
  }'
```

---

## 🐛 Debugging Tips

### Check Backend Logs
```bash
# Terminal output shows:
# ✅ Database connected
# ✅ Server running on port 5000
# Error messages with line numbers
```

### Check Frontend Logs
```bash
# Press F12 in browser → Console tab
# Check for:
# - Network errors (red lines)
# - JavaScript errors
# - API response codes
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change PORT in .env or kill process |
| DB connection failed | Check credentials in .env, ensure MySQL running |
| CORS error | Add frontend URL to CORS_ORIGINS in .env |
| Invalid token error | User need to login again |
| Encryption error | Verify ENCRYPTION_KEY is 32 characters |

---

## 🔄 Workflow Examples

### Patient Workflow
1. **Register** → /auth/register
2. **Login** → /auth/login (get JWT token)
3. **Update Profile** → /patients/{id}/profile
4. **Book Appointment** → /patients/{id}/appointments
5. **View Records** → /patients/{id}/medical-records
6. **Logout** → /auth/logout

### Doctor Workflow
1. **Login** → /auth/login
2. **View Patients** → /doctors/{id}/patients
3. **Add Medical Record** → /doctors/{id}/patients/{p}/medical-records
4. **Write Prescription** → /doctors/{id}/patients/{p}/prescriptions
5. **Check Appointments** → /doctors/{id}/appointments

### Admin Workflow
1. **Login** → /auth/login
2. **View Users** → /admin/users
3. **Check Statistics** → /admin/statistics
4. **View Audit Logs** → /admin/audit-logs
5. **Manage Users** → /admin/users/{id}/role

---

## 📊 Database Schema Summary

```
Users (Core)
├─ Patients (Patient-specific data)
├─ Doctors (Doctor-specific data)
└─ Admins (Admin-specific data)

Appointments (Links Patients & Doctors)

Medical Records (Patient medical history)
- Encrypted with AES-256-GCM
- Links to Doctors & Appointments
- Searchable by patient

Prescriptions (Medication records)
- Encrypted
- Links to Patients & Doctors
- Status tracking

Audit Log (HIPAA compliance)
- Tracks all access
- Records all changes
- Non-deletable
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Change JWT_SECRET
- [ ] Change ENCRYPTION_KEY
- [ ] Change database password
- [ ] Update CORS_ORIGINS
- [ ] Enable HTTPS
- [ ] Run `npm audit fix`
- [ ] Set NODE_ENV=production
- [ ] Configure firewall
- [ ] Setup monitoring
- [ ] Enable 2FA for admins
- [ ] Create backup strategy
- [ ] Setup incident response

---

## 📞 Quick Help

### Documentation
- Full Guide: [COMPREHENSIVE_GUIDE.md](../docs/COMPREHENSIVE_GUIDE.md)
- Architecture: [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- README: [README.md](../README.md)

### File Locations
- Backend config: `backend/src/config/`
- API routes: `backend/src/routes/`
- Controllers: `backend/src/controllers/`
- Database: `database/schema.sql`
- Frontend components: `frontend/src/components/`

### Important Endpoints

**Auth**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
```

**Patients**
```
GET    /api/v1/patients/{id}/profile
PUT    /api/v1/patients/{id}/profile
GET    /api/v1/patients/{id}/medical-records
POST   /api/v1/patients/{id}/appointments
```

**Doctors**
```
POST   /api/v1/doctors/{id}/patients/{p}/medical-records
POST   /api/v1/doctors/{id}/patients/{p}/prescriptions
```

**Admin**
```
GET    /api/v1/admin/users
GET    /api/v1/admin/statistics
GET    /api/v1/admin/audit-logs
```

---

**Version**: 1.0.0  
**Last Updated**: April 1, 2026
