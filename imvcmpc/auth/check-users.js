const { Pool } = require('pg');
const config = require('./config');

async function checkUsers() {
    const pool = new Pool(config.database);
    
    try {
        console.log('👥 Checking users in database...\n');
        
        const result = await pool.query(`
            SELECT id, username, role, branch_id, is_active 
            FROM users 
            WHERE is_active = true 
            ORDER BY username
        `);
        
        console.log(`Found ${result.rows.length} active users:\n`);
        
        result.rows.forEach((user, index) => {
            console.log(`${index + 1}. Username: ${user.username}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Branch ID: ${user.branch_id}`);
            console.log(`   Active: ${user.is_active}`);
            console.log('');
        });
        
        // Test login with first user
        if (result.rows.length > 0) {
            const testUser = result.rows[0];
            console.log(`🧪 Testing login with user: ${testUser.username}`);
            
            const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: testUser.username,
                    password: 'password123' // Default password
                })
            });
            
            const loginData = await loginResponse.json();
            console.log(`   Status: ${loginResponse.status}`);
            console.log(`   Success: ${loginData.success}`);
            
            if (loginData.success) {
                console.log('   ✅ Login successful!');
                return loginData.data.access_token;
            } else {
                console.log('   ❌ Login failed:', loginData.message);
            }
        }
        
    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await pool.end();
    }
}

checkUsers();
