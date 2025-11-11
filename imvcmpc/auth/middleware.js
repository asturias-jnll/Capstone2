const jwtManager = require('./jwt');
const db = require('./database');
const config = require('./config');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
        }

        const verification = jwtManager.verifyAccessToken(token);
        if (!verification.valid) {
            return res.status(401).json({
                error: 'Invalid or expired token',
                code: 'TOKEN_INVALID'
            });
        }

        // Get user details from database (check without is_active filter first)
        const userResult = await db.query(`
            SELECT u.*, r.name as role_name, r.display_name as role_display_name,
                   b.name as branch_name, b.location as branch_location, b.is_main_branch
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.id = $1
        `, [verification.payload.sub]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // Check if account is deactivated
        if (!user.is_active) {
            return res.status(401).json({
                error: 'Your account has been deactivated by the IT Head. Please contact your administrator for assistance.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Get user permissions
        const permissionsResult = await db.query(`
            SELECT p.name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
        `, [user.role_id]);

        user.permissions = permissionsResult.rows.map(row => row.name);

        // Add user info to request
        req.user = user;
        next();

    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

// Check if user has specific permission
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // IT Head has full access
            if (req.user.role_name === 'it_head') {
                return next();
            }

            // Check if user has the required permission
            if (req.user.permissions.includes(requiredPermission) || 
                req.user.permissions.includes('*:*')) {
                return next();
            }

            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'PERMISSION_DENIED',
                required: requiredPermission,
                user_permissions: req.user.permissions
            });

        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                error: 'Permission check failed',
                code: 'PERMISSION_ERROR'
            });
        }
    };
};

// Check if user can access specific branch data
const checkBranchAccess = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const requestedBranchId = parseInt(req.params.branch_id || req.body.branch_id || req.query.branch_id);

        // IT Head has access to all branches
        if (req.user.role_name === 'it_head') {
            return next();
        }

        // Main branch users have access to all branches
        if (req.user.is_main_branch) {
            return next();
        }

        // Users can only access their own branch
        if (req.user.branch_id === requestedBranchId) {
            return next();
        }

        return res.status(403).json({
            error: 'Access denied to this branch',
            code: 'BRANCH_ACCESS_DENIED',
            user_branch: req.user.branch_id,
            requested_branch: requestedBranchId
        });

    } catch (error) {
        console.error('Branch access check error:', error);
        return res.status(500).json({
            error: 'Branch access check failed',
            code: 'BRANCH_CHECK_ERROR'
        });
    }
};

// Check if user has role
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (roles.includes(req.user.role_name)) {
                return next();
            }

            return res.status(403).json({
                error: 'Insufficient role privileges',
                code: 'ROLE_DENIED',
                required_roles: roles,
                user_role: req.user.role_name
            });

        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({
                error: 'Role check failed',
                code: 'ROLE_CHECK_ERROR'
            });
        }
    };
};

// Rate limiting middleware for login attempts - DISABLED
const loginRateLimit = (req, res, next) => {
    // This would typically use Redis or similar for production
    // For now, we'll implement basic in-memory rate limiting
    // DISABLED: Account locking functionality temporarily removed
    /*
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!req.app.locals.loginAttempts) {
        req.app.locals.loginAttempts = new Map();
    }

    const attempts = req.app.locals.loginAttempts.get(clientIP) || { count: 0, firstAttempt: now };

    // Reset if lockout period has passed
    if (now - attempts.firstAttempt > config.security.lockoutDuration * 60 * 1000) {
        attempts.count = 0;
        attempts.firstAttempt = now;
    }

    if (attempts.count >= config.security.maxLoginAttempts) {
        return res.status(429).json({
            error: 'Too many login attempts. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((config.security.lockoutDuration * 60 * 1000 - (now - attempts.firstAttempt)) / 1000)
        });
    }
    */

    next();
};

// Audit logging middleware
const auditLog = (action, resource = null) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log the action after response is sent
            setTimeout(async () => {
                try {
                    let userId = null;
                    let branchId = null;
                    
                    // For login, get user_id from response data
                    if (action === 'login') {
                        try {
                            const responseData = typeof data === 'string' ? JSON.parse(data) : data;
                            if (responseData && responseData.success && responseData.user && responseData.user.id) {
                                userId = responseData.user.id;
                                branchId = responseData.user.branch_id || null;
                            }
                        } catch (e) {
                            // If parsing fails, try to get from username
                            if (req.body && req.body.username) {
                                const userResult = await db.query('SELECT id, branch_id FROM users WHERE username = $1', [req.body.username]);
                                if (userResult.rows.length > 0) {
                                    userId = userResult.rows[0].id;
                                    branchId = userResult.rows[0].branch_id || null;
                                }
                            }
                        }
                    } else if (req.user) {
                        // For other actions, use req.user
                        userId = req.user.id;
                        branchId = req.user.branch_id || null;
                    }
                    
                    // Skip audit log if flag is set
                    if (req.skipAuditLog) {
                        return;
                    }
                    
                    if (userId) {
                        // Build enhanced details based on action type
                        let details = {
                            method: req.method,
                            url: req.originalUrl,
                            body: req.body,
                            params: req.params,
                            query: req.query,
                            status: res.statusCode
                        };
                        
                        // Use custom action if set on request
                        const finalAction = req.auditAction || action;
                        const finalResource = req.auditResource || resource;
                        
                        // Enhance details for specific actions
                        if ((action === 'change_request_creation' || action === 'request_change') && req.body) {
                            details.request_type = req.body.request_type || 'modification';
                            details.transaction_id = req.body.transaction_id;
                            details.requested_changes = req.body.requested_changes;
                            details.reason = req.body.reason;
                        } else if ((action === 'change_request_status_update' || finalAction === 'approve_change_request' || finalAction === 'reject_change_request') && req.body) {
                            details.status_action = req.body.status; // approve or reject
                            details.change_request_id = req.params.requestId;
                            details.finance_officer_notes = req.body.finance_officer_notes;
                        } else if (action === 'apply_analytics_filter' && req.body) {
                            details.filter_type = req.body.filterType || req.body.filter_type;
                            details.date_range = req.body.dateRange || req.body.date_range;
                            details.branch_selection = req.body.branchSelection || req.body.branch_selection;
                        } else if (action === 'bulk_create_transactions' && req.body) {
                            details.transaction_count = req.body.transactions?.length || 0;
                            details.file_name = req.body.file_name || 'unknown';
                        } else if (action === 'create_transaction' && req.body) {
                            details.transaction_details = {
                                payee: req.body.payee,
                                transaction_type: req.body.transaction_type || (req.body.savings_deposits > 0 ? 'savings' : 'disbursement'),
                                amount: req.body.savings_deposits || req.body.loan_receivables || 0
                            };
                        } else if (action === 'delete_transaction' && req.params) {
                            details.transaction_id = req.params.id;
                        } else if ((action === 'report_request_creation' || action === 'request_report') && req.body) {
                            details.report_type = req.body.report_type;
                            details.report_config = req.body.report_config;
                            details.priority = req.body.priority || 'normal';
                            details.fo_notes = req.body.fo_notes;
                            details.due_at = req.body.due_at;
                        } else if (action === 'login' && req.body) {
                            details.username = req.body.username;
                        } else if (action === 'logout') {
                            // Logout details
                            details.logout_time = new Date().toISOString();
                        } else if (action === 'update_profile' && req.body) {
                            details.updated_fields = {
                                first_name: req.body.first_name || null,
                                last_name: req.body.last_name || null,
                                username: req.body.username || null,
                                email: req.body.email || null
                            };
                        } else if (action === 'change_password') {
                            details.password_changed = true;
                        } else if (finalAction === 'add_user' && req.body) {
                            // Store branch information for add_user action
                            if (req.body.marketingClerk && req.body.marketingClerk.branch) {
                                details.branch_added = req.body.marketingClerk.branch;
                            } else if (req.body.financeOfficer && req.body.financeOfficer.branch) {
                                details.branch_added = req.body.financeOfficer.branch;
                            }
                        } else if ((finalAction === 'deactivate_user' || finalAction === 'reactivate_user') && req.params) {
                            // Get branch and user info of the user being deactivated/reactivated
                            try {
                                const userBranchResult = await db.query(`
                                    SELECT u.id, u.username, u.first_name, u.last_name, b.name as branch_name, b.location as branch_location
                                    FROM users u
                                    LEFT JOIN branches b ON u.branch_id = b.id
                                    WHERE u.id = $1
                                `, [req.params.userId]);
                                if (userBranchResult.rows.length > 0) {
                                    const userInfo = userBranchResult.rows[0];
                                    if (userInfo.branch_name) {
                                        details.affected_branch = userInfo.branch_name;
                                        if (userInfo.branch_location) {
                                            details.affected_branch_location = userInfo.branch_location;
                                        }
                                    }
                                    // Add user information
                                    if (finalAction === 'deactivate_user') {
                                        details.deactivated_user_id = userInfo.id;
                                        details.deactivated_username = userInfo.username;
                                        details.deactivated_user_name = `${userInfo.first_name} ${userInfo.last_name}`;
                                    } else if (finalAction === 'reactivate_user') {
                                        details.reactivated_user_id = userInfo.id;
                                        details.reactivated_username = userInfo.username;
                                        details.reactivated_user_name = `${userInfo.first_name} ${userInfo.last_name}`;
                                    }
                                }
                            } catch (err) {
                                console.warn('Could not fetch branch/user for deactivate/reactivate:', err);
                            }
                        }
                        
                        await db.query(`
                            INSERT INTO audit_logs (user_id, branch_id, action, resource, resource_id, details, ip_address, user_agent, status)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        `, [
                            userId,
                            branchId,
                            finalAction,
                            finalResource,
                            req.params.id || req.params.requestId || req.body.id || null,
                            JSON.stringify(details),
                            req.ip || req.connection.remoteAddress,
                            req.get('User-Agent'),
                            res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failed'
                        ]);
                    }
                } catch (error) {
                    console.error('Audit logging error:', error);
                }
            }, 0);
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    authenticateToken,
    checkPermission,
    checkBranchAccess,
    checkRole,
    loginRateLimit,
    auditLog
};
