const fetch = require('node-fetch');

async function testAPIWithAuth() {
    try {
        console.log('🧪 Testing Transaction API with Authentication...\n');
        
        // Step 1: Login to get a token
        console.log('1. Logging in to get authentication token...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'mc.ibaan',
                password: 'ibaan123!'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log(`   Login Status: ${loginResponse.status}`);
        console.log(`   Login Response:`, loginData);
        
        if (loginData.success && loginData.tokens && loginData.tokens.access_token) {
            const token = loginData.tokens.access_token;
            console.log('   ✅ Login successful, got token\n');
            
            // Step 2: Test transactions API with token
            console.log('2. Testing GET /api/auth/transactions with token...');
            const transactionsResponse = await fetch('http://localhost:3001/api/auth/transactions', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const transactionsData = await transactionsResponse.json();
            console.log(`   Status: ${transactionsResponse.status}`);
            console.log(`   Success: ${transactionsData.success}`);
            console.log(`   Count: ${transactionsData.count || 'N/A'}`);
            
            if (transactionsData.success && transactionsData.data) {
                console.log(`   ✅ Found ${transactionsData.data.length} transactions`);
                console.log('   Sample transaction:', {
                    payee: transactionsData.data[0]?.payee,
                    particulars: transactionsData.data[0]?.particulars,
                    amount: transactionsData.data[0]?.debit_amount || transactionsData.data[0]?.credit_amount
                });
            } else {
                console.log('   ❌ Failed to fetch transactions');
                console.log('   Error:', transactionsData.message || transactionsData.error);
            }
            
        } else {
            console.log('   ❌ Login failed');
            console.log('   Error:', loginData.message || loginData.error);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAPIWithAuth();
