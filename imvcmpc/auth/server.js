const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
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

// Serve static files
app.use('/shared', express.static('static/shared'));
app.use('/financeofficer', express.static('static/financeofficer'));
app.use('/marketingclerk', express.static('static/marketingclerk'));
app.use('/ithead', express.static('static/ithead'));
app.use('/logpage', express.static('static/logpage'));
app.use('/assets', express.static('static/assets'));

// Root redirect to login page
app.get('/', (req, res) => {
    res.redirect('/logpage/login.html');
});

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
