const express = require('express');
const authService = require('./authService');
const { authenticateToken, checkPermission, checkRole, loginRateLimit, auditLog } = require('./middleware');
const transactionRoutes = require('./transactionRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const itHeadAnalyticsRoutes = require('./itHeadAnalyticsRoutes');

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

// Register branch users (Marketing Clerk and Finance Officer) - IT Head only
router.post('/register-branch-users',
    authenticateToken,
    checkRole('it_head'),
    auditLog('add_user', 'users'),
    async (req, res) => {
        try {
            const { marketingClerk, financeOfficer } = req.body;

            if (!marketingClerk || !financeOfficer) {
                return res.status(400).json({
                    success: false,
                    error: 'Both Marketing Clerk and Finance Officer data are required'
                });
            }

            // Validate required fields for both users (email is optional - can be empty)
            const requiredMcFields = ['location', 'username', 'password', 'branch'];
            const requiredFoFields = ['location', 'username', 'password', 'branch'];

            for (const field of requiredMcFields) {
                if (!marketingClerk[field]) {
                    return res.status(400).json({
                        success: false,
                        error: `Missing required Marketing Clerk field: ${field}`
                    });
                }
            }

            for (const field of requiredFoFields) {
                if (!financeOfficer[field]) {
                    return res.status(400).json({
                        success: false,
                        error: `Missing required Finance Officer field: ${field}`
                    });
                }
            }

            const result = await authService.registerBranchUsers(marketingClerk, financeOfficer);
            res.status(201).json(result);

        } catch (error) {
            console.error('Branch users registration error:', error);
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
    auditLog('login', 'users'),
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
            
            // Handle special case: identity-verified deactivated account
            if (!result.success && result.code === 'ACCOUNT_DEACTIVATED' && result.identity_verified) {
                return res.status(401).json(result);
            }
            
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
    auditLog('logout', 'users'),
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

// Get current user info (simplified endpoint for account page)
router.get('/me',
    authenticateToken,
    async (req, res) => {
        try {
            const user = await authService.getUserWithDetails(req.user.id);
            res.json({
                success: true,
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
                employee_id: user.employee_id,
                phone_number: user.phone_number,
                last_profile_update: user.last_profile_update,
                last_password_change: user.last_password_change,
                last_login: user.last_login,
                created_at: user.created_at
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Update profile (personal information)
router.put('/update-profile',
    authenticateToken,
    auditLog('update_profile', 'users'),
    async (req, res) => {
        try {
            const { first_name, last_name, username, email } = req.body;
            
            if (!first_name || !last_name || !username || !email) {
                return res.status(400).json({
                    success: false,
                    error: 'All fields are required: first_name, last_name, username, email'
                });
            }

            const result = await authService.updateProfile(req.user.id, {
                first_name,
                last_name,
                username,
                email
            });
            res.json(result);

        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Change password
router.put('/change-password',
    authenticateToken,
    auditLog('change_password', 'users'),
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
    async (req, res, next) => {
        // Determine action based on is_active status change
        if (req.body.hasOwnProperty('is_active')) {
            // Get current user status from database
            try {
                const db = require('./database');
                const userResult = await db.query('SELECT is_active FROM users WHERE id = $1', [req.params.userId]);
                if (userResult.rows.length > 0) {
                    const currentStatus = userResult.rows[0].is_active;
                    const newStatus = req.body.is_active;
                    // Only log if status actually changed
                    if (currentStatus !== newStatus) {
                        req.auditAction = newStatus ? 'reactivate_user' : 'deactivate_user';
                    } else {
                        req.auditAction = 'user_update';
                    }
                } else {
                    req.auditAction = 'user_update';
                }
            } catch (error) {
                req.auditAction = 'user_update';
            }
        } else {
            req.auditAction = 'user_update';
        }
        req.auditResource = 'users';
        next();
    },
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

// Request reactivation (public endpoint - no auth required, but identity must be verified via password)
// Send reactivation verification code (Method 3 - Email verification)
router.post('/send-reactivation-code', async (req, res) => {
    try {
        const db = require('./database');
        const bcrypt = require('bcryptjs');
        const emailService = require('./emailService');
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        
        // Find user and verify password
        const userResult = await db.query(`
            SELECT id, username, email, password_hash, is_active
            FROM users
            WHERE username = $1
        `, [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        const user = userResult.rows[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Check if user is already active
        if (user.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Your account is already active'
            });
        }
        
        // Check if email is valid (not placeholder)
        if (!user.email || user.email.includes('@placeholder.com') || user.email.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Email address is not configured. Please contact your IT Head for reactivation.'
            });
        }
        
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        // Invalidate any existing unused codes for this user
        await db.query(`
            UPDATE reactivation_verification_codes
            SET used = true
            WHERE user_id = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP
        `, [user.id]);
        
        // Store code in database
        await db.query(`
            INSERT INTO reactivation_verification_codes (user_id, code, expires_at)
            VALUES ($1, $2, $3)
        `, [user.id, code, expiresAt]);
        
        // Send email
        await emailService.sendReactivationCodeEmail(user.email, user.username, code);
        
        res.json({
            success: true,
            message: `Verification code sent to ${user.email}`
        });
        
    } catch (error) {
        console.error('Send reactivation code error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send verification code'
        });
    }
});

// Verify reactivation code and submit request (Method 3 - Email verification)
router.post('/verify-reactivation-code', async (req, res) => {
    try {
        const db = require('./database');
        const bcrypt = require('bcryptjs');
        const { username, password, code, reason } = req.body;
        
        if (!username || !password || !code || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Username, password, verification code, and reason are required'
            });
        }
        
        if (reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Reason must be at least 10 characters'
            });
        }
        
        // Verify code format
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code format'
            });
        }
        
        // Find user and verify password
        const userResult = await db.query(`
            SELECT id, username, email, password_hash, is_active
            FROM users
            WHERE username = $1
        `, [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        const user = userResult.rows[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Check if user is already active
        if (user.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Your account is already active'
            });
        }
        
        // Verify code
        const codeResult = await db.query(`
            SELECT id, expires_at, used
            FROM reactivation_verification_codes
            WHERE user_id = $1 AND code = $2 AND used = false
            ORDER BY created_at DESC
            LIMIT 1
        `, [user.id, code]);
        
        if (codeResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification code'
            });
        }
        
        const codeRecord = codeResult.rows[0];
        
        // Check if code is expired
        if (new Date() > new Date(codeRecord.expires_at)) {
            return res.status(400).json({
                success: false,
                error: 'Verification code has expired. Please request a new code.'
            });
        }
        
        // Check if code is already used
        if (codeRecord.used) {
            return res.status(400).json({
                success: false,
                error: 'Verification code has already been used'
            });
        }
        
        // Mark code as used
        await db.query(`
            UPDATE reactivation_verification_codes
            SET used = true
            WHERE id = $1
        `, [codeRecord.id]);
        
        // Check if there's already a pending request
        const existingRequest = await db.query(`
            SELECT id FROM reactivation_requests WHERE user_id = $1 AND status = $2
        `, [user.id, 'pending']);
        
        if (existingRequest.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'You already have a pending reactivation request'
            });
        }
        
        // Capture request metadata
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        // Create reactivation request record
        await db.query(`
            INSERT INTO reactivation_requests (user_id, username, reason, status, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [user.id, username, reason.trim(), 'pending', ipAddress, userAgent]);
        
        res.json({
            success: true,
            message: 'Reactivation request submitted successfully'
        });
        
    } catch (error) {
        console.error('Verify reactivation code error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify code and submit request'
        });
    }
});

// Submit reactivation request (public - for deactivated users) - OLD METHOD (keeping for backward compatibility)
router.post('/request-reactivation', async (req, res) => {
    try {
        const db = require('./database');
        const { username, reason } = req.body;
        
        if (!username || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Username and reason are required'
            });
        }
        
        if (reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Reason must be at least 10 characters'
            });
        }
        
        // Find user by username
        const userResult = await db.query(
            'SELECT id, username, is_active FROM users WHERE username = $1',
            [username]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        
        // Check if user is already active
        if (user.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Your account is already active'
            });
        }
        
        // Check if there's already a pending request
        const existingRequest = await db.query(
            'SELECT id FROM reactivation_requests WHERE user_id = $1 AND status = $2',
            [user.id, 'pending']
        );
        
        if (existingRequest.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'You already have a pending reactivation request'
            });
        }
        
        // Capture request metadata
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        // Create reactivation request record
        await db.query(
            `INSERT INTO reactivation_requests (user_id, username, reason, status, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.id, username, reason.trim(), 'pending', ipAddress, userAgent]
        );
        
        res.json({
            success: true,
            message: 'Reactivation request submitted successfully'
        });
        
    } catch (error) {
        console.error('Reactivation request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit reactivation request'
        });
    }
});

// Get pending reactivation requests (IT Head only)
router.get('/reactivation-requests',
    authenticateToken,
    checkRole('it_head'),
    async (req, res) => {
        try {
            const db = require('./database');
            const result = await db.query(`
                SELECT rr.*, 
                       u.first_name, u.last_name, u.email, u.employee_id,
                       r.display_name as role_display_name,
                       b.name as branch_name, b.location as branch_location
                FROM reactivation_requests rr
                JOIN users u ON rr.user_id = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN branches b ON u.branch_id = b.id
                WHERE rr.status = 'pending'
                ORDER BY rr.requested_at DESC
            `);
            
            res.json({
                success: true,
                requests: result.rows
            });
        } catch (error) {
            console.error('Get reactivation requests error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve reactivation requests'
            });
        }
    }
);

// Approve/reject reactivation request (IT Head only)
router.put('/reactivation-requests/:requestId',
    authenticateToken,
    checkRole('it_head'),
    auditLog('review_reactivation_request', 'reactivation_requests'),
    async (req, res) => {
        try {
            const db = require('./database');
            const NotificationService = require('./notificationService');
            const notificationService = new NotificationService();
            const { requestId } = req.params;
            const { action, notes } = req.body;
            
            if (!['approve', 'reject'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid action. Must be "approve" or "reject"'
                });
            }
            
            // Get request details with user info
            const requestResult = await db.query(`
                SELECT rr.*, u.branch_id, u.first_name, u.last_name, u.username
                FROM reactivation_requests rr
                JOIN users u ON rr.user_id = u.id
                WHERE rr.id = $1 AND rr.status = $2
            `, [requestId, 'pending']);
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Request not found or already processed'
                });
            }
            
            const request = requestResult.rows[0];
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            
            // Update request status
            await db.query(
                `UPDATE reactivation_requests 
                 SET status = $1, reviewed_at = CURRENT_TIMESTAMP, 
                     reviewed_by = $2, review_notes = $3
                 WHERE id = $4`,
                [newStatus, req.user.id, notes || null, requestId]
            );
            
            // If approved, reactivate the user
            if (action === 'approve') {
                await db.query(
                    'UPDATE users SET is_active = true WHERE id = $1',
                    [request.user_id]
                );
            }
            
            // Create notification for the user
            const notificationTitle = action === 'approve' 
                ? 'Account Reactivation Approved' 
                : 'Account Reactivation Rejected';
            const notificationContent = action === 'approve'
                ? `Your account reactivation request has been approved. You can now log in to your account.${notes ? ` Note: ${notes}` : ''}`
                : `Your account reactivation request has been rejected.${notes ? ` Reason: ${notes}` : ' Please contact your IT Head for more information.'}`;
            
            await notificationService.createNotification({
                user_id: request.user_id,
                branch_id: request.branch_id,
                title: notificationTitle,
                content: notificationContent,
                category: 'system',
                type: action === 'approve' ? 'success' : 'error',
                status: 'pending',
                reference_type: 'reactivation_request',
                reference_id: requestId,
                is_highlighted: true,
                priority: 'important'
            });
            
            res.json({
                success: true,
                message: `Reactivation request ${action}d successfully`
            });
            
        } catch (error) {
            console.error('Process reactivation request error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process reactivation request'
            });
        }
    }
);

// Forgot password - Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { username_or_email } = req.body;
        
        if (!username_or_email) {
            return res.status(400).json({
                success: false,
                error: 'Username or email is required'
            });
        }
        
        const result = await authService.requestPasswordReset(username_or_email);
        
        // If result indicates failure, return error status
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('Forgot password error:', error);
        // Return generic message for security (don't reveal if user exists)
        if (error.message.includes('Email address is not configured')) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        } else {
            res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }
    }
});

// Verify reset token
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }
        
        const result = await authService.verifyResetToken(token);
        res.json(result);
        
    } catch (error) {
        console.error('Verify reset token error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;
        
        if (!token || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'Token and new password are required'
            });
        }
        
        const result = await authService.resetPassword(token, new_password);
        res.json(result);
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

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

// Audit log routes
router.use('/', auditLogRoutes);

// IT Head Analytics routes
router.use('/', itHeadAnalyticsRoutes);

// Change request routes
const changeRequestRoutes = require('./changeRequestRoutes');
router.use('/', changeRequestRoutes);

// Analytics routes
const analyticsRoutes = require('./analyticsRoutes');
router.use('/analytics', analyticsRoutes);

// Notification routes
const notificationRoutes = require('./notificationRoutes');
router.use('/', notificationRoutes);

// Report request routes
const reportRequestRoutes = require('./reportRequestRoutes');
router.use('/', reportRequestRoutes);

// AI/MCDA and PDF routes
const aiRecommendationRoutes = require('./aiRecommendationRoutes');
router.use('/', aiRecommendationRoutes);

// Generated reports routes
const generatedReportRoutes = require('./generatedReportRoutes');
router.use('/', generatedReportRoutes);

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
