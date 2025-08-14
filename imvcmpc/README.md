# IMVCMPC Financial Management System

A comprehensive financial management system with multi-criteria decision analysis AI for cooperatives with multiple branches.

## 🏗️ **System Architecture**

### **Frontend Structure**
```
imvcmpc/
├── logpage/                    # Authentication pages
│   ├── login.html             # Login interface
│   ├── login.css              # Login styling
│   ├── login.js               # Login logic & API integration
│   ├── logout.html            # Logout confirmation
│   ├── logout.css             # Logout styling
│   └── logout.js              # Logout logic
├── marketingclerk/            # Marketing Clerk Dashboard
│   ├── html/                  # HTML pages
│   ├── css/                   # Styling files
│   └── js/                    # JavaScript functionality
├── financeofficer/            # Finance Officer Dashboard
│   ├── html/                  # HTML pages
│   ├── css/                   # Styling files
│   └── js/                    # JavaScript functionality
├── ithead/                    # IT Head Dashboard
│   ├── html/                  # HTML pages
│   ├── css/                   # Styling files
│   └── js/                    # JavaScript functionality
└── auth/                      # Backend Authentication Service
    ├── server.js              # Express server
    ├── routes.js              # API endpoints
    ├── authService.js         # Business logic
    ├── middleware.js          # Authentication middleware
    ├── database.js            # Database connection
    ├── jwt.js                 # JWT management
    ├── config.js              # Configuration
    ├── schema.sql             # Database schema
    ├── setup-database.js      # Database setup script
    └── package.json           # Dependencies
```

## 👥 **User Roles & Access**

### **1. Marketing Clerk**
- **Access**: Branch-specific (main branch users can access all branches)
- **Features**: Member data management, analytics, reports, notifications
- **Dashboard**: `../marketingclerk/html/main.html`

### **2. Finance Officer**
- **Access**: Branch-specific (main branch users can access all branches)
- **Features**: Financial data, MCDA analysis, budget management, reports
- **Dashboard**: `../financeofficer/html/main.html`

### **3. IT Head**
- **Access**: System-wide (all branches and system administration)
- **Features**: User management, system configuration, security, logs, backup
- **Dashboard**: `../ithead/html/main.html`

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Modern web browser

### **1. Database Setup**
```bash
cd imvcmpc/auth
npm install
npm run setup-db
```

### **2. Start Authentication Service**
```bash
cd imvcmpc/auth
npm run dev
```

### **3. Access the System**
- **Login Page**: Open `logpage/login.html` in your browser
- **Service Health**: `http://localhost:3001/health`

## 🔐 **Sample Users for Testing**

### **Marketing Clerk**
- Username: `marketing.clerk`
- Password: `Clerk123!`

### **Finance Officer**
- Username: `finance.officer`
- Password: `Finance123!`

### **IT Head**
- Username: `it.head`
- Password: `ITHead123!`

## 🌐 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/change-password` - Change password

### **User Management (IT Head Only)**
- `GET /api/auth/users` - List all users
- `POST /api/auth/register` - Create new user
- `PUT /api/auth/users/:userId` - Update user
- `DELETE /api/auth/users/:userId` - Delete user

### **System Information**
- `GET /api/auth/branches` - List all branches
- `GET /api/auth/roles` - List all roles
- `GET /api/auth/roles/:roleId/permissions` - Get role permissions

## 🔧 **Configuration**

### **Environment Variables**
Copy `env.example` to `.env` and configure:
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=imvcmpc_fms
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

### **Database Configuration**
- **Host**: Local PostgreSQL server
- **Database**: `imvcmpc_fms`
- **Schema**: Automatically created by setup script

## 🎨 **Frontend Features**

### **Responsive Design**
- Mobile-first approach
- Modern UI with smooth animations
- Consistent color scheme across all dashboards

### **Navigation**
- Sidebar navigation with role-specific menus
- Breadcrumb navigation
- Active state indicators

### **User Experience**
- Real-time date/time display
- Loading states and error handling
- Session management and timeout warnings

## 🔒 **Security Features**

### **Authentication**
- JWT-based authentication
- Access and refresh tokens
- Password hashing with bcrypt

### **Authorization**
- Role-based access control (RBAC)
- Branch-specific permissions
- Granular permission system

### **Security Measures**
- Rate limiting
- Account lockout after failed attempts
- Audit logging
- CORS protection
- Helmet security headers

## 📱 **Browser Compatibility**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Endpoint not found" error**
   - Ensure authentication service is running on port 3001
   - Check if `npm run dev` is executed

2. **Database connection failed**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Run `npm run setup-db` to recreate database

3. **Login parameter type error**
   - Database schema may be corrupted
   - Run `npm run setup-db` to reset database

### **Logs**
- Check console for JavaScript errors
- Monitor authentication service logs
- Review database connection status

## 🔄 **Development Workflow**

1. **Make changes** to frontend files
2. **Refresh browser** to see changes
3. **Restart service** for backend changes: `npm run dev`
4. **Test login** with different user roles
5. **Verify redirections** to correct dashboards

## 📚 **Next Steps**

- Implement MCDA analysis algorithms
- Add financial data management
- Create comprehensive reporting system
- Implement real-time notifications
- Add data export/import functionality

## 🤝 **Support**

For technical support or questions:
- Check the authentication service logs
- Verify database connectivity
- Ensure all dependencies are installed
- Review browser console for errors

---

**Version**: 1.0.0  
**Last Updated**: August 2024  
**Status**: Phase 1 Complete - Authentication & Role-Based Access Control
