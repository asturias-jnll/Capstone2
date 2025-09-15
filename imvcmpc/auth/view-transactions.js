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

async function viewTransactions() {
    const client = await pool.connect();
    
    try {
        console.log('📊 Viewing transactions in database...\n');
        
        const result = await client.query(`
            SELECT 
                transaction_date,
                payee,
                reference,
                particulars,
                debit_amount,
                credit_amount,
                cash_in_bank,
                loan_receivables,
                savings_deposits,
                interest_income,
                service_charge,
                sundries
            FROM transactions 
            ORDER BY transaction_date DESC
        `);
        
        if (result.rows.length === 0) {
            console.log('No transactions found in database.');
            return;
        }
        
        console.log(`Found ${result.rows.length} transactions:\n`);
        
        result.rows.forEach((transaction, index) => {
            console.log(`${index + 1}. ${transaction.payee}`);
            console.log(`   Date: ${transaction.transaction_date}`);
            console.log(`   Reference: ${transaction.reference}`);
            console.log(`   Particulars: ${transaction.particulars}`);
            console.log(`   Debit: ${transaction.debit_amount || 0}`);
            console.log(`   Credit: ${transaction.credit_amount || 0}`);
            console.log(`   Cash in Bank: ${transaction.cash_in_bank || 0}`);
            console.log(`   Loan Receivables: ${transaction.loan_receivables || 0}`);
            console.log(`   Savings Deposits: ${transaction.savings_deposits || 0}`);
            console.log(`   Interest Income: ${transaction.interest_income || 0}`);
            console.log(`   Service Charge: ${transaction.service_charge || 0}`);
            console.log(`   Sundries: ${transaction.sundries || 0}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error viewing transactions:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
viewTransactions().catch(console.error);
