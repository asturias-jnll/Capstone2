// Smart Configuration Selector
// Check environment variable to determine which config to use
const environment = process.env.NODE_ENV || 'local';

let config;

if (environment === 'production') {
    config = require('./config.production');
    console.log('📦 Using PRODUCTION config (Render database)');
} else {
    config = require('./config.local');
    console.log('🐳 Using LOCAL config (Docker database)');
}

module.exports = config;
