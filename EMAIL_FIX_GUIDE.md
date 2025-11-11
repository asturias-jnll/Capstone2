# Email Service Connection Timeout Fix - Deployment Guide

## 🔍 Problem Diagnosis

You were experiencing `ETIMEDOUT` errors when trying to send emails from your Render deployment. This happened because:

1. **Port 587 is often blocked** by cloud hosting providers like Render to prevent spam
2. **STARTTLS on port 587** can have firewall restrictions
3. **Missing timeout configurations** caused long-hanging connections

## ✅ What Was Fixed

### 1. Updated Email Service Configuration (`imvcmpc/auth/emailService.js`)
- Added connection timeout settings (30 seconds)
- Enhanced TLS/SSL configuration
- Added connection pooling for better performance
- Improved error logging and diagnostics

### 2. Changed SMTP Port Configuration
- **Old:** Port 587 with STARTTLS (`SMTP_SECURE=false`)
- **New:** Port 465 with SSL/TLS (`SMTP_SECURE=true`)

### 3. Updated Configuration Files
- `imvcmpc/render.env` - Changed to port 465
- `imvcmpc/auth/config.production.js` - Updated defaults
- `render.yaml` - Added SMTP environment variables

## 📋 Deployment Steps for Render

### Option A: Quick Fix (Update Environment Variables)

1. **Go to your Render Dashboard:**
   - Navigate to: https://dashboard.render.com
   - Select your `imvcmpc-api` service

2. **Update Environment Variables:**
   - Go to **Environment** tab
   - Update/Add these variables:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=465
     SMTP_SECURE=true
     SMTP_USER=capstone.imvcmpc.system@gmail.com
     SMTP_PASS=cayl zrwp wfvq uwys
     EMAIL_FROM=IMVCMPC System <capstone.imvcmpc.system@gmail.com>
     RESET_LINK_BASE_URL=https://capstone2-dzwi.onrender.com/logpage/reset-password.html
     ```

3. **Save and Redeploy:**
   - Click **Save Changes**
   - Render will automatically redeploy your service

### Option B: Full Redeploy with Updated Code

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Fix email service connection timeout - use port 465 with SSL"
   git push origin main
   ```

2. **Render will auto-deploy** if you have auto-deploy enabled

3. **Or manually trigger deploy:**
   - Go to Render Dashboard
   - Click **Manual Deploy** → **Deploy latest commit**

## 🔐 Gmail Configuration Checklist

Make sure your Gmail account is properly configured:

### ✅ Required Gmail Settings:

1. **Enable 2-Factor Authentication (2FA)**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password** (if not already done)
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: Mail
   - Select device: Other (Custom name) → "IMVCMPC Production"
   - Copy the 16-character password
   - Use this as `SMTP_PASS` (replace `cayl zrwp wfvq uwys` if needed)

3. **Allow Less Secure App Access** (Legacy)
   - Usually not needed with App Passwords
   - Only if you're using regular password (NOT RECOMMENDED)

## 🧪 Testing the Fix

### 1. Check Render Logs

After deployment, check your logs for this success message:

```
✓ Email service is ready to send messages
  Host: smtp.gmail.com:465
  Secure: true
```

If you see connection errors, check the troubleshooting section below.

### 2. Test Password Reset Email

Try the password reset functionality:
```bash
curl -X POST https://capstone2-dzwi.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@example.com"}'
```

## ⚠️ Alternative Solutions (If Port 465 Still Doesn't Work)

### Solution 1: Use SendGrid (Recommended for Production)

SendGrid offers 100 free emails/day and works reliably with cloud hosting:

1. **Sign up for SendGrid:**
   - https://signup.sendgrid.com/

2. **Get API Key:**
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permission

3. **Update Environment Variables:**
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=apikey
   SMTP_PASS=<your-sendgrid-api-key>
   EMAIL_FROM=noreply@yourdomain.com
   ```

### Solution 2: Use Mailgun

Mailgun offers a free tier suitable for production:

1. **Sign up:** https://signup.mailgun.com/
2. **Get SMTP credentials** from the dashboard
3. **Update config:**
   ```
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=<your-mailgun-smtp-user>
   SMTP_PASS=<your-mailgun-smtp-password>
   ```

### Solution 3: Try Port 2525 (Alternative Gmail Port)

If 465 is still blocked:

```
SMTP_PORT=2525
SMTP_SECURE=false
```

## 🔍 Troubleshooting

### Error: "Connection timeout" persists

**Check:**
1. Gmail App Password is correct and active
2. 2FA is enabled on Gmail account
3. Render's outbound firewall rules (contact Render support)

**Try:**
```bash
# Test SMTP connection from Render shell
openssl s_client -connect smtp.gmail.com:465 -crlf
```

### Error: "Invalid login"

**Solutions:**
- Regenerate Gmail App Password
- Ensure no spaces in the password
- Verify SMTP_USER is the full email address

### Error: "TLS/SSL error"

**Update TLS settings** in `emailService.js`:
```javascript
tls: {
    rejectUnauthorized: false, // Try this temporarily
    minVersion: 'TLSv1.2'
}
```

### Check if ports are open on Render

Add this debug endpoint to test SMTP connectivity:

```javascript
// In your server.js or routes
app.get('/debug/smtp-test', async (req, res) => {
    const net = require('net');
    
    const testPort = (host, port) => {
        return new Promise((resolve) => {
            const socket = net.createConnection(port, host);
            socket.setTimeout(5000);
            
            socket.on('connect', () => {
                socket.end();
                resolve({ port, status: 'open' });
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                resolve({ port, status: 'timeout' });
            });
            
            socket.on('error', (err) => {
                resolve({ port, status: 'blocked', error: err.message });
            });
        });
    };
    
    const results = await Promise.all([
        testPort('smtp.gmail.com', 465),
        testPort('smtp.gmail.com', 587),
        testPort('smtp.gmail.com', 2525)
    ]);
    
    res.json({ results });
});
```

Visit: `https://capstone2-dzwi.onrender.com/debug/smtp-test`

## 📊 Monitoring

Add logging to track email sending:

```javascript
// Already added in the updated emailService.js
console.log('✓ Email service is ready to send messages');
console.log(`  Host: ${config.email.smtp.host}:${config.email.smtp.port}`);
console.log(`  Secure: ${config.email.smtp.secure}`);
```

Check Render logs regularly:
```bash
# View logs
render logs --service imvcmpc-api --tail
```

## 📝 Summary of Changes

| File | Change |
|------|--------|
| `imvcmpc/auth/emailService.js` | Added timeout, TLS, and pool configurations |
| `imvcmpc/render.env` | Changed port from 587 to 465, secure to true |
| `imvcmpc/auth/config.production.js` | Updated default port to 465 |
| `render.yaml` | Added SMTP environment variables |

## 🚀 Next Steps

1. ✅ Deploy the changes to Render
2. ✅ Verify email service starts without errors
3. ✅ Test password reset functionality
4. ✅ Monitor logs for any connection issues
5. 📧 Consider migrating to SendGrid/Mailgun for production reliability

## 💡 Pro Tips

- **Use transactional email service** (SendGrid/Mailgun) for production
- **Monitor email delivery rates** through the provider dashboard
- **Set up SPF, DKIM, and DMARC records** for better deliverability
- **Keep App Passwords secure** - use Render's secret management
- **Test email service on every deployment**

## 📞 Need Help?

If issues persist:
1. Check Render logs: `Dashboard → Service → Logs`
2. Contact Render support about outbound SMTP restrictions
3. Consider switching to a dedicated email service provider
4. Review Gmail security settings

---

**Last Updated:** November 11, 2025  
**Status:** Ready for deployment ✅


