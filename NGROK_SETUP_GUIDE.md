# NGrok Setup Guide for Mobile Testing

## Problem
When accessing the Hospital Management System from mobile via ngrok:
1. Frontend can't reach the backend API (points to localhost)
2. PIN emails may fail to send (Gmail blocks ngrok IPs)
3. CORS issues may prevent requests

## Solution

### Step 1: Start Backend
```bash
cd backend
npm start
# Backend runs on http://localhost:5001
```

### Step 2: Start NGrok (separate terminal)
```bash
ngrok http 5001
# Output will show: Forwarding https://abc123-xyz.ngrok-free.app -> http://localhost:5001
# Copy this URL
```

### Step 3: Configure Frontend for Mobile (Option A: Environment Variable)
Create `frontend/.env.production.local`:
```
VITE_API_URL=https://your-ngrok-url/api/v1
```

Then rebuild frontend:
```bash
cd frontend
npm run build
npm run preview  # or serve the dist folder
```

### Step 4: Access from Mobile
1. On your mobile device, open: `http://your-local-ip:5173` or `https://your-ngrok-url/frontend`
2. Use ngrok-fronted frontend if serving through ngrok:
   - Option A: Host frontend through ngrok too:
   ```bash
   ngrok http 5173  # In another terminal
   # Access: https://your-ngrok-frontend-url
   ```

### Step 5: Handle Email Issues (PIN Delivery)

#### Option 1: Use Gmail App Password (Recommended)
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update backend/.env:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=<your-app-password-16-chars>
   ```

#### Option 2: Use Development Mode (Testing Only)
- PIN will be displayed on frontend during testing
- Perfect for development without email service

#### Option 3: Whitelist NGrok IP in Gmail
- Gmail may still block - use Sender-ID or domain verification

#### Option 4: Use Alternative Email Service
Replace Gmail with SendGrid, Mailgun, or AWS SES in emailService.js

### Step 6: Test PIN Flow

**On Mobile:**
1. Go to registration page
2. Enter email and username
3. PIN should appear in:
   - Your email inbox (if email configured)
   - Frontend display (if development mode)
   - Check email spam folder

### Troubleshooting

#### "PIN not received"
- Check backend console for email errors
- Verify EMAIL_USER and EMAIL_PASSWORD in .env
- Check spam folder
- In development, PIN displays on form

#### "Cannot connect to API"
- Verify VITE_API_URL in frontend .env matches ngrok URL
- Check ngrok tunnel is running
- Verify frontend built with correct env vars
- Check CORS headers in response

#### "CORS Error on Mobile"
- Backend has `cors: { origin: true }` - should allow all
- Check browser console for exact error
- Verify request destination is ngrok URL, not localhost

## Quick Test
```bash
# From mobile browser
fetch('https://your-ngrok-url/api/v1/health')
  .then(r => r.json())
  .then(console.log)
```

## Production Deployment
- Remove `origin: true` from CORS config
- Set specific frontend domain
- Use proper email service (not Gmail)
- Use HTTPS with valid certificate
