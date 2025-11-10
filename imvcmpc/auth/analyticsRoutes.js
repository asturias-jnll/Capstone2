const express = require('express');
const router = express.Router();
const { authenticateToken, auditLog } = require('./middleware');

// Analytics routes

// Get analytics summary (4 main cards)
router.get('/summary',
    authenticateToken,
    auditLog('view_analytics', 'analytics'),
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getAnalyticsSummary(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Analytics summary error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get transaction count data
router.get('/transaction-count',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getTransactionCount(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Transaction count error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get average transaction value data
router.get('/average-transaction-value',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getAverageTransactionValue(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Average transaction value error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get savings trend data
router.get('/savings-trend',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getSavingsTrend(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Savings trend error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get disbursement trend data
router.get('/disbursement-trend',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getDisbursementTrend(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Disbursement trend error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get interest income trend data
router.get('/interest-income-trend',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getInterestIncomeTrend(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Interest income trend error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get branch performance data
router.get('/branch-performance',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getBranchPerformance(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Branch performance error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get member activity data
router.get('/member-activity',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getMemberActivity(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Member activity error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get top members data
router.get('/top-members',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getTopMembers(filters, userRole, isMainBranchUser, userBranchId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Top members error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get top patrons data
router.get('/top-patrons',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch, limit } = req.query;
            const userRole = req.user?.role_display_name;
            const isMainBranchUser = isMainBranch === 'true';
            const userBranchId = branchId || '1';
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getTopPatrons(filters, userRole, isMainBranchUser, userBranchId, limit);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Top patrons error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get all branches performance data for IMVCMPC Branches Performance section
router.get('/all-branches-performance',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate } = req.query;
            const userRole = req.user?.role_display_name;
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getAllBranchesPerformance(filters, userRole);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('All branches performance error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Log analytics filter usage
router.post('/filter-log',
    authenticateToken,
    auditLog('apply_analytics_filter', 'analytics'),
    async (req, res) => {
        try {
            // Just acknowledge the filter usage - the audit log middleware will handle logging
            res.json({
                success: true,
                message: 'Filter usage logged'
            });
        } catch (error) {
            console.error('Filter log error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
