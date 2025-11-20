// Rate limiter to prevent database connection exhaustion
const rateLimit = require('express-rate-limit');

// Analytics-specific rate limiter
const analyticsLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 50, // Limit each user to 50 requests per 10 seconds
    message: {
        success: false,
        error: 'Too many analytics requests. Please wait a moment before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use user ID as key to limit per user
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    // Skip successful requests from counting
    skipSuccessfulRequests: false,
    // Skip failed requests from counting
    skipFailedRequests: true,
});

// Stricter limiter for filter changes
const filterLimiter = rateLimit({
    windowMs: 5 * 1000, // 5 seconds
    max: 10, // Max 10 filter changes per 5 seconds
    message: {
        success: false,
        error: 'Too many filter changes. Please slow down.'
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
});

// Transaction-specific rate limiter
const transactionLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 30, // Limit each user to 30 requests per 10 seconds
    message: {
        success: false,
        error: 'Too many transaction requests. Please wait a moment before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    skipFailedRequests: true,
});

// Report generation rate limiter (stricter - resource intensive)
const reportLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each user to 10 report generations per minute
    message: {
        success: false,
        error: 'Too many report requests. Please wait before generating another report.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    skipFailedRequests: true,
});

// Change request rate limiter
const changeRequestLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 20, // Limit each user to 20 requests per 10 seconds
    message: {
        success: false,
        error: 'Too many change request queries. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    skipFailedRequests: true,
});

// Audit log rate limiter
const auditLogLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 20, // Limit each user to 20 requests per 10 seconds
    message: {
        success: false,
        error: 'Too many audit log requests. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    skipFailedRequests: true,
});

// Member search rate limiter (for autocomplete)
const memberSearchLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 20, // Limit each user to 20 searches per 10 seconds
    message: {
        success: false,
        error: 'Too many search requests. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    skipFailedRequests: true,
});

module.exports = {
    analyticsLimiter,
    filterLimiter,
    transactionLimiter,
    reportLimiter,
    changeRequestLimiter,
    auditLogLimiter,
    memberSearchLimiter
};
