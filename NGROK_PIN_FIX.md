# Fix PIN Sending on NGrok - Step by Step

## The Problem
When accessing the app via ngrok URL on mobile, PIN sending fails because:
- Frontend points to `http://localhost:5001/api/v1`
- Mobile can't reach localhost (it refers to the mobile device)
- PIN requests never reach your backend

## The Solution

### Step 1: Update Frontend Configuration

Edit `frontend/.env` and change:
```bash
# BEFORE:
VITE_API_URL=http://localhost:5001/api/v1

# AFTER:
VITE_API_URL=https://exactable-discretional-zion.ngrok-free.dev/api/v1
```

### Step 2: Rebuild Frontend
```bash
cd frontend
npm run build
npm run preview
```

The app now runs on `http://localhost:4173` (locally) or via ngrok

### Step 3: Test on Mobile via NGrok

**Option A: Direct NGrok URL**
- Open browser on mobile
- Go to: `https://exactable-discretional-zion.ngrok-free.dev/register`
- The app will now communicate with the backend through ngrok

**Option B: Second NGrok Tunnel (Optional)**
```bash
# In a new terminal, tunnel the frontend instead:
ngrok http 3001
# Or for preview:
ngrok http 4173
```
- Open that ngrok URL on mobile browser

### Step 4: Test PIN Sending

1. Fill in **Email** and **Username**
2. Click **"Send PIN"**
3. You should see:
   - ✅ "PIN sent successfully" message
   - ✅ Email in inbox (takes 1-2 seconds)
   - OR 📌 PIN displayed on form (if development mode shows fallback)

### Step 5: Verify Backend Receives Request

Check backend console for:
```
✅ PIN sent to your-email@gmail.com
📧 Attempting to send PIN email to: your-email@gmail.com
✅ Email sent successfully: <message-id>
```

## Common Issues

### Issue 1: "Network Error" or "Cannot connect to API"
- [ ] Did you rebuild frontend? (`npm run build`)
- [ ] Does frontend/.env have the correct ngrok URL?
- [ ] Is backend still running on 5001?

### Issue 2: "Failed to send PIN" in UI
- [ ] Check backend console for email errors
- [ ] Verify EMAIL_USER and EMAIL_PASSWORD in backend/.env
- [ ] Check Gmail hasn't blocked the email

### Issue 3: Email not arriving
- [ ] Check spam/junk folder
- [ ] Verify Gmail credentials are correct
- [ ] Restart backend: `npm start`

## Quick Commands

```bash
# Terminal 1: Backend (if not running)
cd backend
npm start

# Terminal 2: Frontend rebuild + preview
cd frontend
npm run build
npm run preview

# Terminal 3: Monitor backend logs
# (Already running in Terminal 1)
```

## Ngrok URL Reference
- **Your Current URL**: https://exactable-discretional-zion.ngrok-free.dev
- **Register via Mobile**: https://exactable-discretional-zion.ngrok-free.dev/register
- **Login via Mobile**: https://exactable-discretional-zion.ngrok-free.dev/login

---

**Note**: The ngrok URL changes every time you restart ngrok. If it changes:
1. Update `frontend/.env` with the new URL
2. Rebuild frontend: `npm run build`
3. Test again

