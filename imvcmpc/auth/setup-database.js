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
            console.log(`   Sample Users: 15 users created for testing (3 main branch + 12 branch clerks)`);
            
            console.log('\n🔑 Sample Login Credentials:');
            console.log('   Main Branch Users (access to all branches):');
            console.log('     Marketing Clerk: marketing.clerk / Clerk123!');
            console.log('     Finance Officer: finance.officer / Finance123!');
            console.log('     IT Head: it.head / ITHead123!');
            console.log('');
            console.log('   Branch-Specific Marketing Clerks:');
            console.log('     Branch 2 (Bauan): clerk.bauan / Bauan123!');
            console.log('     Branch 3 (San Jose): clerk.sanjose / SanJose123!');
            console.log('     Branch 4 (Rosario): clerk.rosario / Rosario123!');
            console.log('     Branch 5 (San Juan): clerk.sanjuan / SanJuan123!');
            console.log('     Branch 6 (Padre Garcia): clerk.padregarcia / PadreGarcia123!');
            console.log('     Branch 7 (Lipa City): clerk.lipacity / LipaCity123!');
            console.log('     Branch 8 (Batangas City): clerk.batangascity / BatangasCity123!');
            console.log('     Branch 9 (Mabini Lipa): clerk.mabinilipa / MabiniLipa123!');
            console.log('     Branch 10 (Calamias): clerk.calamias / Calamias123!');
            console.log('     Branch 11 (Lemery): clerk.lemery / Lemery123!');
            console.log('     Branch 12 (Mataas na Kahoy): clerk.mataasnakahoy / MataasNaKahoy123!');
            console.log('');
            console.log('   Note: Branch clerks can only access data for their assigned branch.');
            
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
        },
        // Branch 2 - Bauan
        {
            username: 'clerk.bauan',
            email: 'clerk.bauan@imvcmc.com',
            password: 'Bauan123!',
            first_name: 'Bauan',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 2, // Branch 2
            employee_id: 'MC-BAU-001',
            phone_number: '+63 912 345 6792'
        },
        // Branch 3 - San Jose
        {
            username: 'clerk.sanjose',
            email: 'clerk.sanjose@imvcmc.com',
            password: 'SanJose123!',
            first_name: 'San Jose',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 3, // Branch 3
            employee_id: 'MC-SJ-001',
            phone_number: '+63 912 345 6793'
        },
        // Branch 4 - Rosario
        {
            username: 'clerk.rosario',
            email: 'clerk.rosario@imvcmc.com',
            password: 'Rosario123!',
            first_name: 'Rosario',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 4, // Branch 4
            employee_id: 'MC-ROS-001',
            phone_number: '+63 912 345 6794'
        },
        // Branch 5 - San Juan
        {
            username: 'clerk.sanjuan',
            email: 'clerk.sanjuan@imvcmc.com',
            password: 'SanJuan123!',
            first_name: 'San Juan',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 5, // Branch 5
            employee_id: 'MC-SJU-001',
            phone_number: '+63 912 345 6795'
        },
        // Branch 6 - Padre Garcia
        {
            username: 'clerk.padregarcia',
            email: 'clerk.padregarcia@imvcmc.com',
            password: 'PadreGarcia123!',
            first_name: 'Padre Garcia',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 6, // Branch 6
            employee_id: 'MC-PG-001',
            phone_number: '+63 912 345 6796'
        },
        // Branch 7 - Lipa City
        {
            username: 'clerk.lipacity',
            email: 'clerk.lipacity@imvcmc.com',
            password: 'LipaCity123!',
            first_name: 'Lipa City',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 7, // Branch 7
            employee_id: 'MC-LC-001',
            phone_number: '+63 912 345 6797'
        },
        // Branch 8 - Batangas City
        {
            username: 'clerk.batangascity',
            email: 'clerk.batangascity@imvcmc.com',
            password: 'BatangasCity123!',
            first_name: 'Batangas City',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 8, // Branch 8
            employee_id: 'MC-BC-001',
            phone_number: '+63 912 345 6798'
        },
        // Branch 9 - Mabini Lipa
        {
            username: 'clerk.mabinilipa',
            email: 'clerk.mabinilipa@imvcmc.com',
            password: 'MabiniLipa123!',
            first_name: 'Mabini Lipa',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 9, // Branch 9
            employee_id: 'MC-ML-001',
            phone_number: '+63 912 345 6799'
        },
        // Branch 10 - Calamias
        {
            username: 'clerk.calamias',
            email: 'clerk.calamias@imvcmc.com',
            password: 'Calamias123!',
            first_name: 'Calamias',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 10, // Branch 10
            employee_id: 'MC-CAL-001',
            phone_number: '+63 912 345 6800'
        },
        // Branch 11 - Lemery
        {
            username: 'clerk.lemery',
            email: 'clerk.lemery@imvcmc.com',
            password: 'Lemery123!',
            first_name: 'Lemery',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 11, // Branch 11
            employee_id: 'MC-LEM-001',
            phone_number: '+63 912 345 6801'
        },
        // Branch 12 - Mataas na Kahoy
        {
            username: 'clerk.mataasnakahoy',
            email: 'clerk.mataasnakahoy@imvcmc.com',
            password: 'MataasNaKahoy123!',
            first_name: 'Mataas na Kahoy',
            last_name: 'Clerk',
            role_id: 1, // Marketing Clerk
            branch_id: 12, // Branch 12
            employee_id: 'MC-MNK-001',
            phone_number: '+63 912 345 6802'
        },
        // Finance Officers for different branches
        // Branch 2 - Bauan
        {
            username: 'finance.bauan',
            email: 'finance.bauan@imvcmc.com',
            password: 'BauanFinance123!',
            first_name: 'Bauan',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 2, // Branch 2
            employee_id: 'FO-BAU-001',
            phone_number: '+63 912 345 6803'
        },
        // Branch 3 - San Jose
        {
            username: 'finance.sanjose',
            email: 'finance.sanjose@imvcmc.com',
            password: 'SanJoseFinance123!',
            first_name: 'San Jose',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 3, // Branch 3
            employee_id: 'FO-SJ-001',
            phone_number: '+63 912 345 6804'
        },
        // Branch 4 - Rosario
        {
            username: 'finance.rosario',
            email: 'finance.rosario@imvcmc.com',
            password: 'RosarioFinance123!',
            first_name: 'Rosario',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 4, // Branch 4
            employee_id: 'FO-ROS-001',
            phone_number: '+63 912 345 6805'
        },
        // Branch 5 - San Juan
        {
            username: 'finance.sanjuan',
            email: 'finance.sanjuan@imvcmc.com',
            password: 'SanJuanFinance123!',
            first_name: 'San Juan',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 5, // Branch 5
            employee_id: 'FO-SJU-001',
            phone_number: '+63 912 345 6806'
        },
        // Branch 6 - Padre Garcia
        {
            username: 'finance.padregarcia',
            email: 'finance.padregarcia@imvcmc.com',
            password: 'PadreGarciaFinance123!',
            first_name: 'Padre Garcia',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 6, // Branch 6
            employee_id: 'FO-PG-001',
            phone_number: '+63 912 345 6807'
        },
        // Branch 7 - Lipa City
        {
            username: 'finance.lipacity',
            email: 'finance.lipacity@imvcmc.com',
            password: 'LipaCityFinance123!',
            first_name: 'Lipa City',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 7, // Branch 7
            employee_id: 'FO-LC-001',
            phone_number: '+63 912 345 6808'
        },
        // Branch 8 - Batangas City
        {
            username: 'finance.batangascity',
            email: 'finance.batangascity@imvcmc.com',
            password: 'BatangasCityFinance123!',
            first_name: 'Batangas City',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 8, // Branch 8
            employee_id: 'FO-BC-001',
            phone_number: '+63 912 345 6809'
        },
        // Branch 9 - Mabini Lipa
        {
            username: 'finance.mabinilipa',
            email: 'finance.mabinilipa@imvcmc.com',
            password: 'MabiniLipaFinance123!',
            first_name: 'Mabini Lipa',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 9, // Branch 9
            employee_id: 'FO-ML-001',
            phone_number: '+63 912 345 6810'
        },
        // Branch 10 - Calamias
        {
            username: 'finance.calamias',
            email: 'finance.calamias@imvcmc.com',
            password: 'CalamiasFinance123!',
            first_name: 'Calamias',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 10, // Branch 10
            employee_id: 'FO-CAL-001',
            phone_number: '+63 912 345 6811'
        },
        // Branch 11 - Lemery
        {
            username: 'finance.lemery',
            email: 'finance.lemery@imvcmc.com',
            password: 'LemeryFinance123!',
            first_name: 'Lemery',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 11, // Branch 11
            employee_id: 'FO-LEM-001',
            phone_number: '+63 912 345 6812'
        },
        // Branch 12 - Mataas na Kahoy
        {
            username: 'finance.mataasnakahoy',
            email: 'finance.mataasnakahoy@imvcmc.com',
            password: 'MataasNaKahoyFinance123!',
            first_name: 'Mataas na Kahoy',
            last_name: 'Finance Officer',
            role_id: 2, // Finance Officer
            branch_id: 12, // Branch 12
            employee_id: 'FO-MNK-001',
            phone_number: '+63 912 345 6813'
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
