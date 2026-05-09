# NGrok + Mobile PIN Delivery - Why It Might Fail

## The 3 Critical Components

### 🔧 **Component 1: Backend Configuration**
Location: `backend/.env`

**Required**:
```bash
# Email service MUST be configured
EMAIL_USER=your-email@gmail.com           # ✅ Must be REAL email
EMAIL_PASSWORD=your-app-password          # ✅ Must be APP PASSWORD (not regular password)
EMAIL_SERVICE=gmail                       # ✅ SMTP service

# Port must be accessible
PORT=5001                                 # ✅ Backend port
```

**Why it fails**:
❌ EMAIL_USER still has "your-email@gmail.com"
❌ EMAIL_PASSWORD is regular Gmail password (not app password)
❌ EMAIL_PASSWORD has typos
❌ Gmail account doesn't have 2FA enabled

**How to fix**:
1. Go to: https://myaccount.google.com/apppasswords
2. Select: Mail, Windows Computer
3. Copy the 16-character password
4. Update `backend/.env` with actual password

---

### 🌐 **Component 2: NGrok Tunnel**
Command: `ngrok http 5001`

**Output you should see**:
```
Session Status                online
Forwarding                    https://abc1234-xyz.ngrok-free.app → http://localhost:5001
Web Interface                 http://127.0.0.1:4040
```

**Why it fails**:
❌ NGrok not installed
❌ Port 5001 not running backend
❌ Tunnel shows "offline"
❌ Wrong port forwarded

**How to check**:
```bash
# Verify backend is running
curl http://localhost:5001/api/v1/health
# Should return: {"status": "OK", ...}

# Verify ngrok tunnel
curl https://your-ngrok-url/api/v1/health
# Should return same response
```

---

### 📱 **Component 3: Frontend Configuration**
Location: `frontend/.env.production`

**Required**:
```bash
# Frontend MUST know where backend is
VITE_API_URL=https://abc1234-xyz.ngrok-free.app/api/v1  # ✅ NGrok HTTPS URL
```

**Why it fails**:
❌ Still pointing to localhost
❌ Using HTTP instead of HTTPS
❌ Typo in URL
❌ Frontend not rebuilt after changing VITE_API_URL

**How to fix**:
```bash
# 1. Update the file
echo VITE_API_URL=https://your-ngrok-url/api/v1 > frontend/.env.production

# 2. Rebuild (MUST DO THIS!)
cd frontend
npm run build

# 3. Verify build
npm run preview
# Check the URL - should connect to backend
```

---

## The Request Flow

```
📱 Mobile Device
  ↓ 
  ├─→ 📡 Request to: https://your-ngrok-url/auth/send-verification-pin
  │                  (This is NGrok HTTPS tunnel)
  │
  ├─→ 🌐 NGrok receives request
  │   ├─→ Forwards to: http://localhost:5001/auth/send-verification-pin
  │   │             (Your backend API)
  │
  ├─→ 💻 Backend receives request
  │   ├─→ Generates 6-digit PIN
  │   ├─→ Stores PIN in memory
  │   ├─→ **Attempts to send email**
  │   │   ├─→ ✅ SUCCESS: Uses EMAIL_USER & EMAIL_PASSWORD to send via Gmail
  │   │   └─→ ❌ FAILURE: Returns PIN in response (dev mode)
  │
  ├─→ 📧 Gmail receives email from noreply@hospital.com
  │      (Or fails, and PIN shows on frontend instead)
  │
  └─→ 📱 Mobile displays:
      - Success: "PIN sent to email"
      - Failure (dev): "PIN: 123456" (displayed on form)
```

---

## Checklist: Why PIN Not Sent

### Before requesting PIN:
- [ ] Backend running? `node server.js` ✅
- [ ] NGrok running? `ngrok http 5001` ✅  
- [ ] NGrok shows "online"? ✅
- [ ] Frontend rebuilt? `npm run build` ✅
- [ ] VITE_API_URL set to ngrok URL? ✅

### Email service:
- [ ] EMAIL_USER not generic placeholder? ✅
- [ ] EMAIL_PASSWORD is app-specific (16 chars)? ✅
- [ ] Gmail account has 2FA enabled? ✅
- [ ] Gmail allows app passwords? ✅

### NGrok connectivity:
- [ ] Can reach: https://your-ngrok-url/api/v1/health ✅
- [ ] Response is JSON? ✅
- [ ] Backend console shows request received? ✅

### Frontend:
- [ ] Mobile accessing ngrok URL (not localhost)? ✅
- [ ] No console errors? ✅
- [ ] API base URL in network tab is ngrok? ✅

---

## Debug Process

### Step 1: Verify Backend Email Logic
```bash
# In backend console during PIN request, you should see:
# ✅ PIN sent to user@email.com
# OR
# ⚠️ Failed to send email: <error>
# 📌 Development Mode: PIN is 123456
```

### Step 2: Check What Mobile Receives
**Backend returns** (success or failure):
```json
{
  "success": true,
  "data": {
    "email": "user@email.com",
    "username": "testuser",
    "message": "PIN sent to your email",
    "pin": "123456"        // Only in dev/testMode
  }
}
```

### Step 3: Verify Email Actually Sent
```bash
# Check Gmail's "Sent" folder for email:
# From: Hospital Management System <your-email@gmail.com>
# To: user@email.com
# Subject: Email Verification - PIN Code
# Body: Contains 6-digit PIN
```

---

## Common Scenarios

### Scenario 1: ✅ "PIN Arrives in Email"
- Email service working perfectly
- NGrok tunnel functional
- Frontend configuration correct
- Everything works!

### Scenario 2: ✅ "PIN Shows on Form (Dev Mode)"
- Email service not working
- But system detected failure and displayed PIN
- This is safe for development/testing
- Create app password then fix email

### Scenario 3: ❌ "Nothing Happens"
- Frontend not reaching backend
- Verify ngrok URL in VITE_API_URL
- Verify frontend was rebuilt
- Check browser console for errors

### Scenario 4: ❌ "API Connection Error"
- NGrok tunnel offline
- Backend not running
- Wrong port forwarded
- Check: `curl https://your-ngrok-url/api/v1/health`

---

## Email Service Decision Tree

```
User requests PIN
  ↓
Try to send email
  ├─→ ✅ Email sent successfully
  │   └─→ Response: "PIN sent to email"
  │
  └─→ ❌ Email failed
      ├─→ In PRODUCTION
      │   └─→ Return error to user (fail)
      │
      └─→ In DEVELOPMENT
          ├─→ Try to show PIN on form
          ├─→ Log warning about email failure
          └─→ Response: "PIN sent" + show PIN on frontend
```

---

## Email Failure Root Causes

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid login credentials" | Wrong password | Use app-specific password |
| "User has to log in in web browser" | 2FA not enabled | Enable 2FA in Gmail |
| "Gmail blocked access" | Untrusted location | Mark ngrok IP as trusted |
| "ENOTFOUND smtp.gmail.com" | Network/DNS issue | Check internet connection |
| "Connection timeout" | Firewall blocking SMTP | Check firewall rules |
| "Less secure app blocked" | Gmail security policy | Use app-specific password |

---

## Quick Fixes (In Order)

1. **Verify Email Config**
   ```bash
   # backend/.env
   EMAIL_USER=your-real-email@gmail.com
   EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # From Google
   ```

2. **Rebuild Frontend**
   ```bash
   cd frontend && npm run build
   ```

3. **Restart Backend**
   ```bash
   # Terminal 1: Ctrl+C then: node server.js
   ```

4. **Test Connectivity**
   ```bash
   # From mobile: https://your-ngrok-url/api/v1/health
   ```

5. **Request New PIN**
   - Fill form again
   - Click "Send PIN"
   - Check email or form display

---

## When It's Working

You'll see:
- ✅ Frontend loads from ngrok URL
- ✅ "Send PIN" button responds instantly
- ✅ Email arrives within seconds (or PIN appears on form)
- ✅ PIN verification works
- ✅ Registration completes
- ✅ Can proceed to security setup

**Congratulations!** PIN delivery on mobile via ngrok is working!
