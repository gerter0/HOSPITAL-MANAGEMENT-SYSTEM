# NGrok Quick Start Guide - Hospital Management System on Mobile

## Before You Start
✅ Backend running: http://localhost:5001
✅ Frontend running: http://localhost:5173
✅ Gmail account with app-specific password configured
✅ NGrok installed: https://ngrok.com/download

---

## **Step-by-Step Setup (5 minutes)**

### Terminal 1: Start Backend
```bash
cd backend
node server.js
# Output: Hospital Management System - Backend Server... listening on port 5001
```
✅ Keep this running

### Terminal 2: Start NGrok
```bash
# Windows PowerShell
.\start-ngrok.ps1

# OR manual:
ngrok http 5001
```

Watch for output:
```
Forward https://abc1234-xyz.ngrok-free.app → http://localhost:5001
```

📝 **Copy the HTTPS URL** (example: `https://abc1234-xyz.ngrok-free.app`)

### Terminal 3: Update & Build Frontend
```bash
# Edit frontend/.env.production
# Change:
VITE_API_URL=https://your-ngrok-url/api/v1
# To:
VITE_API_URL=https://abc1234-xyz.ngrok-free.app/api/v1

# Build frontend
cd frontend
npm run build
npm run preview
# This runs on http://localhost:4173 for testing
```

---

## **On Mobile Device**

### Option A: Through NGrok (Recommended)
1. Start second ngrok tunnel for frontend:
   ```bash
   ngrok http 5173
   # Get HTTPS URL
   ```

2. Open on mobile: `https://frontend-ngrok-url`

3. Navigate to: **Register as Patient**

4. Fill form and request PIN → Check email or see PIN displayed on form

### Option B: On Same WiFi
1. Get your computer IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

2. On mobile, open: `http://your-computer-ip:5173`

3. When prompted for API, it will automatically use ngrok if configured

---

## **Testing PIN Flow**

1. Click "Register as Patient"
2. Enter email and username
3. Click "Send PIN"
4. Look for PIN in one of these places:
   
   ✅ **Email inbox** (preferred)
   📌 **Form display** (if email fails in dev mode)
   💻 **Backend console** showing "✅ PIN sent to..."

5. Enter 6-digit PIN
6. Click "Verify PIN"
7. Complete registration

---

## **Common Issues**

### "Can't reach API"
- [ ] ngrok terminal shows "Forwarding HTTPS → HTTP"?
- [ ] VITE_API_URL updated and frontend rebuilt?
- [ ] VITE_API_URL matches ngrok HTTPS URL?
- [ ] Backend running on port 5001?

### "PIN not received"
- [ ] Email configured: `EMAIL_USER` and `EMAIL_PASSWORD` in backend/.env?
- [ ] Used app-specific Gmail password (not regular password)?
- [ ] Check spam folder?
- [ ] Look at backend console for `❌ Failed to send email`?
- [ ] In dev mode, PIN should display on form instead?

### "CORS error"
- [ ] Backend has cors enabled (it does by default)?
- [ ] Request going to ngrok URL (not localhost)?
- [ ] Check browser console for exact error?

---

## **Verify Setup**

Check these from mobile browser:

```javascript
// Paste in mobile browser console:

// 1. Check basic connectivity
fetch('https://your-ngrok-url/api/v1/diagnostics')
  .then(r => r.json())
  .then(d => console.log('✅ Backend connected:', d))
  .catch(e => console.error('❌ Connection failed:', e))

// 2. Check health
fetch('https://your-ngrok-url/api/v1/health')
  .then(r => r.json())
  .then(d => console.log('✅ Health:', d.status))
  .catch(e => console.error('❌ Health check failed:', e))
```

---

## **File Locations**

| File | Purpose |
|------|---------|
| `backend/.env` | Email credentials (`EMAIL_USER`, `EMAIL_PASSWORD`) |
| `frontend/.env.production` | API URL for production (`VITE_API_URL`) |
| `NGROK_PIN_TROUBLESHOOTING.md` | Detailed troubleshooting guide |
| `backend/start-ngrok.ps1` | Automated ngrok start script |

---

## **Environment Variables Needed**

### Backend (`backend/.env`)
```bash
# Existing settings...

# EMAIL (Gmail with app password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # From Google Account
EMAIL_SERVICE=gmail

# Optional NGrok settings
NGROK_ENABLED=true
NGROK_URL=https://your-ngrok-url.ngrok-free.app
```

### Frontend (`frontend/.env.production`)
```bash
# Must be HTTPS (ngrok provides this)
VITE_API_URL=https://your-ngrok-url/api/v1
```

---

## **Next Steps**

✅ Setup complete! You can now:
- Test registration flow on mobile
- Verify PIN sending works
- Test account security setup
- Check multi-device access

📚 For more details:
- See: `NGROK_SETUP_GUIDE.md`
- Troubleshoot: `NGROK_PIN_TROUBLESHOOTING.md`

---

## **Stop & Start**

To stop everything:
```bash
# Terminal 1: Ctrl+C (backend)
# Terminal 2: Ctrl+C (ngrok)
# Terminal 3: Ctrl+C (frontend)
```

To restart:
```bash
# Just repeat Step-by-Step Setup above
```

---

**Need Help?** 
- Check backend console for error messages
- Check browser console (F12) on mobile
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Make sure ngrok URL hasn't changed
- Run diagnostics endpoint to verify connections
