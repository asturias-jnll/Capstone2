# Manual Render Deployment Steps

Since the Blueprint is having configuration issues, let's deploy manually:

## Step 1: Create PostgreSQL Database

1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `imvcmpc-database`
   - **Database Name**: `imvcmpc_fms`
   - **User**: `imvcmpc_user` (or leave default)
   - **Plan**: Starter (Free)
4. Click "Create Database"
5. **Save the connection details** (you'll need them)

## Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `asturias-jnll/Capstone2`
3. Configure:
   - **Name**: `imvcmpc-api`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./imvcmpc/Dockerfile.render`
   - **Docker Context**: `./imvcmpc`
   - **Plan**: Starter (Free)

## Step 3: Set Environment Variables

In your web service settings, add these environment variables:

```
NODE_ENV=production
DB_HOST=<your-database-host>
DB_PORT=5432
DB_NAME=imvcmpc_fms
DB_USER=<your-database-user>
DB_PASSWORD=<your-database-password>
JWT_SECRET=<generate-random-32-char-string>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15
SESSION_TIMEOUT=30
ALLOWED_ORIGINS=https://your-service-name.onrender.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Check logs for any issues

## Step 5: Import Database Schema

1. Connect to your database using the connection string
2. Run your schema: `psql "connection-string" -f imvcmpc/auth/schema.sql`
3. Import your data using the migration script

This manual approach should work without the Blueprint configuration issues.
