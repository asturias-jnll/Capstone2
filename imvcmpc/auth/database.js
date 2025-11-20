const { Pool } = require('pg');
const config = require('./config');

// Database connection pool
const connectionString = process.env.DATABASE_URL || config.database.connectionString;

// Build a pool configuration that works for both URL and individual fields
const poolConfig = {
    max: config.database.max || 15, // Reduced from 20 to prevent exhaustion
    min: 2, // Minimum idle connections
    idleTimeoutMillis: config.database.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config.database.connectionTimeoutMillis || 5000, // Reduced from 10s
    maxUses: config.database.maxUses || 7500,
    allowExitOnIdle: false,
    // Add query timeout to prevent long-running queries
    query_timeout: 30000, // 30 seconds
};

if (connectionString) {
    poolConfig.connectionString = connectionString;
    if (config.database.ssl) {
        poolConfig.ssl = config.database.ssl;
    }
    console.log('🔗 Connecting with connection string (SSL:', !!config.database.ssl, ')');
} else {
    poolConfig.host = config.database.host;
    poolConfig.port = config.database.port;
    poolConfig.database = config.database.database;
    poolConfig.user = config.database.user;
    poolConfig.password = config.database.password;
    if (config.database.ssl) {
        poolConfig.ssl = config.database.ssl;
    }
    console.log('🔗 Connecting to:', poolConfig.host + ':' + poolConfig.port, '(SSL:', !!config.database.ssl, ')');
}

const pool = new Pool(poolConfig);

// Connection pool monitoring
pool.on('connect', (client) => {
    console.log('✅ New client connected | Pool stats:', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
    });
});

pool.on('acquire', (client) => {
    console.log('🔒 Client acquired | Pool stats:', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
    });
});

pool.on('remove', (client) => {
    console.log('❌ Client removed | Pool stats:', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
    });
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle client', err);
    console.error('Pool stats at error:', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
    });
    // Don't exit immediately, let PM2/render handle restart
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
            console.log('🔍 Testing database connection...');
            const result = await pool.query('SELECT NOW()');
            console.log('✅ Database connection successful:', result.rows[0]);
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            console.error('Error details:', {
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
                address: error.address,
                port: error.port
            });
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
