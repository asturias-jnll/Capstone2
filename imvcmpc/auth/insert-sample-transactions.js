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
            },
            // August 2025 Transactions
            {
                transaction_date: '2025-08-01',
                payee: 'Luis Mendoza',
                reference: 'REF011',
                cross_reference: 'CR011',
                check_number: 'CHK011',
                particulars: 'Business loan disbursement',
                debit_amount: 25000,
                credit_amount: 0,
                cash_in_bank: -25000,
                loan_receivables: 25000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-03',
                payee: 'Sofia Reyes',
                reference: 'REF012',
                cross_reference: 'CR012',
                check_number: 'CHK012',
                particulars: 'Emergency savings withdrawal',
                debit_amount: 5000,
                credit_amount: 0,
                cash_in_bank: -5000,
                loan_receivables: 0,
                savings_deposits: -5000,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-05',
                payee: 'Fernando Castro',
                reference: 'REF013',
                cross_reference: 'CR013',
                check_number: 'CHK013',
                particulars: 'Monthly loan payment',
                debit_amount: 0,
                credit_amount: 4000,
                cash_in_bank: 4000,
                loan_receivables: -4000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-08',
                payee: 'Patricia Morales',
                reference: 'REF014',
                cross_reference: 'CR014',
                check_number: 'CHK014',
                particulars: 'Term deposit maturity',
                debit_amount: 0,
                credit_amount: 15000,
                cash_in_bank: 15000,
                loan_receivables: 0,
                savings_deposits: 15000,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-10',
                payee: 'Ricardo Vargas',
                reference: 'REF015',
                cross_reference: 'CR015',
                check_number: 'CHK015',
                particulars: 'Service charge for account maintenance',
                debit_amount: 0,
                credit_amount: 200,
                cash_in_bank: 200,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 200,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-12',
                payee: 'Gabriela Jimenez',
                reference: 'REF016',
                cross_reference: 'CR016',
                check_number: 'CHK016',
                particulars: 'Educational loan disbursement',
                debit_amount: 18000,
                credit_amount: 0,
                cash_in_bank: -18000,
                loan_receivables: 18000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-15',
                payee: 'Hector Delgado',
                reference: 'REF017',
                cross_reference: 'CR017',
                check_number: 'CHK017',
                particulars: 'Interest income from investments',
                debit_amount: 0,
                credit_amount: 1200,
                cash_in_bank: 1200,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 1200,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-18',
                payee: 'Valentina Ruiz',
                reference: 'REF018',
                cross_reference: 'CR018',
                check_number: 'CHK018',
                particulars: 'Housing loan application fee',
                debit_amount: 0,
                credit_amount: 500,
                cash_in_bank: 500,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 500,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-20',
                payee: 'Oscar Medina',
                reference: 'REF019',
                cross_reference: 'CR019',
                check_number: 'CHK019',
                particulars: 'Sundries - Late payment penalty',
                debit_amount: 0,
                credit_amount: 300,
                cash_in_bank: 300,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 300,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-08-22',
                payee: 'Adriana Vega',
                reference: 'REF020',
                cross_reference: 'CR020',
                check_number: 'CHK020',
                particulars: 'Regular savings deposit',
                debit_amount: 0,
                credit_amount: 3500,
                cash_in_bank: 3500,
                loan_receivables: 0,
                savings_deposits: 3500,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            // September 2025 Transactions
            {
                transaction_date: '2025-09-02',
                payee: 'Diego Ortega',
                reference: 'REF021',
                cross_reference: 'CR021',
                check_number: 'CHK021',
                particulars: 'Vehicle loan disbursement',
                debit_amount: 30000,
                credit_amount: 0,
                cash_in_bank: -30000,
                loan_receivables: 30000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-04',
                payee: 'Natalia Herrera',
                reference: 'REF022',
                cross_reference: 'CR022',
                check_number: 'CHK022',
                particulars: 'Loan principal payment',
                debit_amount: 0,
                credit_amount: 6000,
                cash_in_bank: 6000,
                loan_receivables: -6000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-06',
                payee: 'Manuel Aguilar',
                reference: 'REF023',
                cross_reference: 'CR023',
                check_number: 'CHK023',
                particulars: 'Interest income from term deposit',
                debit_amount: 0,
                credit_amount: 800,
                cash_in_bank: 800,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 800,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-09',
                payee: 'Camila Rodriguez',
                reference: 'REF024',
                cross_reference: 'CR024',
                check_number: 'CHK024',
                particulars: 'Emergency loan disbursement',
                debit_amount: 12000,
                credit_amount: 0,
                cash_in_bank: -12000,
                loan_receivables: 12000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-11',
                payee: 'Andres Moreno',
                reference: 'REF025',
                cross_reference: 'CR025',
                check_number: 'CHK025',
                particulars: 'Service charge for loan processing',
                debit_amount: 0,
                credit_amount: 150,
                cash_in_bank: 150,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 150,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-13',
                payee: 'Lucia Pena',
                reference: 'REF026',
                cross_reference: 'CR026',
                check_number: 'CHK026',
                particulars: 'Monthly savings contribution',
                debit_amount: 0,
                credit_amount: 1800,
                cash_in_bank: 1800,
                loan_receivables: 0,
                savings_deposits: 1800,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-16',
                payee: 'Sebastian Cruz',
                reference: 'REF027',
                cross_reference: 'CR027',
                check_number: 'CHK027',
                particulars: 'Sundries - Account transfer fee',
                debit_amount: 0,
                credit_amount: 100,
                cash_in_bank: 100,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 100,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-18',
                payee: 'Elena Gutierrez',
                reference: 'REF028',
                cross_reference: 'CR028',
                check_number: 'CHK028',
                particulars: 'Business expansion loan',
                debit_amount: 40000,
                credit_amount: 0,
                cash_in_bank: -40000,
                loan_receivables: 40000,
                savings_deposits: 0,
                interest_income: 0,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-20',
                payee: 'Rafael Mendoza',
                reference: 'REF029',
                cross_reference: 'CR029',
                check_number: 'CHK029',
                particulars: 'Interest payment on loan',
                debit_amount: 0,
                credit_amount: 950,
                cash_in_bank: 950,
                loan_receivables: 0,
                savings_deposits: 0,
                interest_income: 950,
                service_charge: 0,
                sundries: 0,
                branch_id: 1,
                created_by: '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                transaction_date: '2025-09-23',
                payee: 'Isabella Torres',
                reference: 'REF030',
                cross_reference: 'CR030',
                check_number: 'CHK030',
                particulars: 'Term deposit placement',
                debit_amount: 0,
                credit_amount: 20000,
                cash_in_bank: 20000,
                loan_receivables: 0,
                savings_deposits: 20000,
                interest_income: 0,
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
        
        // Insert sample transactions into both tables
        for (let i = 0; i < sampleTransactions.length; i++) {
            const transaction = sampleTransactions[i];
            transaction.created_by = userId; // Use actual user ID
            
            // Generate a single UUID for this transaction to use in both tables
            const transactionId = require('crypto').randomUUID();
            
            // Insert into ibaan_transactions (main branch transactions)
            await client.query(`
                INSERT INTO ibaan_transactions (
                    id, transaction_date, payee, reference, cross_reference, check_number,
                    particulars, debit_amount, credit_amount, cash_in_bank, loan_receivables,
                    savings_deposits, interest_income, service_charge, sundries,
                    branch_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `, [
                transactionId,
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
            
            // Insert into all_branch_transactions (consolidated view) with the same ID
            await client.query(`
                INSERT INTO all_branch_transactions (
                    id, transaction_date, payee, reference, cross_reference, check_number,
                    particulars, debit_amount, credit_amount, cash_in_bank, loan_receivables,
                    savings_deposits, interest_income, service_charge, sundries,
                    branch_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `, [
                transactionId,
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
            
            console.log(`   ✅ Inserted transaction ${i + 1}: ${transaction.payee} - ${transaction.particulars} (ID: ${transactionId})`);
        }
        
        console.log(`\n🎉 Successfully inserted ${sampleTransactions.length} sample transactions!`);
        console.log('\n📊 Sample Data Summary:');
        console.log('   - 30 diverse transactions');
        console.log('   - Various transaction types (savings, loans, interest, service charges)');
        console.log('   - Different amounts and particulars');
        console.log('   - All assigned to Main Branch (Branch 1)');
        console.log('   - Includes August 2025 and September 2025 transactions');
        
        // Verify insertion
        const ibaanCountResult = await client.query('SELECT COUNT(*) as count FROM ibaan_transactions');
        const allBranchCountResult = await client.query('SELECT COUNT(*) as count FROM all_branch_transactions');
        console.log(`\n📈 Total transactions in ibaan_transactions: ${ibaanCountResult.rows[0].count}`);
        console.log(`📈 Total transactions in all_branch_transactions: ${allBranchCountResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error inserting sample transactions:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
insertSampleTransactions().catch(console.error);
