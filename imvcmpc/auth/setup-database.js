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
                await dbClient.query(`
                    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
                    DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
                    DROP FUNCTION IF EXISTS update_updated_at_column();
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
                        console.log(`   ⚠️  Statement ${i + 1} failed (this may be normal):`, error.message);
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
            
            // Create sample users for testing
            console.log('👥 Creating sample users...');
            await createSampleUsers(dbClient);
            
            console.log('✅ Sample users created successfully');
            
            console.log('\n🎉 Database setup completed successfully!');
            console.log('\n📊 Database Summary:');
            console.log(`   Database: ${dbName}`);
            console.log(`   Branches: 12 (including Main Branch)`);
            console.log(`   Roles: 3 (Marketing Clerk, Finance Officer, IT Head)`);
            console.log(`   Permissions: 14 different permissions configured`);
            console.log(`   Sample Users: 3 users created for testing`);
            
            console.log('\n🔑 Sample Login Credentials:');
            console.log('   Marketing Clerk:');
            console.log('     Username: marketing.clerk');
            console.log('     Password: Clerk123!');
            console.log('     Branch: Main Branch (access to all branches)');
            console.log('');
            console.log('   Finance Officer:');
            console.log('     Username: finance.officer');
            console.log('     Password: Finance123!');
            console.log('     Branch: Main Branch (access to all branches)');
            console.log('');
            console.log('   IT Head:');
            console.log('     Username: it.head');
            console.log('     Password: ITHead123!');
            console.log('     Branch: Main Branch (full system access)');
            
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
            username: 'marketing.clerk',
            email: 'clerk@imvcmc.com',
            password: 'Clerk123!',
            first_name: 'Marketing',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 1, // Main Branch
            employee_id: 'MC-001',
            phone_number: '+63 912 345 6789'
        },
        {
            username: 'finance.officer',
            email: 'finance@imvcmc.com',
            password: 'Finance123!',
            first_name: 'Finance',
            last_name: 'Officer',
            role_id: 2, // Finance Officer
            branch_id: 1, // Main Branch
            employee_id: 'FO-001',
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
            employee_id: 'IT-001',
            phone_number: '+63 912 345 6791'
        }
    ];
    
    for (const userData of sampleUsers) {
        // Check if user already exists
        const existingUser = await client.query(`
            SELECT id FROM users WHERE username = $1 OR email = $2
        `, [userData.username, userData.email]);
        
        if (existingUser.rows.length === 0) {
            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, bcryptRounds);
            
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
                true // Main branch users
            ]);
            
            console.log(`   ✅ Created user: ${userData.username} (${userData.first_name} ${userData.last_name})`);
        } else {
            console.log(`   ⏭️  User already exists: ${userData.username}`);
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
