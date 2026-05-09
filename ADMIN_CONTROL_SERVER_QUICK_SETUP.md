# Admin Control Server - Quick Setup & Run Guide

## ✅ What's Been Completed

### Database Layer
- ✅ **admin-schema.sql** created with 8 new tables
- ✅ Default admin roles defined (Super Admin, Manager, Credential Manager, Support Staff)
- ✅ All necessary indexes and foreign keys configured

### Backend Layer
- ✅ **adminController.js** enhanced with 6 new patient management functions
- ✅ **adminRoutes.js** updated with 6 new protected API endpoints
- ✅ All routes require ADMIN role authentication
- ✅ Full audit logging on all operations

### Frontend Layer
- ✅ **AdminControlPanel.jsx** created (800+ lines) with:
  - Dashboard tab with statistics
  - Patient Management tab with search/filter
  - Modal dialogs for operations
  - Responsive design
- ✅ **AdminControlPanel.css** created (800+ lines) with professional styling
- ✅ **App.jsx** updated with routing to `/admin/control-panel`

---

## 🚀 How to Run the System

### Step 1: Apply Database Schema

```bash
# Navigate to backend directory
cd c:\workspace\hospital-management-system\backend

# Apply the schema (you may need to adjust credentials)
mysql -u root -p hospital_management_system < ../database/admin-schema.sql

# When prompted for password, enter your MySQL root password
```

**What this does:**
- Creates 8 new tables for admin management
- Inserts 4 default admin roles
- Sets up indexes and relationships

### Step 2: Start Backend Server

```bash
# Terminal 1 - Backend
cd c:\workspace\hospital-management-system\backend
npm start

# Expected output:
# Server running on port 5001
# Connected to MySQL database
```

### Step 3: Start Frontend Dev Server

```bash
# Terminal 2 - Frontend
cd c:\workspace\hospital-management-system\frontend
npm run dev

# Expected output:
# VITE v4.x.x  ready in xxx ms
# ➜ Local: http://localhost:5173/
```

### Step 4: Login as Admin

1. Open browser: `http://localhost:5173`
2. Go to Login page
3. Enter admin credentials:
   - **Email**: `admin@hospital.com` (or existing admin user email)
   - **Password**: Your admin password
4. After login, you'll be redirected to admin dashboard

### Step 5: Access Admin Control Panel

Once logged in as admin:

**Option A: Direct URL**
```
http://localhost:5173/admin/control-panel
```

**Option B: Navigation (if available in admin dashboard)**
- Look for "Control Panel" or "Patient Management" menu item
- Click to navigate to control panel

---

## 📊 Admin Control Panel Features

### Dashboard Tab
View real-time system statistics:
- Total patients count
- Active patients count
- Total doctors count
- Active doctors count
- Scheduled appointments
- New patients registered today
- Suspended accounts count

### Patient Management Tab
Manage all patient accounts:

1. **Search Patients**
   - Search by email address
   - Search by username
   - Search by first/last name

2. **Filter by Status**
   - All (default)
   - Active
   - Inactive
   - Unverified

3. **Patient Actions** (Click on any patient row):
   - **View Details**: See complete patient profile
   - **Reset Password**: Set new password for patient
   - **Change Status**: Activate/Suspend/Deactivate account

4. **Pagination**
   - View 10 patients per page by default
   - Navigate between pages
   - See total patient count

---

## 🔍 Testing the Admin Functions

### Test 1: View Patient List
```bash
curl -X GET "http://localhost:5001/api/v1/admin/patients?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 2: Search for Patient
```bash
curl -X GET "http://localhost:5001/api/v1/admin/patients?search=john@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 3: Get Dashboard Stats
```bash
curl -X GET "http://localhost:5001/api/v1/admin/dashboard/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 4: Reset Patient Password
```bash
curl -X POST "http://localhost:5001/api/v1/admin/patients/5/reset-password" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewPassword123!",
    "reason": "Patient forgot password"
  }'
```

### Test 5: Change Patient Status
```bash
curl -X POST "http://localhost:5001/api/v1/admin/patients/5/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED",
    "reason": "Suspicious activity detected"
  }'
```

---

## 📁 File Locations

### Database
```
backend/database/admin-schema.sql          (300+ lines, NEW)
```

### Backend
```
backend/src/controllers/adminController.js  (ENHANCED with 6 new functions)
backend/src/routes/adminRoutes.js           (UPDATED with 6 new endpoints)
```

### Frontend
```
frontend/src/pages/AdminControlPanel.jsx    (800+ lines, NEW)
frontend/src/pages/AdminControlPanel.css    (800+ lines, NEW)
frontend/src/App.jsx                        (UPDATED with new route)
```

### Documentation
```
ADMIN_CONTROL_SERVER_GUIDE.md               (Complete documentation)
ADMIN_CONTROL_SERVER_QUICK_SETUP.md         (This file)
```

---

## ⚡ Quick Commands Reference

### Database
```bash
# Apply admin schema
mysql -u root -p hospital_management_system < backend/database/admin-schema.sql

# Verify tables created
mysql -u root -p hospital_management_system -e "SHOW TABLES LIKE 'admin%';"

# Check admin roles
mysql -u root -p hospital_management_system -e "SELECT * FROM admin_roles;"

# Check admin staff
mysql -u root -p hospital_management_system -e "SELECT * FROM admin_staff;"
```

### Backend
```bash
# Start server
cd backend && npm start

# Start in development mode with nodemon
cd backend && npm run dev

# Run tests
cd backend && npm test
```

### Frontend
```bash
# Start dev server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Preview production build
cd frontend && npm run preview
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Created super admin user in database
- [ ] Database schema applied to MySQL
- [ ] All endpoints protected with ADMIN role
- [ ] Frontend routes protected with ProtectedRoute component
- [ ] Audit logging enabled and working
- [ ] CORS configured for your domain
- [ ] HTTPS enabled (for production)
- [ ] Strong admin passwords set
- [ ] Database backups configured

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot GET /admin/control-panel"
**Solution:**
1. Ensure you're logged in with ADMIN role
2. Verify browser is at `http://localhost:5173`
3. Check browser console for errors
4. Verify AdminControlPanel.jsx file exists in frontend/src/pages/

### Issue: "Cannot GET /api/v1/admin/dashboard/stats"
**Solution:**
1. Ensure backend is running on port 5001
2. Verify admin routes are imported in backend/src/routes/index.js
3. Check JWT token is valid
4. Verify user has ADMIN role in database

### Issue: "Database table doesn't exist"
**Solution:**
1. Run admin schema: `mysql -u root -p hospital_management_system < backend/database/admin-schema.sql`
2. Verify with: `mysql -u root -p hospital_management_system -e "SHOW TABLES LIKE 'admin%';"`
3. Check MySQL error log

### Issue: "401 Unauthorized" on admin endpoints
**Solution:**
1. Check JWT token is present in request headers
2. Verify user role is ADMIN in database
3. Check token expiration
4. Try logging out and logging back in

---

## 📈 Next Steps

### Phase Roadmap

**Phase 3 - Admin Server (CURRENT)**
- ✅ Database schema created
- ✅ Backend API endpoints implemented
- ✅ Frontend control panel created
- ✅ App.jsx routing updated
- ⏳ **Next**: Apply database schema and test

**Phase 4 - Doctor Management (LATER)**
- [ ] Doctor patient relationships
- [ ] Doctor verification
- [ ] Doctor specializations
- [ ] Doctor schedule management

**Phase 5 - Advanced Features (FUTURE)**
- [ ] Bulk operations
- [ ] Data exports
- [ ] Advanced reporting
- [ ] Custom notifications

---

## 📞 Need Help?

### Check These Files First:
1. Browser Console (F12) - Shows frontend errors
2. Backend Console - Shows server errors
3. Database logs - Shows query errors
4. Audit logs - Shows action history

### Debug Mode:
```bash
# Backend debug
cd backend && DEBUG=* npm start

# Frontend debug
cd frontend && npm run dev (shows all console logs)
```

---

## ✨ System Architecture Summary

```
Frontend (React + Vite)
    ↓
AdminControlPanel.jsx
    ↓
apiClient (Axios wrapper)
    ↓
Backend (Express.js)
    ↓
adminRoutes.js (Protected by ADMIN role)
    ↓
adminController.js (Business logic + Audit logging)
    ↓
MySQL Database
    ↓
8 Admin Tables (Audit trails, Roles, Status history)
```

---

**Status**: ✅ Ready for Testing
**Last Updated**: April 12, 2026
**Version**: 1.0.0

