# 🚀 Render Deployment Quick Checklist

## ⚡ Quick Fix Steps (5 minutes)

### Step 1: Update Environment Variables in Render

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Select your service: **`imvcmpc-api`**
3. Click **Environment** tab
4. Add/Update these variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=capstone.imvcmpc.system@gmail.com
SMTP_PASS=cayl zrwp wfvq uwys
EMAIL_FROM=IMVCMPC System <capstone.imvcmpc.system@gmail.com>
RESET_LINK_BASE_URL=https://capstone2-dzwi.onrender.com/logpage/reset-password.html
```

### Step 2: Save and Deploy

1. Click **"Save Changes"** button
2. Render will automatically redeploy (takes 2-3 minutes)
3. Wait for deployment to complete

### Step 3: Verify in Logs

1. Go to **Logs** tab in Render Dashboard
2. Look for this success message:

```
✓ Email service is ready to send messages
  Host: smtp.gmail.com:465
  Secure: true
```

### Step 4: Test Email Service

Test the password reset endpoint:

```bash
curl -X POST https://capstone2-dzwi.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@example.com"}'
```

## ✅ What Changed?

| Setting | Old Value | New Value | Why? |
|---------|-----------|-----------|------|
| SMTP_PORT | 587 | 465 | Port 587 is blocked by Render |
| SMTP_SECURE | false | true | Port 465 requires SSL |
| Timeouts | None | 30 seconds | Prevent hanging connections |

## 🔍 Verification Checklist

- [ ] Environment variables updated in Render
- [ ] Service redeployed successfully
- [ ] Logs show "Email service is ready" message
- [ ] No timeout errors in logs
- [ ] Test email received successfully

## ❌ If Still Not Working

### Option 1: Try Alternative Port

Update in Render Environment:
```env
SMTP_PORT=2525
SMTP_SECURE=false
```

### Option 2: Switch to SendGrid (Recommended)

1. Sign up: https://signup.sendgrid.com/
2. Get API Key from dashboard
3. Update Render Environment:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
```

### Option 3: Contact Render Support

Ask about SMTP restrictions:
- Support: https://render.com/support
- Question: "Are outbound connections to smtp.gmail.com:465 blocked?"

## 📊 Quick Test Commands

### Check if email service initialized:
```bash
# In Render Shell
curl http://localhost:3001/health
```

### Test SMTP port connectivity:
```bash
# In Render Shell  
nc -zv smtp.gmail.com 465
```

### View real-time logs:
```bash
# From local terminal (requires Render CLI)
render logs --service imvcmpc-api --tail
```

## 🎯 Success Indicators

✅ **Logs show:**
```
✓ Email service is ready to send messages
```

✅ **No timeout errors**

✅ **Password reset emails arrive within 30 seconds**

✅ **No authentication errors**

## 📞 Need Help?

1. Check the full guide: `EMAIL_FIX_GUIDE.md`
2. Review Render logs for specific error messages
3. Test locally: `node imvcmpc/auth/test-email.js your-email@example.com`

---

**Last Updated:** November 11, 2025  
**Estimated Time:** 5 minutes  
**Difficulty:** Easy ⭐


