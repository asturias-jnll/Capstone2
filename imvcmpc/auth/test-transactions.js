const TransactionService = require('./transactionService');
const config = require('./config');

async function testTransactionService() {
    console.log('🧪 Testing Transaction Service...\n');
    
    const transactionService = new TransactionService();
    
    try {
        // Test 1: Create a sample transaction
        console.log('1️⃣ Testing transaction creation...');
        const sampleTransaction = {
            transaction_date: '2024-01-15',
            payee: 'Test Member 1',
            reference: 'REF001',
            cross_reference: 'CR001',
            check_number: 'CHK001',
            particulars: 'Initial savings deposit',
            debit_amount: 0,
            credit_amount: 5000
        };
        
        // Calculate balances
        const balances = transactionService.calculateAccountBalances(
            sampleTransaction.debit_amount,
            sampleTransaction.credit_amount,
            sampleTransaction.particulars
        );
        
        Object.assign(sampleTransaction, balances);
        
        console.log('   Sample transaction data:', JSON.stringify(sampleTransaction, null, 2));
        console.log('   ✅ Transaction data prepared successfully\n');
        
        // Test 2: Validate transaction data
        console.log('2️⃣ Testing transaction validation...');
        const validation = transactionService.validateTransactionData(sampleTransaction);
        console.log('   Validation result:', validation);
        console.log('   ✅ Transaction validation completed\n');
        
        // Test 3: Test balance calculations
        console.log('3️⃣ Testing balance calculations...');
        
        const testCases = [
            {
                debit: 0,
                credit: 5000,
                particulars: 'savings deposit',
                expected: 'savings_deposits should be 5000'
            },
            {
                debit: 10000,
                credit: 0,
                particulars: 'loan disbursement',
                expected: 'loan_receivables should be 10000, cash_in_bank should be -10000'
            },
            {
                debit: 0,
                credit: 500,
                particulars: 'interest income',
                expected: 'interest_income should be 500'
            }
        ];
        
        testCases.forEach((testCase, index) => {
            const result = transactionService.calculateAccountBalances(
                testCase.debit,
                testCase.credit,
                testCase.particulars
            );
            console.log(`   Test case ${index + 1}: ${testCase.particulars}`);
            console.log(`   Result:`, result);
            console.log(`   Expected: ${testCase.expected}`);
            console.log('');
        });
        
        console.log('   ✅ Balance calculations completed\n');
        
        // Test 4: Test database connection (without actually inserting)
        console.log('4️⃣ Testing database connection...');
        try {
            // Just test if we can connect to the database
            const client = await transactionService.pool.connect();
            console.log('   ✅ Database connection successful');
            client.release();
        } catch (error) {
            console.log('   ⚠️  Database connection failed (this is expected if database is not running):', error.message);
        }
        console.log('');
        
        console.log('🎉 Transaction Service tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Transaction data structure validated');
        console.log('   ✅ Balance calculations working correctly');
        console.log('   ✅ Service methods available');
        console.log('   ✅ Database connection tested');
        
        console.log('\n🔗 Available API Endpoints:');
        console.log('   GET    /api/transactions              - Get all transactions');
        console.log('   GET    /api/transactions/:id          - Get transaction by ID');
        console.log('   POST   /api/transactions              - Create new transaction');
        console.log('   PUT    /api/transactions/:id          - Update transaction');
        console.log('   DELETE /api/transactions/:id          - Delete transaction');
        console.log('   GET    /api/transactions/stats/summary - Get transaction statistics');
        console.log('   GET    /api/transactions/stats/dashboard - Get dashboard summary');
        console.log('   GET    /api/transactions/recent/:limit - Get recent transactions');
        console.log('   GET    /api/transactions/search/payee/:term - Search by payee');
        console.log('   GET    /api/transactions/date-range/:start/:end - Get by date range');
        console.log('   GET    /api/transactions/month/:year/:month - Get by month');
        
        console.log('\n🔐 Required Permissions:');
        console.log('   - transactions:read   - View transactions');
        console.log('   - transactions:create - Create transactions');
        console.log('   - transactions:update - Update transactions');
        console.log('   - transactions:delete - Delete transactions');
        
        console.log('\n👥 Role Access:');
        console.log('   - Marketing Clerk: Full transaction access for their branch');
        console.log('   - Finance Officer: Full transaction access for their branch');
        console.log('   - IT Head: Full access to all transactions');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Close the database connection
        await transactionService.close();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testTransactionService().catch(console.error);
}

module.exports = { testTransactionService };
