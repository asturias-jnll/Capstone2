const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'imvcmpc_fms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'imvcmpc12'
});

async function insertSampleTransactions() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Inserting sample transactions...');
        
        // Sample transaction data
        const sampleTransactions = [
            {
                transaction_date: '2024-01-15',
                payee: 'Juan Dela Cruz',
                reference: 'REF001',
                cross_reference: 'CR001',
                check_number: 'CHK001',
                particulars: 'Initial savings deposit',
                debit_amount: 0,
                credit_amount: 5000,
                cash_in_bank: 5000,
                loan_receivables: 0,
                savings_deposits: 5000,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000' // Sample UUID
            },
            {
                transaction_date: '2024-01-16',
                payee: 'Maria Santos',
                reference: 'REF002',
                cross_reference: 'CR002',
                check_number: 'CHK002',
                particulars: 'Loan disbursement',
                debit_amount: 10000,
                credit_amount: 0,
                cash_in_bank: -10000,
                loan_receivables: 10000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-17',
                payee: 'Pedro Rodriguez',
                reference: 'REF003',
                cross_reference: 'CR003',
                check_number: 'CHK003',
                particulars: 'Interest income from loan',
                debit_amount: 0,
                credit_amount: 500,
                cash_in_bank: 500,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 500,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-18',
                payee: 'Ana Garcia',
                reference: 'REF004',
                cross_reference: 'CR004',
                check_number: 'CHK004',
                particulars: 'Service charge for late payment',
                debit_amount: 0,
                credit_amount: 100,
                cash_in_bank: 100,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 100,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-19',
                payee: 'Carlos Lopez',
                reference: 'REF005',
                cross_reference: 'CR005',
                check_number: 'CHK005',
                particulars: 'Monthly savings deposit',
                debit_amount: 0,
                credit_amount: 2000,
                cash_in_bank: 2000,
                loan_receivables: 0,
                savings_deposits: 2000,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-20',
                payee: 'Elena Martinez',
                reference: 'REF006',
                cross_reference: 'CR006',
                check_number: 'CHK006',
                particulars: 'Loan payment received',
                debit_amount: 0,
                credit_amount: 3000,
                cash_in_bank: 3000,
                loan_receivables: -3000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-21',
                payee: 'Roberto Silva',
                reference: 'REF007',
                cross_reference: 'CR007',
                check_number: 'CHK007',
                particulars: 'Sundries - Miscellaneous income',
                debit_amount: 0,
                credit_amount: 250,
                cash_in_bank: 250,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 250,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-22',
                payee: 'Isabel Torres',
                reference: 'REF008',
                cross_reference: 'CR008',
                check_number: 'CHK008',
                particulars: 'Emergency loan disbursement',
                debit_amount: 15000,
                credit_amount: 0,
                cash_in_bank: -15000,
                loan_receivables: 15000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-23',
                payee: 'Miguel Herrera',
                reference: 'REF009',
                cross_reference: 'CR009',
                check_number: 'CHK009',
                particulars: 'Term deposit placement',
                debit_amount: 0,
                credit_amount: 10000,
                cash_in_bank: 10000,
                loan_receivables: 0,
                savings_deposits: 10000,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2024-01-24',
                payee: 'Carmen Flores',
                reference: 'REF010',
                cross_reference: 'CR010',
                check_number: 'CHK010',
                particulars: 'Loan interest payment',
                debit_amount: 0,
                credit_amount: 750,
                cash_in_bank: 750,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 750,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            }
        ];
        
        // Get a valid user ID from the database
        const userResult = await client.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            throw new Error('No users found in database. Please run setup-database.js first.');
        }
        const userId = userResult.rows[0].id;
        
        // Insert sample transactions
        for (let i = 0; i < sampleTransactions.length; i++) {
            const transaction = sampleTransactions[i];
            transaction.created_by = userId; // Use actual user ID
            
            await client.query(`
                INSERT INTO transactions (
                    transaction_date, payee, reference, cross_reference, check_number,
                    particulars, debit_amount, credit_amount, cash_in_bank, loan_receivables,
                    savings_deposits, interest_income, service_charge, sundries,
                    branch_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
                transaction.transaction_date,
                transaction.payee,
                transaction.reference,
                transaction.cross_reference,
                transaction.check_number,
                transaction.particulars,
                transaction.debit_amount,
                transaction.credit_amount,
                transaction.cash_in_bank,
                transaction.loan_receivables,
                transaction.savings_deposits,
                transaction.interest_income,
                transaction.service_charge,
                transaction.sundries,
                transaction.branch_id,
                transaction.created_by
            ]);
            
            console.log(`   ✅ Inserted transaction ${i + 1}: ${transaction.payee} - ${transaction.particulars}`);
        }
        
        console.log(`\n🎉 Successfully inserted ${sampleTransactions.length} sample transactions!`);
        console.log('\n📊 Sample Data Summary:');
        console.log('   - 10 diverse transactions');
        console.log('   - Various transaction types (savings, loans, interest, service charges)');
        console.log('   - Different amounts and particulars');
        console.log('   - All assigned to Main Branch (Branch 1)');
        
        // Verify insertion
        const countResult = await client.query('SELECT COUNT(*) as count FROM transactions');
        console.log(`\n📈 Total transactions in database: ${countResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error inserting sample transactions:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
insertSampleTransactions().catch(console.error);
