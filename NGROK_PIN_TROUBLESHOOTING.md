# PIN Not Sending on Mobile via NGrok - Troubleshooting Guide

## Quick Checklist

- [ ] Backend running on http://localhost:5001
- [ ] NGrok tunnel active: `ngrok http 5001`
- [ ] Frontend VITE_API_URL set to ngrok HTTPS URL
- [ ] Frontend rebuilt: `npm run build`
- [ ] Email credentials configured in backend/.env
- [ ] Mobile accessing via ngrok URL (NOT localhost)
- [ ] Mobile on same WiFi or via internet

## Common Issues & Solutions

### Issue 1: "PIN Not Received in Email"

**Cause**: Email service misconfiguration or Gmail blocking ngrok IP

**Solutions**:

1. **Check Email Service is Working** (Backend Terminal)
   ```bash
   # Look for these logs:
   # ✅ Email sent successfully: <messageId>
   # OR
   # ❌ Failed to send email: <error message>
   ```

   If you see `❌`, the email service failed. Continue below.

2. **Verify Gmail Credentials**
   ```bash
   # backend/.env should have:
   EMAIL_USER=your-actual-email@gmail.com
   EMAIL_PASSWORD=your-app-specific-password  # NOT regular password
   
   # Get App Password from: https://myaccount.google.com/apppasswords
   # (Requires 2FA enabled)
   ```

3. **Check Gmail Security**
   - Gmail may block connections from ngrok IPs
   - Solution: Allow "Less secure apps" OR use App Password
   - Alternative: Use different email service (SendGrid, Mailgun)

4. **Use Development Mode**
   - In development, PIN displays on frontend
   - PIN appears: "📌 Development Mode: PIN is XXXXXX"
   - Visible on console AND in response

### Issue 2: "Can't Connect to API from Mobile"

**Cause**: Frontend pointing to localhost instead of ngrok URL

**Solutions**:

1. **Verify Frontend Configuration**
   ```bash
   # frontend/.env.production should have:
   VITE_API_URL=https://xxxx-xxx-xxx.ngrok-free.app/api/v1
   # NOT localhost!
   ```

2. **Rebuild Frontend**
   ```bash
   cd frontend
   npm run build
   # Must rebuild after changing VITE_API_URL
   ```

3. **Check Mobile Request**
   - Open DevTools on mobile (Chrome: Three dots → DevTools)
   - Go to Network tab
   - Perform action that sends PIN
   - Check URL in Network tab - should be ngrok URL, not localhost

### Issue 3: "CORS Error on Mobile"

**Cause**: Cross-Origin request blocked

**Solution**:
- Backend has CORS enabled: `cors({ origin: true })`
- Should work automatically
- If still failing, check:
  ```bash
  # In browser console on mobile:
  fetch('https://your-ngrok-url/api/v1/health')
    .then(r => r.json())
    .then(data => console.log('✅ Connection OK', data))
    .catch(e => console.error('❌ Connection Failed', e))
  ```

### Issue 4: "PIN Sent But Won't Verify"

**Cause**: Verification endpoint issues

**Solutions**:

1. **Check PIN Matches**
   - PIN valid for 10 minutes
   - Must enter exact 6 digits
   - Case-sensitive validation

2. **Check Attempts Counter**
   - Max 3 failed attempts
   - If exceeded: "Too many failed attempts. Request a new PIN."
   - Request new PIN to reset

3. **Clear Pending Verifications** (Backend in-memory storage)
   - When backend restarts, all pending PINs are cleared
   - Request new PIN after backend restart

## Step-by-Step Debug Process

### Step 1: Test Backend Directly
```bash
# From mobile browser, visit:
https://your-ngrok-url/api/v1/diagnostics

# You should see JSON response with request info
```

If this fails:
- NGrok tunnel not running
- Wrong HTTPS URL
- Network connectivity issue

### Step 2: Test Email Service
```bash
# In backend terminal, look for email logs when sending PIN
# Should see: ✅ Email sent successfully

# If ❌: 
# - Check EMAIL_USER and EMAIL_PASSWORD
# - Verify Gmail app password
# - Check Gmail security settings
```

### Step 3: Check Development PIN Display
```bash
# If email fails, PIN should show in response:
{
  "success": true,
  "data": {
    "pin": "123456",  # visible in dev mode
    "devNote": "⚠️ PIN displayed for development only"
  }
}
```

### Step 4: Verify Frontend Configuration
```bash
# In frontend build output, check variables:
echo $VITE_API_URL  # Linux/Mac
echo %VITE_API_URL%  # Windows

# Should show ngrok URL
```

## Production vs Development

| Scenario | PIN Display | Email Required | Use Case |
|----------|-------------|----------------|----------|
| Development (NODE_ENV=development) | Yes | No* | Feature testing |
| Production (NODE_ENV=production) | No | Yes | Real users |
| NGrok Testing | Yes** | Preferred | Mobile testing |

*In development, email still attempts but not required
**Can be forced with testMode=true parameter

## When All Else Fails

### Nuclear Option: Force Development Mode PWD
Pin will display in response (temporary for testing):

```bash
# In backend/.env
NODE_ENV=development
```

Then restart backend and request will show:
```json
{
  "pin": "123456",
  "devNote": "⚠️ PIN displayed for development only"
}
```

### Alternative Email Services

**If Gmail is unreliable with ngrok:**

1. **Use SendGrid** (Free tier available)
   ```bash
   npm install @sendgrid/mail
   
   # Update emailService.js to use SendGrid
   # Update .env:
   SENDGRID_API_KEY=your-key
   ```

2. **Use AWS SES**
   ```bash
   npm install aws-sdk
   
   # Update emailService.js
   # Configure AWS credentials
   ```

3. **Use Mailgun**
   ```bash
   npm install mailgun.js
   
   # Similar setup as above
   ```

## Log Files to Check

```bash
# Backend Console
- "✅ PIN sent to <email>"         → Email worked
- "❌ Failed to send email: <msg>" → Email failed
- "📌 Development Mode: PIN is"    → Dev display active
- "Password reset tokens table verified" → DB working

# Frontend Network Tab
- Request URL should be: https://ngrok-url/api/v1/...
- Status should be: 200 (or relevant status code)
- Response should include: email, registrationToken, message
```

## Contact Support
If still not working:
1. Collect all logs from both backend and frontend
2. Check VITE_API_URL in frontend/.env
3. Verify EMAIL_USER, EMAIL_PASSWORD are set
4. Run diagnostics: visit /api/v1/diagnostics from mobile
