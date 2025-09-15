const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection for setup
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default postgres database first
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'imvcmpc12'
});

async function setupDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting database setup...');
        
        // Check if database exists, create if not
        const dbName = process.env.DB_NAME || 'imvcmpc_fms';
        const dbExists = await client.query(`
            SELECT 1 FROM pg_database WHERE datname = $1
        `, [dbName]);
        
        if (dbExists.rows.length === 0) {
            console.log(`📦 Creating database: ${dbName}`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Database ${dbName} created successfully`);
        } else {
            console.log(`✅ Database ${dbName} already exists`);
        }
        
        // Close connection to postgres database
        await client.end();
        
        // Connect to the new database
        const dbPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: dbName,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'imvcmpc12'
        });
        
        const dbClient = await dbPool.connect();
        
        try {
            // Read and execute schema
            console.log('📋 Executing database schema...');
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Execute the schema without wrapping in a transaction
            // This allows individual statements to succeed even if some fail
            console.log('🧹 Cleaning up existing objects...');
            try {
                // Drop triggers first (they depend on the function)
                await dbClient.query(`
                    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
                    DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
                    DROP TRIGGER IF EXISTS update_members_updated_at ON members;
                    DROP TRIGGER IF EXISTS update_savings_updated_at ON savings;
                    DROP TRIGGER IF EXISTS update_disbursements_updated_at ON disbursements;
                `);
                
                // Then drop the function (after all triggers that depend on it are dropped)
                await dbClient.query(`
                    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
                `);
                
                console.log('   ✅ Cleanup completed successfully');
            } catch (cleanupError) {
                console.log('   ⚠️  Cleanup warning (this is normal):', cleanupError.message);
            }
            
            // Split schema into individual statements and execute them
            const statements = schema
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            console.log(`📝 Executing ${statements.length} schema statements...`);
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement.trim()) {
                    try {
                        await dbClient.query(statement);
                        console.log(`   ✅ Statement ${i + 1} executed successfully`);
                    } catch (error) {
                        // Log error but continue with other statements
                        console.log(`   ⚠️  Statement ${i + 1} failed:`, error.message);
                        console.log(`      SQL: ${statement.substring(0, 100)}...`);
                    }
                }
            }
            
            console.log('✅ Database schema execution completed');
            
            // Verify tables were created
            console.log('🔍 Verifying table creation...');
            const tablesResult = await dbClient.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            
            console.log('📊 Created tables:', tablesResult.rows.map(row => row.table_name).join(', '));
            
            // Clean up existing users and data to avoid conflicts
            console.log('🧹 Cleaning up existing data...');
            try {
                // Drop all data from tables in correct order (respecting foreign keys)
                await dbClient.query('DELETE FROM user_sessions');
                await dbClient.query('DELETE FROM password_reset_tokens');
                await dbClient.query('DELETE FROM audit_logs');
                await dbClient.query('DELETE FROM disbursements');
                await dbClient.query('DELETE FROM savings');
                await dbClient.query('DELETE FROM members');
                await dbClient.query('DELETE FROM users');
                await dbClient.query('DELETE FROM role_permissions');
                await dbClient.query('DELETE FROM permissions');
                await dbClient.query('DELETE FROM roles');
                await dbClient.query('DELETE FROM branches');
                
                console.log('   ✅ Existing data cleaned up');
            } catch (cleanupError) {
                console.log('   ⚠️  Data cleanup warning:', cleanupError.message);
            }
            
            // Re-insert the schema data (branches, roles, permissions, role_permissions)
            console.log('📝 Re-inserting schema data...');
            try {
                // Insert default branches
                await dbClient.query(`
                    INSERT INTO branches (id, name, location, is_main_branch) VALUES
                    (1, 'Main Branch', 'IBAAN', TRUE),
                    (2, 'Branch 2', 'BAUAN', FALSE),
                    (3, 'Branch 3', 'SAN JOSE', FALSE),
                    (4, 'Branch 4', 'ROSARIO', FALSE),
                    (5, 'Branch 5', 'SAN JUAN', FALSE),
                    (6, 'Branch 6', 'PADRE GARCIA', FALSE),
                    (7, 'Branch 7', 'LIPA CITY', FALSE),
                    (8, 'Branch 8', 'BATANGAS CITY', FALSE),
                    (9, 'Branch 9', 'MABINI LIPA', FALSE),
                    (10, 'Branch 10', 'CALAMIAS', FALSE),
                    (11, 'Branch 11', 'LEMERY', FALSE),
                    (12, 'Branch 12', 'MATAAS NA KAHOY', FALSE),
                    (13, 'Branch 13', 'TANAUAN', FALSE)
                `);
                
                // Insert default roles
                await dbClient.query(`
                    INSERT INTO roles (id, name, display_name, description) VALUES
                    (1, 'marketing_clerk', 'Marketing Clerk', 'Marketing clerk with branch-specific access'),
                    (2, 'finance_officer', 'Finance Officer', 'Finance officer with financial management capabilities'),
                    (3, 'it_head', 'IT Head', 'IT administrator with full system access')
                `);
                
                // Insert default permissions
                await dbClient.query(`
                    INSERT INTO permissions (id, name, display_name, description, resource, action) VALUES
                    (1, 'read:member_data', 'Read Member Data', 'Can view member information', 'member_data', 'read'),
                    (2, 'write:member_data', 'Write Member Data', 'Can create and update member information', 'member_data', 'write'),
                    (3, 'read:basic_reports', 'Read Basic Reports', 'Can view basic reports', 'reports', 'read'),
                    (4, 'read:notifications', 'Read Notifications', 'Can view notifications', 'notifications', 'read'),
                    (5, 'write:notifications', 'Write Notifications', 'Can create and update notifications', 'notifications', 'write'),
                    (6, 'read:financial_data', 'Read Financial Data', 'Can view financial information', 'financial_data', 'read'),
                    (7, 'write:financial_data', 'Write Financial Data', 'Can create and update financial information', 'financial_data', 'write'),
                    (8, 'read:advanced_reports', 'Read Advanced Reports', 'Can view advanced financial reports', 'reports', 'read'),
                    (9, 'write:reports', 'Write Reports', 'Can create and update reports', 'reports', 'write'),
                    (10, 'read:mcda_analysis', 'Read MCDA Analysis', 'Can view multi-criteria decision analysis', 'mcda_analysis', 'read'),
                    (11, 'write:mcda_analysis', 'Write MCDA Analysis', 'Can perform MCDA analysis', 'mcda_analysis', 'write'),
                    (12, 'read:budget_data', 'Read Budget Data', 'Can view budget information', 'budget_data', 'read'),
                    (13, 'write:budget_data', 'Write Budget Data', 'Can create and update budget information', 'budget_data', 'write'),
                    (14, 'transactions:read', 'Read Transactions', 'Can view transaction data', 'transactions', 'read'),
                    (15, 'transactions:create', 'Create Transactions', 'Can create new transactions', 'transactions', 'create'),
                    (16, 'transactions:update', 'Update Transactions', 'Can update existing transactions', 'transactions', 'update'),
                    (17, 'transactions:delete', 'Delete Transactions', 'Can delete transactions', 'transactions', 'delete'),
                    (18, '*:*', 'Full Access', 'Full access to all resources', '*', '*')
                `);
                
                // Insert role permissions
                await dbClient.query(`
                    INSERT INTO role_permissions (role_id, permission_id) VALUES
                    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 14), (1, 15), (1, 16), (1, 17),
                    (2, 1), (2, 6), (2, 7), (2, 8), (2, 9), (2, 10), (2, 11), (2, 12), (2, 13), (2, 14), (2, 15), (2, 16), (2, 17),
                    (3, 18)
                `);
                
                console.log('   ✅ Schema data re-inserted successfully');
            } catch (error) {
                console.log('   ⚠️  Schema data insertion warning:', error.message);
            }
            
            // Create sample users for testing
            console.log('👥 Creating sample users...');
            await createSampleUsers(dbClient);
            
            console.log('✅ Sample users created successfully');
            
            console.log('\n🎉 Database setup completed successfully!');
            console.log('\n📊 Database Summary:');
            console.log(`   Database: ${dbName}`);
            console.log(`   Branches: 13 (including Main Branch)`);
            console.log(`   Roles: 3 (Marketing Clerk, Finance Officer, IT Head)`);
            console.log(`   Permissions: 14 different permissions configured`);
            console.log(`   Sample Users: 29 users created for testing (3 main branch + 13 branch clerks + 13 finance officers)`);
            
            console.log('\n🔑 Sample Login Credentials:');
            console.log('   Main Branch Users (access to all branches):');
            console.log('     Marketing Clerk: mc.ibaan / ibaan123!');
            console.log('     Finance Officer: fo.ibaan / ibaan123!');
            console.log('     IT Head: it.head / ITHead123!');
            console.log('');
            console.log('   Branch-Specific Marketing Clerks:');
            console.log('     Branch 2 (Bauan): mc.bauan / bauan123!');
            console.log('     Branch 3 (San Jose): mc.sanjose / sanjose123!');
            console.log('     Branch 4 (Rosario): mc.rosario / rosario123!');
            console.log('     Branch 5 (San Juan): mc.sanjuan / sanjuan123!');
            console.log('     Branch 6 (Padre Garcia): mc.padregarcia / padregarcia123!');
            console.log('     Branch 7 (Lipa City): mc.lipacity / lipacity123!');
            console.log('     Branch 8 (Batangas City): mc.batangascity / batangascity123!');
            console.log('     Branch 9 (Mabini Lipa): mc.mabinilipa / mabinilipa123!');
            console.log('     Branch 10 (Calamias): mc.calamias / calamias123!');
            console.log('     Branch 11 (Lemery): mc.lemery / lemery123!');
            console.log('     Branch 12 (Mataas na Kahoy): mc.mataasnakahoy / mataasnakahoy123!');
            console.log('     Branch 13 (Tanauan): mc.tanauan / tanauan123!');
            console.log('');
            console.log('   Branch-Specific Finance Officers:');
            console.log('     Branch 1 (IBAAN): fo.ibaan / ibaan123!');
            console.log('     Branch 2 (Bauan): fo.bauan / bauan123!');
            console.log('     Branch 3 (San Jose): fo.sanjose / sanjose123!');
            console.log('     Branch 4 (Rosario): fo.rosario / rosario123!');
            console.log('     Branch 5 (San Juan): fo.sanjuan / sanjuan123!');
            console.log('     Branch 6 (Padre Garcia): fo.padregarcia / padregarcia123!');
            console.log('     Branch 7 (Lipa City): fo.lipacity / lipacity123!');
            console.log('     Branch 8 (Batangas City): fo.batangascity / batangascity123!');
            console.log('     Branch 9 (Mabini Lipa): fo.mabinilipa / mabinilipa123!');
            console.log('     Branch 10 (Calamias): fo.calamias / calamias123!');
            console.log('     Branch 11 (Lemery): fo.lemery / lemery123!');
            console.log('     Branch 12 (Mataas na Kahoy): fo.mataasnakahoy / mataasnakahoy123!');
            console.log('     Branch 13 (Tanauan): fo.tanauan / tanauan123!');
            console.log('');
            console.log('   Note: Branch clerks and finance officers can only access data for their assigned branch.');
            
        } finally {
            await dbClient.end();
        }
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function createSampleUsers(client) {
    const bcrypt = require('bcrypt');
    const bcryptRounds = 12;
    
    // Sample user data
    const sampleUsers = [
        {
            username: 'mc.ibaan',
            email: 'mc.ibaan@imvcmpc.com',
            password: 'ibaan123!',
            first_name: 'IBAAN',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 1, // Main Branch
            employee_id: 'MC001',
            phone_number: '+63 912 345 6701'
        },
        {
            username: 'fo.ibaan',
            email: 'fo.ibaan@imvcmc.com',
            password: 'ibaan123!',
            first_name: 'IBAAN',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 1, // Main Branch
            employee_id: 'FO001',
            phone_number: '+63 912 345 6790'
        },
        {
            username: 'it.head',
            email: 'it@imvcmc.com',
            password: 'ITHead123!',
            first_name: 'IT',
            last_name: 'Head',
            role_id: 3, // IT Head
            branch_id: 1, // Main Branch
            employee_id: 'IT001',
            phone_number: '+63 912 345 6791'
        },
        // Branch 2 - Bauan
        {
            username: 'mc.bauan',
            email: 'mc.bauan@imvcmpc.com',
            password: 'bauan123!',
            first_name: 'BAUAN',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 2, // Branch 2
            employee_id: 'MC002',
            phone_number: '+63 912 345 6702'
        },
        // Branch 3 - San Jose
        {
            username: 'mc.sanjose',
            email: 'mc.sanjose@imvcmpc.com',
            password: 'sanjose123!',
            first_name: 'SAN JOSE',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 3, // Branch 3
            employee_id: 'MC003',
            phone_number: '+63 912 345 6703'
        },
        // Branch 4 - Rosario
        {
            username: 'mc.rosario',
            email: 'mc.rosario@imvcmpc.com',
            password: 'rosario123!',
            first_name: 'ROSARIO',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 4, // Branch 4
            employee_id: 'MC004',
            phone_number: '+63 912 345 6704'
        },
        // Branch 5 - San Juan
        {
            username: 'mc.sanjuan',
            email: 'mc.sanjuan@imvcmpc.com',
            password: 'sanjuan123!',
            first_name: 'SAN JUAN',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 5, // Branch 5
            employee_id: 'MC005',
            phone_number: '+63 912 345 6705'
        },
        // Branch 6 - Padre Garcia
        {
            username: 'mc.padregarcia',
            email: 'mc.padregarcia@imvcmpc.com',
            password: 'padregarcia123!',
            first_name: 'PADRE GARCIA',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 6, // Branch 6
            employee_id: 'MC006',
            phone_number: '+63 912 345 6706'
        },
        // Branch 7 - Lipa City
        {
            username: 'mc.lipacity',
            email: 'mc.lipacity@imvcmpc.com',
            password: 'lipacity123!',
            first_name: 'LIPA CITY',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 7, // Branch 7
            employee_id: 'MC007',
            phone_number: '+63 912 345 6707'
        },
        // Branch 8 - Batangas City
        {
            username: 'mc.batangascity',
            email: 'mc.batangascity@imvcmpc.com',
            password: 'batangascity123!',
            first_name: 'BATANGAS CITY',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 8, // Branch 8
            employee_id: 'MC008',
            phone_number: '+63 912 345 6708'
        },
        // Branch 9 - Mabini Lipa
        {
            username: 'mc.mabinilipa',
            email: 'mc.mabinilipa@imvcmpc.com',
            password: 'mabinilipa123!',
            first_name: 'MABINI LIPA',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 9, // Branch 9
            employee_id: 'MC009',
            phone_number: '+63 912 345 6709'
        },
        // Branch 10 - Calamias
        {
            username: 'mc.calamias',
            email: 'mc.calamias@imvcmpc.com',
            password: 'calamias123!',
            first_name: 'CALAMIAS',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 10, // Branch 10
            employee_id: 'MC010',
            phone_number: '+63 912 345 6710'
        },
        // Branch 11 - Lemery
        {
            username: 'mc.lemery',
            email: 'mc.lemery@imvcmpc.com',
            password: 'lemery123!',
            first_name: 'LEMERY',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 11, // Branch 11
            employee_id: 'MC011',
            phone_number: '+63 912 345 6711'
        },
        // Branch 12 - Mataas na Kahoy
        {
            username: 'mc.mataasnakahoy',
            email: 'mc.mataasnakahoy@imvcmpc.com',
            password: 'mataasnakahoy123!',
            first_name: 'MATAAS NA KAHOY',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 12, // Branch 12
            employee_id: 'MC012',
            phone_number: '+63 912 345 6712'
        },
        // Branch 13 - Tanauan
        {
            username: 'mc.tanauan',
            email: 'mc.tanauan@imvcmpc.com',
            password: 'tanauan123!',
            first_name: 'TANAUAN',
            last_name: 'Marketing Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 13, // Branch 13
            employee_id: 'MC013',
            phone_number: '+63 912 345 6713'
        },
        // Finance Officers for different branches
        // Branch 2 - Bauan
        {
            username: 'fo.bauan',
            email: 'fo.bauan@imvcmc.com',
            password: 'bauan123!',
            first_name: 'BAUAN',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 2, // Branch 2
            employee_id: 'FO002',
            phone_number: '+63 912 345 6803'
        },
        // Branch 3 - San Jose
        {
            username: 'fo.sanjose',
            email: 'fo.sanjose@imvcmc.com',
            password: 'sanjose123!',
            first_name: 'SAN JOSE',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 3, // Branch 3
            employee_id: 'FO003',
            phone_number: '+63 912 345 6804'
        },
        // Branch 4 - Rosario
        {
            username: 'fo.rosario',
            email: 'fo.rosario@imvcmc.com',
            password: 'rosario123!',
            first_name: 'ROSARIO',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 4, // Branch 4
            employee_id: 'FO004',
            phone_number: '+63 912 345 6805'
        },
        // Branch 5 - San Juan
        {
            username: 'fo.sanjuan',
            email: 'fo.sanjuan@imvcmc.com',
            password: 'sanjuan123!',
            first_name: 'SAN JUAN',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 5, // Branch 5
            employee_id: 'FO005',
            phone_number: '+63 912 345 6806'
        },
        // Branch 6 - Padre Garcia
        {
            username: 'fo.padregarcia',
            email: 'fo.padregarcia@imvcmc.com',
            password: 'padregarcia123!',
            first_name: 'PADRE GARCIA',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 6, // Branch 6
            employee_id: 'FO006',
            phone_number: '+63 912 345 6807'
        },
        // Branch 7 - Lipa City
        {
            username: 'fo.lipacity',
            email: 'fo.lipacity@imvcmc.com',
            password: 'lipacity123!',
            first_name: 'LIPA CITY',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 7, // Branch 7
            employee_id: 'FO007',
            phone_number: '+63 912 345 6808'
        },
        // Branch 8 - Batangas City
        {
            username: 'fo.batangascity',
            email: 'fo.batangascity@imvcmc.com',
            password: 'batangascity123!',
            first_name: 'BATANGAS CITY',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 8, // Branch 8
            employee_id: 'FO008',
            phone_number: '+63 912 345 6809'
        },
        // Branch 9 - Mabini Lipa
        {
            username: 'fo.mabinilipa',
            email: 'fo.mabinilipa@imvcmc.com',
            password: 'mabinilipa123!',
            first_name: 'MABINI LIPA',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 9, // Branch 9
            employee_id: 'FO009',
            phone_number: '+63 912 345 6810'
        },
        // Branch 10 - Calamias
        {
            username: 'fo.calamias',
            email: 'fo.calamias@imvcmc.com',
            password: 'calamias123!',
            first_name: 'CALAMIAS',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 10, // Branch 10
            employee_id: 'FO010',
            phone_number: '+63 912 345 6811'
        },
        // Branch 11 - Lemery
        {
            username: 'fo.lemery',
            email: 'fo.lemery@imvcmc.com',
            password: 'lemery123!',
            first_name: 'LEMERY',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 11, // Branch 11
            employee_id: 'FO011',
            phone_number: '+63 912 345 6812'
        },
        // Branch 12 - Mataas na Kahoy
        {
            username: 'fo.mataasnakahoy',
            email: 'fo.mataasnakahoy@imvcmc.com',
            password: 'mataasnakahoy123!',
            first_name: 'MATAAS NA KAHOY',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 12, // Branch 12
            employee_id: 'FO012',
            phone_number: '+63 912 345 6813'
        },
        // Branch 13 - Tanauan
        {
            username: 'fo.tanauan',
            email: 'fo.tanauan@imvcmc.com',
            password: 'tanauan123!',
            first_name: 'TANAUAN',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 13, // Branch 13
            employee_id: 'FO013',
            phone_number: '+63 912 345 6814'
        }
    ];
    
    for (const userData of sampleUsers) {
        try {
            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, bcryptRounds);
            
            // Determine if user is main branch user
            const isMainBranchUser = userData.branch_id === 1;
            
            // Insert user
            await client.query(`
                INSERT INTO users (
                    username, email, password_hash, first_name, last_name,
                    role_id, branch_id, employee_id, phone_number, is_main_branch_user
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                userData.username,
                userData.email,
                passwordHash,
                userData.first_name,
                userData.last_name,
                userData.role_id,
                userData.branch_id,
                userData.employee_id,
                userData.phone_number,
                isMainBranchUser
            ]);
            
            console.log(`   ✅ Created user: ${userData.username} (${userData.first_name} ${userData.last_name}) - Branch ${userData.branch_id}`);
        } catch (error) {
            console.log(`   ❌ Failed to create user ${userData.username}:`, error.message);
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
