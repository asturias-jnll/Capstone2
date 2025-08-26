const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'imvcmpc_fms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'imvcmpc12'
});

async function testDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Testing database structure and data...\n');
        
        // Test 1: Check tables
        console.log('📊 Test 1: Database Tables');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('Tables found:', tables.rows.map(r => r.table_name).join(', '));
        console.log('Total tables:', tables.rows.length);
        
        // Test 2: Check record counts
        console.log('\n📈 Test 2: Record Counts');
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        console.log('Users count:', userCount.rows[0].count);
        
        const branchCount = await client.query('SELECT COUNT(*) as count FROM branches');
        console.log('Branches count:', branchCount.rows[0].count);
        
        const roleCount = await client.query('SELECT COUNT(*) as count FROM roles');
        console.log('Roles count:', roleCount.rows[0].count);
        
        const permissionCount = await client.query('SELECT COUNT(*) as count FROM permissions');
        console.log('Permissions count:', permissionCount.rows[0].count);
        
        // Test 3: Sample data verification
        console.log('\n👤 Test 3: Sample Users');
        const sampleUsers = await client.query(`
            SELECT username, role_id, branch_id, employee_id, is_main_branch_user
            FROM users 
            ORDER BY branch_id, role_id 
            LIMIT 10
        `);
        
        sampleUsers.rows.forEach(user => {
            const roleName = user.role_id === 1 ? 'Marketing Clerk' : 
                           user.role_id === 2 ? 'Finance Officer' : 'IT Head';
            console.log(`   ${user.username} - ${roleName} (Branch: ${user.branch_id}, ID: ${user.employee_id})`);
        });
        
        // Test 4: Check branches
        console.log('\n🏢 Test 4: Branches');
        const branches = await client.query(`
            SELECT id, name, location, is_main_branch 
            FROM branches 
            ORDER BY id
        `);
        
        branches.rows.forEach(branch => {
            const mainBranch = branch.is_main_branch ? ' (Main)' : '';
            console.log(`   ${branch.id}: ${branch.name} - ${branch.location}${mainBranch}`);
        });
        
        // Test 5: Check roles and permissions
        console.log('\n🎭 Test 5: Roles and Permissions');
        const roles = await client.query(`
            SELECT r.id, r.name, r.display_name, COUNT(rp.permission_id) as permission_count
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            GROUP BY r.id, r.name, r.display_name
            ORDER BY r.id
        `);
        
        roles.rows.forEach(role => {
            console.log(`   ${role.id}: ${role.display_name} (${role.name}) - ${role.permission_count} permissions`);
        });
        
        // Test 6: Test a simple query
        console.log('\n✅ Test 6: Simple Query Test');
        const testQuery = await client.query(`
            SELECT u.username, r.display_name, b.name as branch_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            JOIN branches b ON u.branch_id = b.id
            WHERE u.username = 'mc.ibaan'
        `);
        
        if (testQuery.rows.length > 0) {
            const user = testQuery.rows[0];
            console.log(`   Found user: ${user.username} - ${user.display_name} at ${user.branch_name}`);
        } else {
            console.log('   ❌ Test query failed - user not found');
        }
        
        console.log('\n🎉 Database test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the test
testDatabase().catch(console.error);
