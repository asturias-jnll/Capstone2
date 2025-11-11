# Custom Domain Setup Guide - imvcmpc.org

## Environment Variables to Update

### ✅ Already Updated in Code:

1. **ALLOWED_ORIGINS** (for CORS):
   ```
   ALLOWED_ORIGINS=https://imvcmpc.org,https://www.imvcmpc.org,https://capstone2-dzwi.onrender.com
   ```
   - Allows API calls from your custom domain
   - Keeps Render subdomain as fallback

2. **EMAIL_FROM** (professional sender):
   ```
   EMAIL_FROM=IMVCMPC System <noreply@imvcmpc.org>
   ```
   - Uses your custom domain (more professional)
   - Better email deliverability
   - Members trust emails from @imvcmpc.org

3. **RESET_LINK_BASE_URL** (password reset links):
   ```
   RESET_LINK_BASE_URL=https://imvcmpc.org/logpage/reset-password.html
   ```
   - Password reset emails will link to your domain

---

## Step 1: Check if Domain is Added to Render

### Check Current Setup:

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Select your `imvcmpc-api` service

2. **Click "Settings" → scroll to "Custom Domain":**
   - If you see `imvcmpc.org` listed → **Already added** ✅
   - If empty → **Need to add it** (see Step 2)

---

## Step 2: Add Custom Domain to Render (If Not Added Yet)

### Add Domain:

1. **In Render Dashboard → Your Service → Settings:**
   - Scroll to **"Custom Domain"** section
   - Click **"Add Custom Domain"**

2. **Enter your domain:**
   - Add: `imvcmpc.org`
   - Add: `www.imvcmpc.org` (optional but recommended)
   - Click **"Save"**

3. **Render will show DNS instructions:**
   - You'll see CNAME or A record values
   - Keep this page open for next step

---

## Step 3: Configure DNS at Your Domain Registrar

### Where to Add DNS Records:

Go to your domain registrar (where you bought imvcmpc.org):
- **Namecheap:** https://namecheap.com → Domain List → Manage → Advanced DNS
- **GoDaddy:** DNS Settings
- **Google Domains:** DNS → Custom records
- **Others:** Look for "DNS Management" or "DNS Settings"

### DNS Records to Add:

Render will provide specific values, but typically:

#### For root domain (imvcmpc.org):

**Option A: CNAME Record (if supported):**
```
Type: CNAME
Name: @
Value: [Render provides this, e.g., cname.render.com]
TTL: Automatic or 3600
```

**Option B: A Record (more common):**
```
Type: A
Name: @
Value: [Render provides this, e.g., 216.24.57.1]
TTL: Automatic or 3600
```

#### For www subdomain (www.imvcmpc.org):

```
Type: CNAME
Name: www
Value: [Render provides this, same as above]
TTL: Automatic or 3600
```

### Important Notes:
- ⚠️ **Remove existing A/CNAME records** for @ and www before adding new ones
- ⏱️ **DNS propagation takes 5-60 minutes** (sometimes up to 24 hours)
- 🔄 **Don't remove Render's onrender.com URL** - keep it as backup

---

## Step 4: Update Render Environment Variables

After adding the domain, update these in Render Dashboard:

1. **Go to Environment tab**

2. **Add/Update these variables:**
   ```
   ALLOWED_ORIGINS=https://imvcmpc.org,https://www.imvcmpc.org,https://capstone2-dzwi.onrender.com
   EMAIL_FROM=IMVCMPC System <noreply@imvcmpc.org>
   RESET_LINK_BASE_URL=https://imvcmpc.org/logpage/reset-password.html
   ```

3. **Click "Save Changes"**
   - Render will redeploy automatically

---

## Step 5: Verify MailerSend Sender (IMPORTANT!)

Since you're changing EMAIL_FROM to `noreply@imvcmpc.org`, you need to verify this in MailerSend:

### Verify in MailerSend:

1. **Go to MailerSend Dashboard:**
   - https://app.mailersend.com/domains

2. **Check if imvcmpc.org is verified:**
   - Look for your domain in the list
   - Status should be "Verified" ✅

3. **If not verified yet:**

   **Option A: Domain Verification (Recommended)**
   - Click "Add Domain" → Enter `imvcmpc.org`
   - MailerSend will show DNS records (TXT, CNAME)
   - Add these to your domain registrar (same place as Step 3)
   - Wait 5-30 minutes
   - Click "Verify Domain" in MailerSend

   **Option B: Email Verification (Quicker)**
   - Go to "Email Verification"
   - Add `noreply@imvcmpc.org`
   - You won't receive verification email (it's a noreply address)
   - Use `capstone.imvcmpc.system@gmail.com` instead for now
   - Keep `EMAIL_FROM=IMVCMPC System <capstone.imvcmpc.system@gmail.com>` for now

---

## Step 6: Test Your Setup

### After DNS Propagation (5-60 minutes):

1. **Test domain access:**
   ```bash
   # Check if domain points to Render
   nslookup imvcmpc.org
   ```
   Or visit: https://imvcmpc.org

2. **Test CORS (API calls):**
   - Go to: https://imvcmpc.org/logpage/login.html
   - Try logging in
   - Should work without CORS errors

3. **Test Email:**
   - Try password reset from your domain
   - Check MailerSend Activity Feed
   - Emails should come from @imvcmpc.org (if verified)

---

## Quick Decision Tree

### Do you need to update Render NOW?

**If domain is NOT added to Render yet:**
- ⏸️ **WAIT** - Keep current config with Render subdomain
- Add domain to Render first (Step 2)
- Configure DNS (Step 3)
- Wait for DNS propagation
- Then update environment variables (Step 4)

**If domain IS already added to Render:**
- ✅ **UPDATE NOW** - Update environment variables immediately:
  ```
  ALLOWED_ORIGINS=https://imvcmpc.org,https://www.imvcmpc.org,https://capstone2-dzwi.onrender.com
  EMAIL_FROM=IMVCMPC System <noreply@imvcmpc.org>
  RESET_LINK_BASE_URL=https://imvcmpc.org/logpage/reset-password.html
  ```

---

## What Changes Were Made to Your Code

### render.env (updated):
```bash
# Before:
ALLOWED_ORIGINS=https://capstone2-dzwi.onrender.com
EMAIL_FROM=IMVCMPC System <capstone.imvcmpc.system@gmail.com>
RESET_LINK_BASE_URL=https://capstone2-dzwi.onrender.com/logpage/reset-password.html

# After:
ALLOWED_ORIGINS=https://imvcmpc.org,https://www.imvcmpc.org,https://capstone2-dzwi.onrender.com
EMAIL_FROM=IMVCMPC System <noreply@imvcmpc.org>
RESET_LINK_BASE_URL=https://imvcmpc.org/logpage/reset-password.html
```

**Why these changes:**
- **ALLOWED_ORIGINS:** Allows API calls from both domains (keeps Render URL as backup)
- **EMAIL_FROM:** Professional email sender (builds trust)
- **RESET_LINK_BASE_URL:** Password reset links use your domain

---

## Troubleshooting

### Domain not loading (after 1 hour):
- Check DNS records in your registrar
- Verify A/CNAME records match Render's instructions
- Try: https://dnschecker.org/#A/imvcmpc.org

### CORS errors when accessing from imvcmpc.org:
- Verify `ALLOWED_ORIGINS` includes your domain
- Check for typos (https vs http)
- Clear browser cache

### Emails not sending from @imvcmpc.org:
- Verify domain in MailerSend dashboard
- Check MailerSend DNS records are added
- Temporarily use Gmail address while waiting for verification

### SSL/HTTPS not working:
- Render provides free SSL automatically
- Wait 5-10 minutes after domain is added
- SSL certificate is auto-generated

---

## Summary Checklist

- [ ] Check if domain is added to Render Dashboard
- [ ] If not, add domain to Render (Settings → Custom Domain)
- [ ] Add DNS records at your domain registrar
- [ ] Wait for DNS propagation (5-60 minutes)
- [ ] Verify domain in MailerSend (for email sender)
- [ ] Update Render environment variables (3 variables)
- [ ] Test domain access: https://imvcmpc.org
- [ ] Test login/API calls from custom domain
- [ ] Test password reset email

---

**Need Help?** 
- Render Docs: https://render.com/docs/custom-domains
- MailerSend Domain Verification: https://www.mailersend.com/help/how-to-verify-a-domain
- DNS Checker: https://dnschecker.org/

