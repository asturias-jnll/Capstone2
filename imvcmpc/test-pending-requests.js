// Test script to check pending requests functionality
const { Pool } = require('pg');
const config = require('./auth/config');

async function testPendingRequests() {
    const pool = new Pool(config.database);
    
    try {
        console.log('🔍 Testing pending requests functionality...\n');
        
        // 1. Check if change_requests table exists and has data
        console.log('1. Checking change_requests table...');
        const tableCheck = await pool.query(`
            SELECT COUNT(*) as count FROM change_requests
        `);
        console.log(`   Total change requests in database: ${tableCheck.rows[0].count}`);
        
        // 2. Check pending requests specifically
        console.log('\n2. Checking pending requests...');
        const pendingCheck = await pool.query(`
            SELECT COUNT(*) as count FROM change_requests WHERE status = 'pending'
        `);
        console.log(`   Pending requests: ${pendingCheck.rows[0].count}`);
        
        // 3. Check all change requests with details
        console.log('\n3. All change requests:');
        const allRequests = await pool.query(`
            SELECT 
                cr.id,
                cr.status,
                cr.request_type,
                cr.created_at,
                cr.branch_id,
                b.name as branch_name,
                u1.first_name as requested_by_first_name,
                u1.last_name as requested_by_last_name,
                u2.first_name as assigned_to_first_name,
                u2.last_name as assigned_to_last_name
            FROM change_requests cr
            LEFT JOIN branches b ON cr.branch_id = b.id
            LEFT JOIN users u1 ON cr.requested_by = u1.id
            LEFT JOIN users u2 ON cr.assigned_to = u2.id
            ORDER BY cr.created_at DESC
        `);
        
        if (allRequests.rows.length === 0) {
            console.log('   No change requests found in database.');
            console.log('   This might be why the finance officer modal is empty.');
        } else {
            allRequests.rows.forEach((request, index) => {
                console.log(`   ${index + 1}. ID: ${request.id.substring(0, 8)}...`);
                console.log(`      Status: ${request.status}`);
                console.log(`      Type: ${request.request_type}`);
                console.log(`      Branch: ${request.branch_name} (ID: ${request.branch_id})`);
                console.log(`      Requested by: ${request.requested_by_first_name} ${request.requested_by_last_name}`);
                console.log(`      Assigned to: ${request.assigned_to_first_name || 'None'} ${request.assigned_to_last_name || ''}`);
                console.log(`      Created: ${request.created_at}`);
                console.log('');
            });
        }
        
        // 4. Check users and roles
        console.log('4. Checking users and roles...');
        const usersCheck = await pool.query(`
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.branch_id,
                r.name as role_name,
                b.name as branch_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE r.name IN ('finance_officer', 'marketing_clerk')
            ORDER BY r.name, u.first_name
        `);
        
        console.log(`   Found ${usersCheck.rows.length} users with relevant roles:`);
        usersCheck.rows.forEach(user => {
            console.log(`   - ${user.first_name} ${user.last_name} (${user.role_name}) - Branch: ${user.branch_name}`);
        });
        
        // 5. Test the exact query that finance officers would use
        console.log('\n5. Testing finance officer query...');
        const financeOfficerQuery = `
            SELECT 
                cr.*,
                u1.first_name as requested_by_first_name,
                u1.last_name as requested_by_last_name,
                u1.username as requested_by_username,
                u2.first_name as assigned_to_first_name,
                u2.last_name as assigned_to_last_name,
                u2.username as assigned_to_username,
                b.name as branch_name
            FROM change_requests cr
            LEFT JOIN users u1 ON cr.requested_by = u1.id
            LEFT JOIN users u2 ON cr.assigned_to = u2.id
            LEFT JOIN branches b ON cr.branch_id = b.id
            WHERE cr.branch_id = $1 AND cr.status = $2
            ORDER BY cr.created_at DESC
        `;
        
        // Test with branch_id = 1 and status = 'pending'
        const testResult = await pool.query(financeOfficerQuery, [1, 'pending']);
        console.log(`   Finance officer query result: ${testResult.rows.length} requests`);
        
        if (testResult.rows.length > 0) {
            console.log('   Sample request:');
            const sample = testResult.rows[0];
            console.log(`   - ID: ${sample.id}`);
            console.log(`   - Status: ${sample.status}`);
            console.log(`   - Requested by: ${sample.requested_by_first_name} ${sample.requested_by_last_name}`);
            console.log(`   - Branch: ${sample.branch_name}`);
        }
        
    } catch (error) {
        console.error('❌ Error testing pending requests:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testPendingRequests().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
