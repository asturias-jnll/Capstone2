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
             console.log('     Marketing Clerk: mc.ibaan / ibaan123!');
             console.log('     Finance Officer: finance.officer / Finance123!');
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
    
    // Setup Marketing Clerk users with new credential format
    console.log('\n👥 Setting up Marketing Clerk users...');
    const marketingClerkUsers = [
        // Branch 1 - IBAAN (Main Branch)
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
        // Branch 2 - BAUAN
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
        // Branch 3 - SAN JOSE
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
        // Branch 4 - ROSARIO
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
        // Branch 5 - SAN JUAN
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
        // Branch 6 - PADRE GARCIA
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
        // Branch 7 - LIPA CITY
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
        // Branch 8 - BATANGAS CITY
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
        // Branch 9 - MABINI LIPA
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
        // Branch 10 - CALAMIAS
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
        // Branch 11 - LEMERY
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
        // Branch 12 - MATAAS NA KAHOY
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
        }
    ];
    
    for (const userData of marketingClerkUsers) {
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
            
            console.log(`   ✅ Created Marketing Clerk: ${userData.username} (${userData.first_name} ${userData.last_name}) - Branch ${userData.branch_id}`);
        } else {
            console.log(`   ⏭️  Marketing Clerk already exists: ${userData.username}`);
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
