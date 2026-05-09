# Testing PIN Sending via NGrok - Complete Guide

## ✅ Current Setup Status

Your system is now properly configured for ngrok testing:

- ✅ **Backend**: Running on port 5001
- ✅ **Frontend**: Running on port 5173 (http://localhost:5173/)
- ✅ **Frontend Configuration**: Updated to use ngrok URL
  - API URL: `https://exactable-discretional-zion.ngrok-free.dev/api/v1`
- ✅ **Email Service**: Verified working (Gmail configured)
- ✅ **NGrok Tunnel**: Active at `https://exactable-discretional-zion.ngrok-free.dev`

## 📱 How to Test PIN Sending on Mobile

### Option 1: Direct NGrok Tunnel (Recommended)

**On your mobile device:**
1. Open browser
2. Go to: `https://exactable-discretional-zion.ngrok-free.dev/register`
3. Fill in email and username
4. Click "Send  PIN"
5. Check your email for the PIN

**Expected Flow:**
```
Mobile → HTTPS (NGrok) → Backend (Port 5001)
        ↓
    Frontend receives response
    ↓
    Shows "PIN sent successfully"
    ↓
    Email sent to your inbox (1-2 seconds)
```

### Option 2: Login First (If Already Registered)

**On your mobile device:**
1. Go to: `https://exactable-discretional-zion.ngrok-free.dev/login`
2. Use your credentials
3. Navigate to Patient Dashboard
4. Test other features

### Option 3: Local Testing (Before Mobile)

1. **On your computer**, open browser
2. Go to: `http://localhost:5173/register`
3. Fill in email and username
4. Click "Send PIN"
5. Check email or see PIN on form

## 🔍 What Happens When You Click "Send PIN"

### 1. Frontend Sends Request
```javascript
// Frontend sends to ngrok backend
POST https://exactable-discretional-zion.ngrok-free.dev/api/v1/auth/send-pin
{
  "email": "user@example.com",
  "username": "johndoe"
}
```

### 2. Backend Processes It
```
✅ Validates email and username
✅ Generates 6-digit PIN
✅ Stores PIN temporarily (10-minute expiry)
✅ Sends email via Gmail
```

### 3. Backend Console Shows
```
✅ PIN sent to user@example.com
📧 Attempting to send PIN email to: user@example.com
✅ Email sent successfully: <message-id>
```

### 4. Frontend Shows Response
```
✅ "PIN sent successfully"
Message: "PIN sent to your email. Valid for 10 minutes."
```

### 5. Email Arrives
```
To: user@example.com
Subject: Email Verification - PIN Code
Body: Your PIN is: 123456 (valid for 10 minutes)
```

## ✅ Troubleshooting

### Issue 1: "Cannot connect to backend" Error

**Symptom:** Error message on mobile when clicking Send PIN

**Solutions:**
- [ ] Is backend running? Check: `netstat -ano | findstr :5001`
- [ ] Is ngrok tunnel active? Should show "Forwarding HTTPS → HTTP localhost:5001"
- [ ] Did you rebuild frontend? (You did - it's done ✅)

### Issue 2: Email Not Arriving

**Check backend console for:**
```
❌ Email send failed: ...
```

**Solutions:**
- [ ] Gmail credentials in backend/.env are correct
- [ ] Email account has app-specific password set
- [ ] Check spam/junk folder
- [ ] Restart backend if credentials changed

### Issue 3: "Network Connection Failed"

**Possible Causes:**
1. **Mobile not connected to internet** → Check WiFi/mobile data
2. **Ngrok tunnel down** → Restart: `ngrok http 5001`
3. **No backend running** → Start: `node backend/server.js`

## 🛠️ Quick Fix Commands

If something isn't working:

```bash
# Terminal 1: Kill any running processes and start fresh
cd backend
netstat -ano | findstr :5001  # Find process using port 5001
taskkill /PID <PID> /F        # Kill the process

# Restart backend
npm start   # or: node server.js

# Terminal 2: Kill old ngrok and restart
# (Close the ngrok terminal and restart)
ngrok http 5001
# Copy the new HTTPS URL

# Terminal 3: Frontend (if needed)
cd frontend
# Kill old vite (Ctrl+C)
npx vite --host 0.0.0.0
```

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE DEVICE                              │
│  ┌──────────────────────────────────────────────────────────┤│
│  │ Browser                                                     ││
│  │ URL: https://exactable-discretional-zion.ngrok...          ││
│  │ ┌────────────────────────────────────────────────────────┐│
│  │ │ Fill Email & Username                                  ││
│  │ │ Click: "Send PIN"                                      ││
│  │ └────────────────────────────────────────────────────────┘│
│  └──────────────────────────────────────────────────────────┘│
│                         ↓ HTTPS                               │
│                (NGrok Tunnel)                                │
└─────────────────────────────────────────────────────────────┘
                         ↓
 ┌─────────────────────────────────────────────────────────────┐
 │                        NGROK                                 │
 │ https://exactable-discretional-zion.ngrok-free.dev          │
 │              (Secure Tunnel - Encryption)                  │
 └─────────────────────────────────────────────────────────────┘
                         ↓ HTTP
 ┌─────────────────────────────────────────────────────────────┐
 │                    YOUR COMPUTER                            │
 │  Backend: http://localhost:5001                             │
 │  ┌──────────────────────────────────────────────────────────┤
 │  │ Express Server                                            │
 │  │ ┌────────────────────────────────────────────────────────┐
 │  │ │ POST /api/v1/auth/send-pin                             │
 │  │ │ ├─ Generate PIN                                        │
 │  │ │ ├─ Store PIN (10 min)                                  │
 │  │ │ └─ Send Email (Gmail SMTP)                             │
 │  │ └────────────────────────────────────────────────────────┘
 │  │                                                            │
 │  │ Database: MySQL                                           │
 │  │ ┌────────────────────────────────────────────────────────┐
 │  │ │ Store pending verifications                            │
 │  │ └────────────────────────────────────────────────────────┘
 │  └──────────────────────────────────────────────────────────┘
 │                         │
 │                    ↓ via Gmail SMTP
 │  ┌──────────────────────────────────────────────────────────┤
 │  │ Gmail Service                                             │
 │  │ └─ Send Email: "Your PIN: 123456"                        │
 │  │    To: user@example.com                                  │
 │  └──────────────────────────────────────────────────────────┘
 └─────────────────────────────────────────────────────────────┘
                         ↓ Email Protocol
 ┌─────────────────────────────────────────────────────────────┐
 │                    USER'S EMAIL                              │
 │  Inbox or Spam Folder                                       │
 │  From: Hospital Management System                           │
 │  Subject: Email Verification - PIN Code                     │
 │  Body: Your PIN is: 123456 (Valid for 10 minutes)           │
 └─────────────────────────────────────────────────────────────┘
```

## 📋 Step-by-Step Testing Checklist

- [ ] Backend running (`node server.js` on port 5001)
- [ ] Frontend running (`npx vite --host 0.0.0.0` on port 5173)
- [ ] Frontend has ngrok URL: `https://exactable-discretional-zion.ngrok-free.dev`
- [ ] NGrok tunnel is active (check terminal)
- [ ] Email credentials in backend/.env are correct
- [ ] Test email sending worked: `node backend/test-email.js` ✅
- [ ] Mobile device connected to internet
- [ ] Mobile device can access ngrok URL (test by opening in browser)
- [ ] Firewall not blocking port 5001
- [ ] Backend console shows no errors

## 🚀 Once Testing is Complete

### For Production Deployment:
1. Set `NODE_ENV=production` in backend/.env
2. Use `VITE_API_URL=https://your-domain.com/api/v1` in frontend/.env
3. Ensure CORS is properly configured for your domain
4. Use real SSL certificates (not ngrok)

### For Testing Other Devices:
- Update `VITE_API_URL` if ngrok URL changes (it changes on restart)
- Rebuild frontend: `npm run build`
- Test on different devices/browsers

## 📞 Support

If PIN still fails:
1. Check backend console for specific error
2. Verify email credentials
3. Check ngrok tunnel is active
4. Try local testing first (http://localhost:5173/register)
5. Restart all services if nothing works

---

**Your Current Ngrok URL**: https://exactable-discretional-zion.ngrok-free.dev
**Frontend**: http://localhost:5173/
**Backend**: http://localhost:5001/

