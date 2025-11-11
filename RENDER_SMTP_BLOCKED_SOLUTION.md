# Render SMTP Ports Blocked - Solutions

## Problem
Render is blocking outbound SMTP connections on both ports:
- Port 587 (STARTTLS) - Connection timeout
- Port 465 (SSL/TLS) - Connection timeout

This is common with cloud providers to prevent spam.

---

## Solution 1: Contact Render Support (Quickest)

Ask Render to allow SMTP or confirm which ports are available.

### Email Render Support:
**To:** support@render.com

**Subject:** SMTP Ports Blocked - Need Email Service

**Message:**
```
Hi Render Team,

I'm experiencing connection timeouts when trying to connect to MailerSend SMTP servers:
- smtp.mailersend.net:587 (STARTTLS) - ETIMEDOUT
- smtp.mailersend.net:465 (SSL/TLS) - ETIMEDOUT

Service: imvcmpc-api
Plan: Starter

Questions:
1. Are outbound SMTP connections blocked on the Starter plan?
2. Which SMTP ports (if any) are allowed?
3. Do you recommend using email service APIs instead of SMTP?

My MailerSend credentials are correct and work locally.

Thank you!
```

**Response time:** Usually within 24 hours

---

## Solution 2: Use MailerSend API (Guaranteed to Work)

Switch from SMTP to MailerSend API (uses HTTPS port 443, never blocked).

### Step 1: Get MailerSend API Token

1. **Go to MailerSend Dashboard:**
   - https://app.mailersend.com/

2. **Get API Token:**
   - Click your profile → API Tokens
   - Or go to: https://app.mailersend.com/api-tokens
   - Click "Create Token"
   - Name: `IMVCMPC Production`
   - Select scopes: **Email Send** (minimum needed)
   - Copy the token (starts with `mlsnd_`)

### Step 2: Install MailerSend Package

```bash
cd imvcmpc/auth
npm install mailersend
```

### Step 3: Add Environment Variable in Render

1. Go to Render Dashboard → Your service → Environment
2. Add new variable:
   ```
   MAILERSEND_API_TOKEN=mlsnd_your_actual_token_here
   ```
3. Save changes (Render will redeploy)

### Step 4: Update Code

I'll provide the updated `emailService.js` file that automatically:
- Uses MailerSend API if `MAILERSEND_API_TOKEN` is set
- Falls back to SMTP if token is not set

---

## Solution 3: Use Alternative Email Service

If MailerSend doesn't work, try these (all have APIs that use HTTPS):

### Resend (Recommended - Easiest API)
- **Free tier:** 3,000 emails/month
- **Website:** https://resend.com
- **API:** Simple REST API, works everywhere
- **Package:** `npm install resend`

### SendGrid (Most Reliable)
- **Free tier:** 100 emails/day
- **Website:** https://sendgrid.com
- **API:** Works on all cloud platforms
- **Package:** `npm install @sendgrid/mail`

### Postmark (Best Deliverability)
- **Free tier:** 100 emails/month
- **Website:** https://postmarkapp.com
- **API:** Fast and reliable
- **Package:** `npm install postmark`

---

## Comparison

| Service | Free Tier | API Support | SMTP Support | Best For |
|---------|-----------|-------------|--------------|----------|
| MailerSend | 12,000/month | ✅ Yes | ⚠️ Blocked | High volume |
| Resend | 3,000/month | ✅ Yes | ⚠️ Blocked | Simplicity |
| SendGrid | 100/day | ✅ Yes | ⚠️ Blocked | Reliability |
| Postmark | 100/month | ✅ Yes | ⚠️ Blocked | Deliverability |

**All SMTP ports are likely blocked on Render. Use APIs instead.**

---

## Quick Decision Tree

### Do you need emails working TODAY?
- **YES** → Use Solution 2 (MailerSend API)
- **NO** → Try Solution 1 (Contact Render first)

### Are you comfortable with code changes?
- **YES** → Switch to MailerSend API (30 minutes)
- **NO** → Contact Render support and wait

### Want the simplest solution?
- Use **Resend** (easiest API, great documentation)

---

## Recommended: MailerSend API

Since you already have MailerSend configured, switching to their API is the easiest:

### Advantages:
✅ Same account, same dashboard
✅ Uses HTTPS (port 443) - never blocked
✅ Faster than SMTP
✅ Better error messages
✅ 12,000 free emails/month (vs 100/day SendGrid)

### What you need:
1. MailerSend API token (get from dashboard)
2. Install `npm install mailersend` in auth folder
3. Add `MAILERSEND_API_TOKEN` to Render environment
4. Update `emailService.js` (I can provide the code)

---

## Current Status

### What's working:
✅ MailerSend account setup
✅ Domain verified in MailerSend
✅ SMTP credentials correct
✅ Code configuration correct

### What's NOT working:
❌ Render blocks port 587 (STARTTLS)
❌ Render blocks port 465 (SSL/TLS)
❌ Can't send emails via SMTP

### Solution:
Use MailerSend API instead of SMTP

---

## Next Steps

**Choose ONE:**

1. **Quick (30 min):** Switch to MailerSend API
   - Get API token from MailerSend
   - Add to Render environment
   - I'll provide updated code

2. **Wait (24-48 hours):** Contact Render support
   - Send email to support@render.com
   - Ask about SMTP restrictions
   - They may allow it or suggest alternatives

3. **Alternative (60 min):** Switch to Resend
   - Sign up at resend.com
   - Simpler API than MailerSend
   - 3,000 free emails/month

---

## My Recommendation

**Use MailerSend API** because:
1. You already have MailerSend setup
2. Works immediately (no waiting for support)
3. 12,000 free emails/month
4. Simple code change
5. Guaranteed to work on Render

Let me know if you want to proceed with the MailerSend API and I'll provide the updated code!

