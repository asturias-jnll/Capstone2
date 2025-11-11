# Deploy MailerSend API - Quick Guide

## What Changed

✅ **mailersend package installed**
✅ **emailService.js updated** to use MailerSend API (primary) with SMTP fallback
✅ Automatically detects if API token is available

## How It Works

1. **If `MAILERSEND_API_TOKEN` is set** → Uses API (HTTPS, port 443 - never blocked)
2. **If not set** → Falls back to SMTP (may be blocked on Render)

---

## Step 1: Get MailerSend API Token (5 minutes)

### 1. Go to MailerSend Dashboard
- Login at: https://app.mailersend.com/

### 2. Get API Token
- Click your profile (top right) → **API Tokens**
- Or go directly to: https://app.mailersend.com/api-tokens

### 3. Create New Token
- Click **"Create Token"**
- **Name:** `IMVCMPC Production`
- **Scopes:** Select **"Email Send"** (minimum needed)
- Click **"Create"**

### 4. Copy Token
- Copy the token immediately (starts with `mlsnd_`)
- ⚠️ **You won't be able to see it again!**
- Example: `mlsnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2: Add Token to Render (3 minutes)

### 1. Go to Render Dashboard
- https://dashboard.render.com
- Select your `imvcmpc-api` service

### 2. Go to Environment Tab
- Click **"Environment"** in the left sidebar

### 3. Add New Variable
- Click **"Add Environment Variable"**
- **Key:** `MAILERSEND_API_TOKEN`
- **Value:** Paste your token (starts with `mlsnd_`)
- Click **"Save Changes"**

### 4. Render Will Auto-Redeploy
- Wait 2-3 minutes for deployment
- Check logs for success message

---

## Step 3: Deploy Updated Code (5 minutes)

### Commit and Push Changes

```bash
git add .
git commit -m "Add MailerSend API support for email service"
git push origin main
```

Render will auto-deploy when it detects the push.

---

## Step 4: Verify It's Working

### Check Render Logs

After deployment, you should see:

```
✓ MailerSend API initialized successfully
  Using API (HTTPS) - works on all cloud providers
```

Instead of:
```
❌ Connection timeout (SMTP errors)
```

### Test Email

1. Go to your app: https://imvcmpc.org (or Render URL)
2. Try password reset
3. Check MailerSend Activity: https://app.mailersend.com/activity

---

## What You Get

| Before (SMTP) | After (API) |
|---------------|-------------|
| ❌ Connection timeout | ✅ Instant delivery |
| ❌ Blocked ports 465, 587 | ✅ Uses HTTPS (port 443) |
| ❌ Unreliable on cloud | ✅ Works everywhere |
| ⏱️ Slower | ⚡ Faster |
| ❌ No delivery tracking | ✅ Full analytics |

---

## Troubleshooting

### Error: "MAILERSEND_API_TOKEN not set"
- ✅ Add token to Render Environment variables
- ✅ Wait for redeploy
- ✅ Check logs again

### Error: "API authentication failed"
- ✅ Token might be invalid
- ✅ Regenerate token in MailerSend dashboard
- ✅ Update Render environment variable

### Emails not arriving
- ✅ Check MailerSend Activity Feed: https://app.mailersend.com/activity
- ✅ Check spam folder
- ✅ Verify sender domain in MailerSend

### Want to test locally?
Add to your local `.env`:
```
MAILERSEND_API_TOKEN=mlsnd_your_token_here
```

---

## Quick Deployment Checklist

- [ ] MailerSend API token created
- [ ] Token copied (starts with `mlsnd_`)
- [ ] Token added to Render environment variables
- [ ] Code committed and pushed to git
- [ ] Render auto-deployed (wait 2-3 minutes)
- [ ] Logs show "✓ MailerSend API initialized"
- [ ] Test password reset email
- [ ] Check MailerSend Activity Feed

---

## Summary

**Old flow (SMTP - blocked):**
Your App → Port 587/465 → ❌ BLOCKED → MailerSend SMTP

**New flow (API - works):**
Your App → HTTPS (port 443) → ✅ WORKS → MailerSend API → Email delivered

---

## Need Help?

- MailerSend API Docs: https://developers.mailersend.com/
- MailerSend Support: support@mailersend.com
- Check Activity Feed: https://app.mailersend.com/activity

---

**Estimated total time:** 10-15 minutes
**Difficulty:** Easy ✅

