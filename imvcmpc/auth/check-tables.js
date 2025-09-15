const { Pool } = require('pg');
const config = require('./config');

async function checkTables() {
    const pool = new Pool(config.database);
    
    try {
        console.log('🔍 Checking database tables...\n');
        
        // Check if database exists and is accessible
        const dbCheck = await pool.query('SELECT current_database()');
        console.log(`✅ Connected to database: ${dbCheck.rows[0].current_database}\n`);
        
        // List all tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log(`📊 Found ${tablesResult.rows.length} tables:`);
        tablesResult.rows.forEach((table, index) => {
            console.log(`   ${index + 1}. ${table.table_name}`);
        });
        
        // Check if users table exists
        const usersExists = tablesResult.rows.some(row => row.table_name === 'users');
        console.log(`\n👥 Users table exists: ${usersExists ? '✅ YES' : '❌ NO'}`);
        
        // Check if transactions table exists
        const transactionsExists = tablesResult.rows.some(row => row.table_name === 'transactions');
        console.log(`💰 Transactions table exists: ${transactionsExists ? '✅ YES' : '❌ NO'}`);
        
        if (!usersExists) {
            console.log('\n🚨 CRITICAL: Users table is missing!');
            console.log('   This is why authentication is failing.');
            console.log('   Need to recreate the database schema.');
        }
        
    } catch (error) {
        console.error('❌ Error checking tables:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();
