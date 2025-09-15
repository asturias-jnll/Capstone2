const db = require('./database');

async function testConnection() {
    try {
        console.log('🧪 Testing database connection...\n');
        
        // Test basic connection
        const connectionTest = await db.testConnection();
        console.log(`✅ Connection test: ${connectionTest ? 'PASSED' : 'FAILED'}\n`);
        
        // Test users table query
        console.log('👥 Testing users table query...');
        const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table accessible: ${usersResult.rows[0].count} users found\n`);
        
        // Test transactions table query
        console.log('💰 Testing transactions table query...');
        const transactionsResult = await db.query('SELECT COUNT(*) as count FROM transactions');
        console.log(`✅ Transactions table accessible: ${transactionsResult.rows[0].count} transactions found\n`);
        
        // Test a sample user query (like authService does)
        console.log('🔐 Testing authentication query...');
        const authResult = await db.query(`
            SELECT u.*, r.name as role_name, r.display_name as role_display_name,
                   b.name as branch_name, b.location as branch_location, b.is_main_branch
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.username = $1 AND u.is_active = true
        `, ['mc.ibaan']);
        
        if (authResult.rows.length > 0) {
            console.log(`✅ Authentication query works: Found user ${authResult.rows[0].username}`);
        } else {
            console.log('❌ Authentication query failed: No user found');
        }
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
    } finally {
        await db.close();
    }
}

testConnection();
