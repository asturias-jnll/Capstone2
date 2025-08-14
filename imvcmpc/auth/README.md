# IMVCMPC Authentication System

A robust, role-based authentication system for the IMVCMPC Financial Management System with multi-criteria decision analysis AI

## 🚀 Features

- **JWT-based Authentication** with access and refresh tokens
- **Role-Based Access Control (RBAC)** with granular permissions
- **Multi-Branch Support** with branch-specific access control
- **Security Features**:
  - Password strength validation
  - Account lockout after failed attempts
  - Rate limiting
  - Audit logging
  - Secure password hashing with bcrypt
- **User Management** for IT Head role
- **Database Integration** with PostgreSQL

## 🏗️ System Architecture

### User Roles

1. **Marketing Clerk**
   - Branch-specific access (or all branches if main branch)
   - Member data management
   - Basic reports and notifications

2. **Finance Officer**
   - Financial data management
   - Advanced reports and MCDA analysis
   - Budget management
   - Access to all branches if main branch

3. **IT Head**
   - Full system access
   - User management
   - System configuration
   - All permissions

### Branch Access Control

- **Main Branch Users**: Can access data from all branches
- **Branch Users**: Can only access their assigned branch data
- **IT Head**: Full access to all branches

## 📋 Prerequisites

- Node.js 16+ and npm 8+
- PostgreSQL 12+
- Git

## 🛠️ Installation

### 1. Clone and Setup

```bash
cd imvcmpc/auth
npm install
```

### 2. Environment Configuration

Copy the environment example file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=imvcmc_fms
DB_USER=postgres
DB_PASSWORD=your-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Database Setup

Run the database setup script:

```bash
npm run setup-db
```

This will:
- Create the database if it doesn't exist
- Execute the schema
- Create sample users for testing

### 4. Start the Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The service will start on port 3001 (or the port specified in your .env file).

## 🔐 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/register` | User registration | Yes (IT Head) |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/auth/profile` | Get user profile | Yes |

### User Management (IT Head Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/users` | Get all users |
| PUT | `/api/auth/users/:id` | Update user |
| DELETE | `/api/auth/users/:id` | Delete user |

### System Information

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/branches` | Get all branches |
| GET | `/api/auth/roles` | Get all roles |
| GET | `/api/auth/roles/:id/permissions` | Get role permissions |
| GET | `/health` | Service health check |

## 🔑 Sample Users

After running the setup script, you'll have these test users:

### Marketing Clerk
- **Username**: `marketing.clerk`
- **Password**: `Clerk123!`
- **Access**: All branches (main branch user)

### Finance Officer
- **Username**: `finance.officer`
- **Password**: `Finance123!`
- **Access**: All branches (main branch user)

### IT Head
- **Username**: `it.head`
- **Password**: `ITHead123!`
- **Access**: Full system access

## 📊 Database Schema

The system includes these main tables:

- **users**: User accounts and authentication
- **roles**: User roles (Marketing Clerk, Finance Officer, IT Head)
- **permissions**: Granular permissions for each role
- **role_permissions**: Junction table linking roles and permissions
- **branches**: Cooperative branches (12 total)
- **user_sessions**: JWT refresh token management
- **audit_logs**: System activity logging

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

### Account Protection
- Maximum 5 failed login attempts
- 15-minute lockout period
- Rate limiting on API endpoints

### Token Security
- JWT tokens with configurable expiration
- Refresh token rotation
- Secure token storage

## 🚀 Usage Examples

### 1. User Login

```javascript
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'marketing.clerk',
        password: 'Clerk123!'
    })
});

const { access_token, refresh_token, user } = await response.json();
```

### 2. Authenticated Request

```javascript
const response = await fetch('/api/auth/profile', {
    headers: {
        'Authorization': `Bearer ${access_token}`
    }
});
```

### 3. Token Refresh

```javascript
const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        refresh_token: refresh_token
    })
});

const { access_token: newAccessToken } = await response.json();
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📝 Development

### Project Structure

```
auth/
├── config.js          # Configuration settings
├── database.js        # Database connection and utilities
├── jwt.js            # JWT token management
├── middleware.js     # Authentication middleware
├── authService.js    # Business logic for authentication
├── routes.js         # API route definitions
├── server.js         # Express server setup
├── schema.sql        # Database schema
├── setup-database.js # Database initialization script
└── package.json      # Dependencies and scripts
```

### Adding New Permissions

1. Add permission to `schema.sql`
2. Update role permissions in `schema.sql`
3. Add permission check in your routes using `checkPermission('permission_name')`

### Adding New Roles

1. Add role to `schema.sql`
2. Define permissions for the role
3. Update `config.js` with role information

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**:
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET`
   - Configure `ALLOWED_ORIGINS`

2. **Database**:
   - Use production PostgreSQL instance
   - Configure connection pooling
   - Set up regular backups

3. **Security**:
   - Enable HTTPS
   - Configure firewall rules
   - Set up monitoring and logging

4. **Scaling**:
   - Use PM2 or similar process manager
   - Consider load balancing for multiple instances
   - Implement Redis for session storage

## 📞 Support

For issues and questions:

1. Check the logs for error details
2. Verify database connectivity
3. Ensure all environment variables are set
4. Check that the database schema is properly initialized

## 🔄 Version History

- **v1.0.0**: Initial release with basic authentication and RBAC
- Features: JWT auth, role-based access, multi-branch support, audit logging

## 📄 License

MIT License - see LICENSE file for details.

---

**Built for IMVCMPC Financial Management System** 🏦
