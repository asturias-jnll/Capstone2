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

        // Get user details from database
        const userResult = await db.query(`
            SELECT u.*, r.name as role_name, r.display_name as role_display_name,
                   b.name as branch_name, b.location as branch_location, b.is_main_branch
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.id = $1 AND u.is_active = true
        `, [verification.payload.sub]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'User not found or inactive',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

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
        if (req.user.is_main_branch_user) {
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

// Rate limiting middleware for login attempts
const loginRateLimit = (req, res, next) => {
    // This would typically use Redis or similar for production
    // For now, we'll implement basic in-memory rate limiting
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
                    if (req.user) {
                        await db.query(`
                            INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        `, [
                            req.user.id,
                            action,
                            resource,
                            req.params.id || req.body.id || null,
                            JSON.stringify({
                                method: req.method,
                                url: req.originalUrl,
                                body: req.body,
                                params: req.params,
                                query: req.query,
                                status: res.statusCode
                            }),
                            req.ip || req.connection.remoteAddress,
                            req.get('User-Agent')
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
