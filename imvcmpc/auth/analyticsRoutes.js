const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware');

// Analytics routes

// Get analytics summary (4 main cards)
router.get('/summary',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role;
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

// Get savings trend data
router.get('/savings-trend',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role;
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
            const userRole = req.user?.role;
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

// Get branch performance data
router.get('/branch-performance',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate, branchId, isMainBranch } = req.query;
            const userRole = req.user?.role;
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
            const userRole = req.user?.role;
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
            const userRole = req.user?.role;
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

// Get all branches performance data for IMVCMPC Branches Performance section
router.get('/all-branches-performance',
    authenticateToken,
    async (req, res) => {
        try {
            const analyticsService = require('./analyticsService');
            const service = new analyticsService();
            
            // Extract parameters from query
            const { filter, startDate, endDate } = req.query;
            
            // Prepare filters
            const filters = {
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0]
            };
            
            const data = await service.getAllBranchesPerformance(filters);
            
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

module.exports = router;
