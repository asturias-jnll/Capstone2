const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🧪 Testing Transaction API...\n');
        
        // Test 1: Get all transactions (without auth for now)
        console.log('1. Testing GET /api/auth/transactions...');
        try {
            const response = await fetch('http://localhost:3001/api/auth/transactions');
            const data = await response.json();
            console.log(`   Status: ${response.status}`);
            console.log(`   Response:`, data);
        } catch (error) {
            console.log(`   Error: ${error.message}`);
        }
        
        console.log('\n2. Testing server health...');
        try {
            const response = await fetch('http://localhost:3001/health');
            const data = await response.text();
            console.log(`   Status: ${response.status}`);
            console.log(`   Response: ${data}`);
        } catch (error) {
            console.log(`   Error: ${error.message}`);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAPI();
