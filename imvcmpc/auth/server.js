const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security middleware with relaxed CSP for inline scripts
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],  // Allow inline event handlers (onclick, etc.)
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:8080', 'https://capstone2-dzwi.onrender.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for analytics)
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await db.testConnection();
        res.json({
            success: true,
            message: 'IMVCMPC Authentication Service is running',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'IMVCMPC Authentication Service is unhealthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Helper function to serve HTML files
const serveHtml = (filePath) => {
    return (req, res) => {
        // Try multiple possible paths to handle different deployment structures
        const possiblePaths = [
            path.join(__dirname, filePath),           // Standard: /app/static/logpage/login.html
            path.join(__dirname, '..', filePath),    // Alternative: /app/../static/logpage/login.html
            path.join(process.cwd(), filePath),     // Using cwd: /app/static/logpage/login.html
            path.join(process.cwd(), '..', filePath)  // Alternative cwd
        ];
        
        let resolvedPath = null;
        for (const possiblePath of possiblePaths) {
            const resolved = path.resolve(possiblePath);
            if (fs.existsSync(resolved)) {
                resolvedPath = resolved;
                break;
            }
        }
        
        // Debug logging
        console.log(`[serveHtml] Requested: ${req.originalUrl}`);
        console.log(`[serveHtml] __dirname: ${__dirname}`);
        console.log(`[serveHtml] process.cwd(): ${process.cwd()}`);
        console.log(`[serveHtml] filePath: ${filePath}`);
        
        if (resolvedPath) {
            console.log(`[serveHtml] Serving: ${resolvedPath}`);
            res.sendFile(resolvedPath);
        } else {
            // Log all attempted paths for debugging
            console.error(`[serveHtml] File not found. Tried paths:`);
            possiblePaths.forEach(p => {
                const resolved = path.resolve(p);
                console.error(`  - ${resolved} (exists: ${fs.existsSync(resolved)})`);
            });
            res.status(404).json({
                success: false,
                error: 'Page not found',
                path: req.originalUrl
            });
        }
    };
};

// Clean URL routing - must be before static file serving
// Root redirect to login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login page routes
app.get('/login', serveHtml('static/logpage/login.html'));
app.get('/reset-password', serveHtml('static/logpage/reset-password.html'));

// Finance Officer routes
// Dashboard is shared page, others are also shared pages
app.get('/financeofficer/dashboard', serveHtml('static/shared/html/dashboard.html'));
app.get('/financeofficer/account', serveHtml('static/shared/html/account.html'));
app.get('/financeofficer/analytics', serveHtml('static/shared/html/analytics.html'));
app.get('/financeofficer/main', serveHtml('static/financeofficer/html/main.html'));
app.get('/financeofficer/memberdata', serveHtml('static/shared/html/memberdata.html'));
app.get('/financeofficer/notifications', serveHtml('static/shared/html/notifications.html'));
app.get('/financeofficer/reports', serveHtml('static/financeofficer/html/reports.html'));

// Marketing Clerk routes
// All pages are shared except reports
app.get('/marketingclerk/dashboard', serveHtml('static/shared/html/dashboard.html'));
app.get('/marketingclerk/account', serveHtml('static/shared/html/account.html'));
app.get('/marketingclerk/analytics', serveHtml('static/shared/html/analytics.html'));
app.get('/marketingclerk/main', serveHtml('static/marketingclerk/html/main.html'));
app.get('/marketingclerk/memberdata', serveHtml('static/shared/html/memberdata.html'));
app.get('/marketingclerk/notifications', serveHtml('static/shared/html/notifications.html'));
app.get('/marketingclerk/reports', serveHtml('static/marketingclerk/html/reports.html'));

// IT Head routes
app.get('/ithead/account', serveHtml('static/ithead/html/account.html'));
app.get('/ithead/analytics', serveHtml('static/ithead/html/analytics.html'));
app.get('/ithead/auditlogs', serveHtml('static/ithead/html/auditlogs.html'));
app.get('/ithead/main', serveHtml('static/ithead/html/main.html'));
app.get('/ithead/reports', serveHtml('static/ithead/html/reports.html'));
app.get('/ithead/usermanagement', serveHtml('static/ithead/html/usermanagement.html'));

// Shared routes (if needed)
app.get('/shared/account', serveHtml('static/shared/html/account.html'));
app.get('/shared/analytics', serveHtml('static/shared/html/analytics.html'));
app.get('/shared/dashboard', serveHtml('static/shared/html/dashboard.html'));
app.get('/shared/main', serveHtml('static/shared/html/main.html'));
app.get('/shared/memberdata', serveHtml('static/shared/html/memberdata.html'));
app.get('/shared/notifications', serveHtml('static/shared/html/notifications.html'));

// Serve static files
app.use('/shared', express.static('static/shared'));
app.use('/financeofficer', express.static('static/financeofficer'));
app.use('/marketingclerk', express.static('static/marketingclerk'));
app.use('/ithead', express.static('static/ithead'));
app.use('/logpage', express.static('static/logpage'));
app.use('/assets', express.static('static/assets'));

// API routes
app.use('/api/auth', authRoutes);

// 404 handler for non-existent routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: error.message
        });
    }
    
    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            details: error.message
        });
    }
    
    // Default error response
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await db.close();
    process.exit(0);
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await db.testConnection();
        console.log('✅ Database connection successful');
        
        // Start server
        app.listen(PORT, () => {
            console.log('🚀 IMVCMPC Authentication Service started successfully');
            console.log(`📡 Server running on port ${PORT}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
            console.log(`⏰ Started at: ${new Date().toISOString()}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
