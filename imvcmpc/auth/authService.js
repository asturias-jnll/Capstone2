const bcrypt = require('bcryptjs');
const db = require('./database');
const jwtManager = require('./jwt');
const config = require('./config');
const emailService = require('./emailService');

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
            // First, get user by username or email (without is_active filter to check status)
            const userResult = await db.query(`
                SELECT u.*, r.name as role_name, r.display_name as role_display_name,
                       b.name as branch_name, b.location as branch_location, b.is_main_branch
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN branches b ON u.branch_id = b.id
                WHERE (u.username = $1 OR u.email = $1)
            `, [username]);

            if (userResult.rows.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = userResult.rows[0];

            // SECURITY: Verify password FIRST before checking activation status
            // This ensures identity is verified before allowing reactivation requests
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                // Increment login attempts - DISABLED
                // await this.incrementLoginAttempts(user.id);
                throw new Error('Invalid credentials');
            }

            // Check if account is deactivated (password is verified = identity confirmed)
            if (!user.is_active) {
                // Return special response for identity-verified deactivated accounts
                return {
                    success: false,
                    error: 'Your account has been deactivated by the IT Head. Please contact your administrator for assistance.',
                    code: 'ACCOUNT_DEACTIVATED',
                    identity_verified: true,
                    user_id: user.id,
                    username: user.username
                };
            }

            // Check if account is locked - DISABLED
            // if (user.locked_until && new Date() < user.locked_until) {
            //     const lockoutTime = Math.ceil((user.locked_until - new Date()) / 1000 / 60);
            //     throw new Error(`Account is locked. Try again in ${lockoutTime} minutes.`);
            // }

            // Reset login attempts on successful login - DISABLED
            // await this.resetLoginAttempts(user.id);

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

    // Update user profile (personal information)
    async updateProfile(userId, updateData) {
        try {
            // Check if user exists and get last update time
            const userResult = await db.query(`
                SELECT id, username, email, last_profile_update FROM users WHERE id = $1
            `, [userId]);

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];

            // Check if 30 days have passed since last profile update
            if (user.last_profile_update) {
                const lastUpdate = new Date(user.last_profile_update);
                const now = new Date();
                const daysSinceLastUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

                if (daysSinceLastUpdate < 30) {
                    const daysRemaining = 30 - daysSinceLastUpdate;
                    throw new Error(`You can only update your profile once every 30 days. Please wait ${daysRemaining} more day(s).`);
                }
            }

            // Validate required fields
            const { first_name, last_name, username, email } = updateData;

            if (!first_name || !last_name || !username || !email) {
                throw new Error('All fields are required: first_name, last_name, username, email');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }

            // Check if username or email already exists for other users
            const existingUser = await db.query(`
                SELECT id, username, email FROM users 
                WHERE (username = $1 OR email = $2) AND id != $3
            `, [username, email, userId]);

            if (existingUser.rows.length > 0) {
                const conflicts = [];
                if (existingUser.rows.some(row => row.username === username)) {
                    conflicts.push('username');
                }
                if (existingUser.rows.some(row => row.email === email)) {
                    conflicts.push('email');
                }
                throw new Error(`Already exists: ${conflicts.join(', ')}`);
            }

            // Update profile with timestamp
            const result = await db.query(`
                UPDATE users 
                SET first_name = $1, last_name = $2, username = $3, email = $4, 
                    last_profile_update = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING id, username, email, first_name, last_name, last_profile_update, updated_at
            `, [first_name, last_name, username, email, userId]);

            return {
                success: true,
                message: 'Profile updated successfully',
                user: result.rows[0]
            };

        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    }

    // Change password
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Get current password hash and last password change time
            const userResult = await db.query(`
                SELECT password_hash, last_password_change FROM users WHERE id = $1
            `, [userId]);

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];

            // Check if 30 days have passed since last password change
            if (user.last_password_change) {
                const lastChange = new Date(user.last_password_change);
                const now = new Date();
                const daysSinceLastChange = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));

                if (daysSinceLastChange < 30) {
                    const daysRemaining = 30 - daysSinceLastChange;
                    throw new Error(`You can only change your password once every 30 days. Please wait ${daysRemaining} more day(s).`);
                }
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Validate new password
            this.validatePassword(newPassword);

            // Ensure new password is different from current
            const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw new Error('New password must be different from current password');
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

            // Update password with timestamp
            await db.query(`
                UPDATE users 
                SET password_hash = $1, last_password_change = CURRENT_TIMESTAMP, 
                    password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
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

    // Create transaction table for a new branch
    async createBranchTransactionTable(location) {
        try {
            // Format table name: lowercase location without spaces/special chars, append _transactions
            // "LIPA CITY" -> "lipacity_transactions"
            const tableName = `${location.toLowerCase().replace(/[^a-z0-9]/g, '')}_transactions`;

            // Create the transaction table with the same schema as other branch tables
            await db.query(`
                CREATE TABLE IF NOT EXISTS ${tableName} (
                    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
                    transaction_date date NOT NULL,
                    payee character varying(255) NOT NULL,
                    reference character varying(100),
                    cross_reference character varying(100),
                    check_number character varying(50),
                    particulars text NOT NULL,
                    debit_amount numeric(15,2) DEFAULT 0.00,
                    credit_amount numeric(15,2) DEFAULT 0.00,
                    cash_in_bank numeric(15,2) DEFAULT 0.00,
                    loan_receivables numeric(15,2) DEFAULT 0.00,
                    savings_deposits numeric(15,2) DEFAULT 0.00,
                    interest_income numeric(15,2) DEFAULT 0.00,
                    service_charge numeric(15,2) DEFAULT 0.00,
                    sundries numeric(15,2) DEFAULT 0.00,
                    branch_id integer,
                    created_by uuid,
                    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log(`Created transaction table: ${tableName}`);
            return tableName;

        } catch (error) {
            console.error('Create branch transaction table error:', error);
            throw error;
        }
    }

    // Find or create branch by location
    async findOrCreateBranch(branchName, location) {
        try {
            // Check if branch with this location already exists
            const existingBranch = await db.query(`
                SELECT id, name, location FROM branches 
                WHERE LOWER(location) = LOWER($1)
            `, [location]);

            if (existingBranch.rows.length > 0) {
                return existingBranch.rows[0].id;
            }

            // Get the maximum branch ID and increment it
            const maxIdResult = await db.query(`
                SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM branches
            `);
            const nextId = maxIdResult.rows[0].next_id;

            // Create new branch with explicit ID
            const result = await db.query(`
                INSERT INTO branches (id, name, location, is_main_branch)
                VALUES ($1, $2, $3, false)
                RETURNING id, name, location
            `, [nextId, branchName, location]);

            // Update the sequence to match the new max ID
            await db.query(`
                SELECT setval('branches_id_seq', $1, true)
            `, [nextId]);

            // Create the corresponding transaction table for this branch
            await this.createBranchTransactionTable(location);

            console.log(`Branch created: ${branchName} (${location}) with ID ${nextId}`);
            return result.rows[0].id;

        } catch (error) {
            console.error('Find or create branch error:', error);
            throw error;
        }
    }

    // Get next employee ID for a role
    async getNextEmployeeId(rolePrefix) {
        try {
            // Query for the latest employee_id with this prefix
            const result = await db.query(`
                SELECT employee_id FROM users 
                WHERE employee_id LIKE $1
                ORDER BY employee_id DESC
                LIMIT 1
            `, [`${rolePrefix}%`]);

            if (result.rows.length === 0) {
                // No existing employees with this prefix, start at 001
                return `${rolePrefix}001`;
            }

            // Extract the number from the employee_id (e.g., "MC013" -> 13)
            const lastEmployeeId = result.rows[0].employee_id;
            const numberMatch = lastEmployeeId.match(/\d+$/);
            
            if (!numberMatch) {
                throw new Error(`Invalid employee_id format: ${lastEmployeeId}`);
            }

            const lastNumber = parseInt(numberMatch[0], 10);
            const nextNumber = lastNumber + 1;
            
            // Format with leading zeros (e.g., 14 -> "014")
            const paddedNumber = String(nextNumber).padStart(3, '0');
            
            return `${rolePrefix}${paddedNumber}`;

        } catch (error) {
            console.error('Get next employee ID error:', error);
            throw error;
        }
    }

    // Register branch users (Marketing Clerk and Finance Officer)
    async registerBranchUsers(marketingClerkData, financeOfficerData) {
        try {
            // Extract location and branch name from Marketing Clerk data
            const location = marketingClerkData.location.toUpperCase();
            const branchName = marketingClerkData.branch;

            // Find or create the branch
            const branchId = await this.findOrCreateBranch(branchName, location);

            // Get role IDs
            const rolesResult = await db.query(`
                SELECT id, name FROM roles WHERE name IN ('marketing_clerk', 'finance_officer')
            `);
            
            const marketingClerkRoleId = rolesResult.rows.find(r => r.name === 'marketing_clerk')?.id;
            const financeOfficerRoleId = rolesResult.rows.find(r => r.name === 'finance_officer')?.id;

            if (!marketingClerkRoleId || !financeOfficerRoleId) {
                throw new Error('Required roles not found in database');
            }

            // Generate employee IDs
            const mcEmployeeId = await this.getNextEmployeeId('MC');
            const foEmployeeId = await this.getNextEmployeeId('FO');

            // Generate placeholder emails (empty string or based on username)
            const mcEmail = marketingClerkData.email || `${marketingClerkData.username}@placeholder.com`;
            const foEmail = financeOfficerData.email || `${financeOfficerData.username}@placeholder.com`;

            // Prepare Marketing Clerk data
            const mcUserData = {
                username: marketingClerkData.username,
                email: mcEmail,
                password: marketingClerkData.password,
                first_name: location,
                last_name: 'Marketing Clerk',
                role_id: marketingClerkRoleId,
                branch_id: branchId,
                employee_id: mcEmployeeId,
                phone_number: null
            };

            // Prepare Finance Officer data
            const foUserData = {
                username: financeOfficerData.username,
                email: foEmail,
                password: financeOfficerData.password,
                first_name: location,
                last_name: 'Finance Officer',
                role_id: financeOfficerRoleId,
                branch_id: branchId,
                employee_id: foEmployeeId,
                phone_number: null
            };

            // Register both users
            const mcResult = await this.registerUser(mcUserData);
            const foResult = await this.registerUser(foUserData);

            return {
                success: true,
                message: 'Branch users registered successfully',
                marketingClerk: mcResult.user,
                financeOfficer: foResult.user,
                branch: {
                    id: branchId,
                    name: branchName,
                    location: location
                }
            };

        } catch (error) {
            console.error('Register branch users error:', error);
            throw error;
        }
    }

    // Request password reset
    async requestPasswordReset(usernameOrEmail) {
        try {
            // Find user by username or email
            const userResult = await db.query(`
                SELECT id, username, email, first_name, last_name, is_active, branch_id
                FROM users
                WHERE username = $1 OR email = $1
            `, [usernameOrEmail]);

            if (userResult.rows.length === 0) {
                // User not found - return error
                return {
                    success: false,
                    error: 'The entered email or username does not belong to any branch user. Please check your input and try again.'
                };
            }

            const user = userResult.rows[0];

            // Check if user is a branch user (has branch_id)
            if (!user.branch_id) {
                // User exists but is not a branch user (e.g., IT Head)
                return {
                    success: false,
                    error: 'The entered email or username does not belong to any branch user. Please check your input and try again.'
                };
            }

            // Check if email is valid (not placeholder) - check this before active status
            if (!user.email || user.email.includes('@placeholder.com') || user.email.trim() === '') {
                throw new Error('Email address is not configured. Please contact your IT Head for password reset.');
            }

            // Check if user is active
            if (!user.is_active) {
                // Don't reveal account status for security, but show email
                return {
                    success: true,
                    message: `A password reset link was sent to ${user.email}`,
                    email: user.email,
                    user_id: user.id
                };
            }

            // Check for existing valid token (prevent spam)
            const existingToken = await db.query(`
                SELECT id FROM password_reset_tokens
                WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
            `, [user.id]);

            if (existingToken.rows.length > 0) {
                // Token already exists and is valid
                return {
                    success: true,
                    message: `A password reset link was sent to ${user.email}`,
                    email: user.email,
                    user_id: user.id
                };
            }

            // Generate reset token
            const resetToken = jwtManager.generatePasswordResetToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

            // Store token in database
            await db.query(`
                INSERT INTO password_reset_tokens (user_id, token, expires_at)
                VALUES ($1, $2, $3)
            `, [user.id, resetToken, expiresAt]);

            // Generate reset link
            const resetLink = `${config.email.resetLinkBaseUrl}?token=${resetToken}`;

            // Send email
            await emailService.sendPasswordResetEmail(
                user.email,
                user.username,
                resetLink
            );

            return {
                success: true,
                message: `A password reset link was sent to ${user.email}`,
                email: user.email,
                user_id: user.id
            };

        } catch (error) {
            console.error('Password reset request error:', error);
            throw error;
        }
    }

    // Verify reset token
    async verifyResetToken(token) {
        try {
            const tokenResult = await db.query(`
                SELECT prt.*, u.username, u.email, u.first_name, u.last_name
                FROM password_reset_tokens prt
                JOIN users u ON prt.user_id = u.id
                WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP AND prt.used_at IS NULL
            `, [token]);

            if (tokenResult.rows.length === 0) {
                throw new Error('Invalid or expired reset token');
            }

            return {
                success: true,
                token: tokenResult.rows[0],
                user: {
                    username: tokenResult.rows[0].username,
                    email: tokenResult.rows[0].email,
                    first_name: tokenResult.rows[0].first_name,
                    last_name: tokenResult.rows[0].last_name
                }
            };

        } catch (error) {
            console.error('Verify reset token error:', error);
            throw error;
        }
    }

    // Reset password using token
    async resetPassword(token, newPassword) {
        try {
            // Verify token
            const tokenResult = await db.query(`
                SELECT prt.*, u.id as user_id, u.is_active
                FROM password_reset_tokens prt
                JOIN users u ON prt.user_id = u.id
                WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP AND prt.used_at IS NULL
            `, [token]);

            if (tokenResult.rows.length === 0) {
                throw new Error('Invalid or expired reset token');
            }

            const tokenData = tokenResult.rows[0];

            // Check if user is active
            if (!tokenData.is_active) {
                throw new Error('Account is deactivated. Please contact your IT Head.');
            }

            // Validate new password
            this.validatePassword(newPassword);

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

            // Update user password
            await db.query(`
                UPDATE users
                SET password_hash = $1, last_password_change = CURRENT_TIMESTAMP,
                    password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [passwordHash, tokenData.user_id]);

            // Mark token as used
            await db.query(`
                UPDATE password_reset_tokens
                SET used_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [tokenData.id]);

            // Get user info for notification
            const userResult = await db.query(`
                SELECT id, username, branch_id, first_name, last_name
                FROM users
                WHERE id = $1
            `, [tokenData.user_id]);

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                
                // Create notification for successful password reset
                const NotificationService = require('./notificationService');
                const notificationService = new NotificationService();
                
                await notificationService.createNotification({
                    user_id: user.id,
                    branch_id: user.branch_id,
                    title: 'Password Reset Successful',
                    content: 'Your password has been successfully reset. If you did not perform this action, please contact your IT Head immediately.',
                    category: 'system',
                    type: 'success',
                    status: 'pending',
                    reference_type: 'password_reset',
                    reference_id: tokenData.id,
                    is_highlighted: true,
                    priority: 'important'
                });
            }

            return {
                success: true,
                message: 'Password has been reset successfully'
            };

        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;
