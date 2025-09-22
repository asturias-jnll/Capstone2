const express = require('express');
const authService = require('./authService');
const { authenticateToken, checkPermission, checkRole, loginRateLimit, auditLog } = require('./middleware');
const transactionRoutes = require('./transactionRoutes');

const router = express.Router();

// User registration (IT Head only)
router.post('/register', 
    authenticateToken, 
    checkRole('it_head'), 
    auditLog('user_registration', 'users'),
    async (req, res) => {
        try {
            const result = await authService.registerUser(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// User login
router.post('/login', 
    loginRateLimit,
    auditLog('user_login', 'auth'),
    async (req, res) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username and password are required'
                });
            }

            const deviceInfo = req.get('User-Agent');
            const ipAddress = req.ip || req.connection.remoteAddress;

            const result = await authService.loginUser(username, password, deviceInfo, ipAddress);
            res.json(result);

        } catch (error) {
            res.status(401).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Refresh access token
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        
        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const result = await authService.refreshAccessToken(refresh_token);
        res.json(result);

    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
});

// User logout
router.post('/logout', 
    authenticateToken,
    auditLog('user_logout', 'auth'),
    async (req, res) => {
        try {
            const { refresh_token } = req.body;
            
            if (!refresh_token) {
                return res.status(400).json({
                    success: false,
                    error: 'Refresh token is required'
                });
            }

            const result = await authService.logoutUser(req.user.id, refresh_token);
            res.json(result);

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get current user profile
router.get('/profile', 
    authenticateToken,
    async (req, res) => {
        try {
            const user = await authService.getUserWithDetails(req.user.id);
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role_name,
                    role_display_name: user.role_display_name,
                    branch_id: user.branch_id,
                    branch_name: user.branch_name,
                    branch_location: user.branch_location,
                    is_main_branch_user: user.is_main_branch_user,
                    permissions: user.permissions,
                    employee_id: user.employee_id,
                    phone_number: user.phone_number,
                    last_login: user.last_login,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Change password
router.post('/change-password',
    authenticateToken,
    auditLog('password_change', 'users'),
    async (req, res) => {
        try {
            const { current_password, new_password } = req.body;
            
            if (!current_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password and new password are required'
                });
            }

            const result = await authService.changePassword(req.user.id, current_password, new_password);
            res.json(result);

        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get all users (IT Head only)
router.get('/users',
    authenticateToken,
    checkRole('it_head'),
    async (req, res) => {
        try {
            const users = await authService.getAllUsers();
            res.json({
                success: true,
                users: users
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Update user (IT Head only)
router.put('/users/:userId',
    authenticateToken,
    checkRole('it_head'),
    auditLog('user_update', 'users'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await authService.updateUser(userId, req.body);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Delete user (IT Head only)
router.delete('/users/:userId',
    authenticateToken,
    checkRole('it_head'),
    auditLog('user_deletion', 'users'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await authService.deleteUser(userId);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get all branches
router.get('/branches',
    authenticateToken,
    async (req, res) => {
        try {
            const db = require('./database');
            const result = await db.query(`
                SELECT id, name, location, is_main_branch, address, contact_number, email, manager_name
                FROM branches
                ORDER BY id
            `);
            
            res.json({
                success: true,
                branches: result.rows
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get all roles
router.get('/roles',
    authenticateToken,
    async (req, res) => {
        try {
            const db = require('./database');
            const result = await db.query(`
                SELECT id, name, display_name, description
                FROM roles
                ORDER BY id
            `);
            
            res.json({
                success: true,
                roles: result.rows
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get role permissions
router.get('/roles/:roleId/permissions',
    authenticateToken,
    async (req, res) => {
        try {
            const { roleId } = req.params;
            const db = require('./database');
            const result = await db.query(`
                SELECT p.id, p.name, p.display_name, p.description, p.resource, p.action
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = $1
                ORDER BY p.id
            `, [roleId]);
            
            res.json({
                success: true,
                permissions: result.rows
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Transaction routes
router.use('/transactions', transactionRoutes);

// Analytics routes
const analyticsRoutes = require('./analyticsRoutes');
router.use('/analytics', analyticsRoutes);


// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const db = require('./database');
        await db.testConnection();
        
        res.json({
            success: true,
            message: 'Authentication service is healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Authentication service is unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

module.exports = router;
