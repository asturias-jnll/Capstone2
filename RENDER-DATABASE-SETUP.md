# Render Database Setup Guide

## Import Complete Schema to Render PostgreSQL

Your Render database is missing tables like `change_requests` and possibly others. Here's how to import the complete schema:

### Option 1: Using Render Dashboard (Recommended)

1. **Get your database connection string from Render:**
   - Go to your Render dashboard
   - Click on your PostgreSQL database service
   - Copy the **External Database URL** (not Internal)
   - It looks like: `postgresql://user:password@host/database`

2. **Import schema using psql from your local terminal:**
   ```powershell
   # Navigate to your project directory
   cd C:\Users\HP\Documents\SCHOOL\Capstone2\imvcmpc\auth

   # Import the schema (replace YOUR_EXTERNAL_DB_URL with the actual URL)
   psql "YOUR_EXTERNAL_DB_URL" -f schema.sql
   ```

   Example:
   ```powershell
   psql "postgresql://imvcmpc_user:abc123xyz@dpg-xyz.oregon-postgres.render.com/imvcmpc_db" -f schema.sql
   ```

3. **Verify the import:**
   ```powershell
   # Connect to the database
   psql "YOUR_EXTERNAL_DB_URL"

   # List all tables
   \dt

   # Check if change_requests table exists
   SELECT COUNT(*) FROM change_requests;

   # Exit
   \q
   ```

### Option 2: Using Render Shell (If psql not available locally)

1. Go to Render Dashboard
2. Click on your Web Service (not the database)
3. Click on **Shell** tab
4. Run these commands:
   ```bash
   # The schema.sql should be in your app directory
   psql $DATABASE_URL -f schema.sql

   # Verify
   psql $DATABASE_URL -c "\dt"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM change_requests;"
   ```

### What Tables Should Exist

After importing, you should have these tables:
- `branches`
- `roles`
- `permissions`
- `role_permissions`
- `users`
- `user_sessions`
- `audit_logs`
- `password_reset_tokens`
- `members`
- `savings`
- `disbursements`
- `ibaan_transactions`
- `bauan_transactions`
- `sanjose_transactions`
- `rosario_transactions`
- `sanjuan_transactions`
- `padregarcia_transactions`
- `lipacity_transactions`
- `batangascity_transactions`
- `mabinilipa_transactions`
- `calamias_transactions`
- `lemery_transactions`
- `mataasnakahoy_transactions`
- `tanauan_transactions`
- **`change_requests`** ← This is the missing table causing errors

### Important Notes

- The schema.sql file has `CREATE TABLE IF NOT EXISTS`, so it won't overwrite existing tables
- This will only create missing tables and indexes
- Your existing data in `users`, `roles`, etc. will not be affected
- After import, the `change_requests` errors should disappear

### Expected Result

After importing, when you check the Render logs, you should no longer see:
```
Error fetching change request count: error: relation "change_requests" does not exist
```

## Next Steps After Database Import

Once the database is complete:
1. Test the dashboard and analytics pages - they should load data
2. Test filters and buttons functionality
3. If buttons still don't work, we'll need to clear browser cache or check for JavaScript errors

