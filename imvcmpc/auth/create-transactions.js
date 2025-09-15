const fs = require('fs');
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

async function createTransactionsTable() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Creating transactions table...');
        
        // Read the SQL file
        const sql = fs.readFileSync('./create-transactions-table.sql', 'utf8');
        
        // Execute the SQL
        await client.query(sql);
        
        console.log('✅ Transactions table created successfully!');
        
        // Verify the table was created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'transactions'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Transactions table verified in database');
        } else {
            console.log('❌ Transactions table not found');
        }
        
    } catch (error) {
        console.error('❌ Error creating transactions table:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createTransactionsTable().catch(console.error);
