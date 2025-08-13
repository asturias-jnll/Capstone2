const bcrypt = require('bcrypt');
const db = require('./database');
const jwtManager = require('./jwt');
const config = require('./config');

class AuthService {
    constructor() {
        this.bcryptRounds = config.security.bcryptRounds;
    }

    // User registration
    async registerUser(userData) {
        try {
            // Validate required fields
            const requiredFields = ['username', 'email', 'password', 'first_name', 'last_name', 'role_id', 'branch_id'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Check if username or email already exists
            const existingUser = await db.query(`
                SELECT username, email FROM users 
                WHERE username = $1 OR email = $2
            `, [userData.username, userData.email]);

            if (existingUser.rows.length > 0) {
                const conflicts = [];
                if (existingUser.rows.some(row => row.username === userData.username)) {
                    conflicts.push('username');
                }
                if (existingUser.rows.some(row => row.email === userData.email)) {
                    conflicts.push('email');
                }
                throw new Error(`User already exists with: ${conflicts.join(', ')}`);
            }

            // Validate password strength
            this.validatePassword(userData.password);

            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, this.bcryptRounds);

            // Check if user is main branch user
            const branchResult = await db.query(`
                SELECT is_main_branch FROM branches WHERE id = $1
            `, [userData.branch_id]);

            if (branchResult.rows.length === 0) {
                throw new Error('Invalid branch ID');
            }

            const isMainBranchUser = branchResult.rows[0].is_main_branch;

            // Insert new user
            const result = await db.query(`
                INSERT INTO users (
                    username, email, password_hash, first_name, last_name,
                    role_id, branch_id, employee_id, phone_number, is_main_branch_user
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, username, email, first_name, last_name, role_id, branch_id, is_main_branch_user, created_at
            `, [
                userData.username,
                userData.email,
                passwordHash,
                userData.first_name,
                userData.last_name,
                userData.role_id,
                userData.branch_id,
                userData.employee_id || null,
                userData.phone_number || null,
                isMainBranchUser
            ]);

            const newUser = result.rows[0];

            // Get role and branch information
            const userWithDetails = await this.getUserWithDetails(newUser.id);

            return {
                success: true,
                message: 'User registered successfully',
                user: userWithDetails
            };

        } catch (error) {
            console.error('User registration error:', error);
            throw error;
        }
    }

    // User login
    async loginUser(username, password, deviceInfo = null, ipAddress = null) {
        try {
            // Get user by username or email
            const userResult = await db.query(`
                SELECT u.*, r.name as role_name, r.display_name as role_display_name,
                       b.name as branch_name, b.location as branch_location, b.is_main_branch
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN branches b ON u.branch_id = b.id
                WHERE (u.username = $1 OR u.email = $1) AND u.is_active = true
            `, [username]);

            if (userResult.rows.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = userResult.rows[0];

            // Check if account is locked
            if (user.locked_until && new Date() < user.locked_until) {
                const lockoutTime = Math.ceil((user.locked_until - new Date()) / 1000 / 60);
                throw new Error(`Account is locked. Try again in ${lockoutTime} minutes.`);
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                // Increment login attempts
                await this.incrementLoginAttempts(user.id);
                throw new Error('Invalid credentials');
            }

            // Reset login attempts on successful login
            await this.resetLoginAttempts(user.id);

            // Update last login
            await db.query(`
                UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1
            `, [user.id]);

            // Get user permissions
            const permissionsResult = await db.query(`
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = $1
            `, [user.role_id]);

            user.permissions = permissionsResult.rows.map(row => row.name);

            // Generate tokens
            const accessToken = jwtManager.generateAccessToken(user);
            const refreshToken = jwtManager.generateRefreshToken(user.id, deviceInfo);

            // Store refresh token
            await this.storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

            return {
                success: true,
                message: 'Login successful',
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
                    permissions: user.permissions
                },
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    expires_in: config.jwt.expiresIn
                }
            };

        } catch (error) {
            console.error('User login error:', error);
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken(refreshToken) {
        try {
            const verification = jwtManager.verifyRefreshToken(refreshToken);
            if (!verification.valid) {
                throw new Error('Invalid refresh token');
            }

            // Check if refresh token exists in database
            const tokenResult = await db.query(`
                SELECT us.*, u.is_active
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.refresh_token = $1 AND us.expires_at > CURRENT_TIMESTAMP
            `, [refreshToken]);

            if (tokenResult.rows.length === 0) {
                throw new Error('Refresh token not found or expired');
            }

            if (!tokenResult.rows[0].is_active) {
                throw new Error('User account is inactive');
            }

            // Get user details
            const userResult = await db.query(`
                SELECT u.*, r.name as role_name, r.display_name as role_display_name,
                       b.name as branch_name, b.location as branch_location, b.is_main_branch
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN branches b ON u.branch_id = b.id
                WHERE u.id = $1
            `, [verification.payload.sub]);

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
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

            // Generate new access token
            const newAccessToken = jwtManager.generateAccessToken(user);

            return {
                success: true,
                access_token: newAccessToken,
                expires_in: config.jwt.expiresIn
            };

        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    // Logout user
    async logoutUser(userId, refreshToken) {
        try {
            // Remove refresh token from database
            await db.query(`
                DELETE FROM user_sessions 
                WHERE user_id = $1 AND refresh_token = $2
            `, [userId, refreshToken]);

            return {
                success: true,
                message: 'Logout successful'
            };

        } catch (error) {
            console.error('User logout error:', error);
            throw error;
        }
    }

    // Get user with details
    async getUserWithDetails(userId) {
        try {
            const result = await db.query(`
                SELECT u.*, r.name as role_name, r.display_name as role_display_name,
                       b.name as branch_name, b.location as branch_location, b.is_main_branch
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN branches b ON u.branch_id = b.id
                WHERE u.id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = result.rows[0];

            // Get user permissions
            const permissionsResult = await db.query(`
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = $1
            `, [user.role_id]);

            user.permissions = permissionsResult.rows.map(row => row.name);

            return user;

        } catch (error) {
            console.error('Get user details error:', error);
            throw error;
        }
    }

    // Change password
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Get current password hash
            const userResult = await db.query(`
                SELECT password_hash FROM users WHERE id = $1
            `, [userId]);

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Validate new password
            this.validatePassword(newPassword);

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

            // Update password
            await db.query(`
                UPDATE users 
                SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [newPasswordHash, userId]);

            return {
                success: true,
                message: 'Password changed successfully'
            };

        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    // Store refresh token
    async storeRefreshToken(userId, refreshToken, deviceInfo, ipAddress) {
        try {
            await db.query(`
                INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, expires_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '${config.jwt.refreshExpiresIn}')
            `, [userId, refreshToken, deviceInfo, ipAddress]);
        } catch (error) {
            console.error('Store refresh token error:', error);
            throw error;
        }
    }

    // Increment login attempts
    async incrementLoginAttempts(userId) {
        try {
            const result = await db.query(`
                UPDATE users 
                SET login_attempts = login_attempts + 1,
                    locked_until = CASE 
                        WHEN login_attempts + 1 >= $1 THEN CURRENT_TIMESTAMP + INTERVAL '${config.security.lockoutDuration} minutes'
                        ELSE locked_until
                    END
                WHERE id = $2
                RETURNING login_attempts, locked_until
            `, [config.security.maxLoginAttempts, userId]);

            return result.rows[0];
        } catch (error) {
            console.error('Increment login attempts error:', error);
            throw error;
        }
    }

    // Reset login attempts
    async resetLoginAttempts(userId) {
        try {
            await db.query(`
                UPDATE users 
                SET login_attempts = 0, locked_until = NULL
                WHERE id = $1
            `, [userId]);
        } catch (error) {
            console.error('Reset login attempts error:', error);
            throw error;
        }
    }

    // Validate password strength
    validatePassword(password) {
        if (password.length < config.security.passwordMinLength) {
            throw new Error(`Password must be at least ${config.security.passwordMinLength} characters long`);
        }

        if (config.security.requireUppercase && !/[A-Z]/.test(password)) {
            throw new Error('Password must contain at least one uppercase letter');
        }

        if (config.security.requireNumbers && !/\d/.test(password)) {
            throw new Error('Password must contain at least one number');
        }

        if (config.security.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            throw new Error('Password must contain at least one special character');
        }
    }

    // Get all users (for IT Head)
    async getAllUsers() {
        try {
            const result = await db.query(`
                SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.employee_id,
                       u.phone_number, u.is_active, u.is_main_branch_user, u.last_login,
                       u.created_at, u.updated_at,
                       r.name as role_name, r.display_name as role_display_name,
                       b.name as branch_name, b.location as branch_location
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN branches b ON u.branch_id = b.id
                ORDER BY u.created_at DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('Get all users error:', error);
            throw error;
        }
    }

    // Update user
    async updateUser(userId, updateData) {
        try {
            const allowedFields = ['first_name', 'last_name', 'email', 'phone_number', 'role_id', 'branch_id', 'is_active'];
            const updateFields = [];
            const updateValues = [];
            let paramCount = 1;

            for (const [field, value] of Object.entries(updateData)) {
                if (allowedFields.includes(field) && value !== undefined) {
                    updateFields.push(`${field} = $${paramCount}`);
                    updateValues.push(value);
                    paramCount++;
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            updateValues.push(userId);
            const result = await db.query(`
                UPDATE users 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
                RETURNING id, username, email, first_name, last_name, role_id, branch_id, is_active, updated_at
            `, updateValues);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            return {
                success: true,
                message: 'User updated successfully',
                user: result.rows[0]
            };

        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    // Delete user
    async deleteUser(userId) {
        try {
            const result = await db.query(`
                DELETE FROM users WHERE id = $1
                RETURNING id, username
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            return {
                success: true,
                message: 'User deleted successfully',
                deletedUser: result.rows[0]
            };

        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;
