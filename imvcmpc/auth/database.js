const { Pool } = require('pg');
const config = require('./config');

// Database connection pool
const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

// Test database connection
pool.on('connect', (client) => {
    console.log('New client connected to database');
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Database utility functions
const db = {
    // Execute a query with parameters
    query: async (text, params) => {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // Get a client from the pool for transactions
    getClient: async () => {
        return await pool.connect();
    },

    // Execute a transaction
    transaction: async (callback) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Test connection
    testConnection: async () => {
        try {
            const result = await pool.query('SELECT NOW()');
            console.log('Database connection successful:', result.rows[0]);
            return true;
        } catch (error) {
            console.error('Database connection failed:', error);
            return false;
        }
    },

    // Close pool
    close: async () => {
        await pool.end();
        console.log('Database pool closed');
    }
};

module.exports = db;
