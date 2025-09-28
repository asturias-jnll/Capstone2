const express = require('express');
const ChangeRequestService = require('./changeRequestService');
const { authenticateToken, checkRole, auditLog } = require('./middleware');

const router = express.Router();
const changeRequestService = new ChangeRequestService();

// Create change request (Marketing Clerk)
router.post('/change-requests',
    authenticateToken,
    checkRole(['marketing_clerk']),
    auditLog('change_request_creation', 'change_requests'),
    async (req, res) => {
        try {
            const { transaction_id, transaction_table, original_data, requested_changes, reason, request_type } = req.body;
            const userId = req.user.id;
            const branchId = req.user.branch_id;

            if (!transaction_id || !transaction_table || !original_data || !requested_changes) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            const changeRequestData = {
                transaction_id,
                transaction_table,
                original_data,
                requested_changes,
                reason: reason || 'Transaction modification requested by marketing clerk',
                request_type: request_type || 'modification'
            };

            // Validate the change request data
            changeRequestService.validateChangeRequestData(changeRequestData);

            const result = await changeRequestService.createChangeRequest(changeRequestData, userId, branchId);

            res.status(201).json({
                success: true,
                message: 'Change request created successfully',
                data: result
            });

        } catch (error) {
            console.error('Error creating change request:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get change requests (Marketing Clerk and Finance Officer)
router.get('/change-requests',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    async (req, res) => {
        try {
            const { branch_id, status, assigned_to, requested_by } = req.query;
            const userId = req.user.id;
            const userRole = req.user.role_name;
            const userBranchId = req.user.branch_id;

            // Build filters based on user role and permissions
            const filters = {};

            // Marketing clerks can only see their own requests
            if (userRole === 'marketing_clerk') {
                filters.requested_by = userId;
            }

            // Finance officers can see requests assigned to them
            if (userRole === 'finance_officer') {
                filters.assigned_to = userId;
            }

            // Branch filtering
            if (branch_id) {
                filters.branch_id = parseInt(branch_id);
            } else {
                filters.branch_id = userBranchId;
            }

            if (status) {
                filters.status = status;
            }

            const requests = await changeRequestService.getChangeRequests(filters);

            res.json({
                success: true,
                data: requests
            });

        } catch (error) {
            console.error('Error fetching change requests:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get change request count
router.get('/change-requests/count',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    async (req, res) => {
        try {
            const { branch_id, status, assigned_to } = req.query;
            const userId = req.user.id;
            const userRole = req.user.role_name;
            const userBranchId = req.user.branch_id;

            // Build filters based on user role and permissions
            const filters = {};

            // Marketing clerks can only see their own requests
            if (userRole === 'marketing_clerk') {
                filters.requested_by = userId;
            }

            // Finance officers can see requests assigned to them
            if (userRole === 'finance_officer') {
                filters.assigned_to = userId;
            }

            // Branch filtering
            if (branch_id) {
                filters.branch_id = parseInt(branch_id);
            } else {
                filters.branch_id = userBranchId;
            }

            if (status) {
                filters.status = status;
            }

            const count = await changeRequestService.getChangeRequestCount(filters);

            res.json({
                success: true,
                count: count
            });

        } catch (error) {
            console.error('Error fetching change request count:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get change request by ID
router.get('/change-requests/:requestId',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    async (req, res) => {
        try {
            const { requestId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role_name;

            const request = await changeRequestService.getChangeRequestById(requestId);

            if (!request) {
                return res.status(404).json({
                    success: false,
                    error: 'Change request not found'
                });
            }

            // Check permissions
            if (userRole === 'marketing_clerk' && request.requested_by !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            if (userRole === 'finance_officer' && request.assigned_to !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            res.json({
                success: true,
                data: request
            });

        } catch (error) {
            console.error('Error fetching change request:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Update change request status (Finance Officer only)
router.put('/change-requests/:requestId/status',
    authenticateToken,
    checkRole(['finance_officer']),
    auditLog('change_request_status_update', 'change_requests'),
    async (req, res) => {
        try {
            const { requestId } = req.params;
            const { status, finance_officer_notes } = req.body;
            const userId = req.user.id;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Status is required'
                });
            }

            const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status'
                });
            }

            const result = await changeRequestService.updateChangeRequestStatus(
                requestId, 
                status, 
                finance_officer_notes, 
                userId
            );

            res.json({
                success: true,
                message: 'Change request status updated successfully',
                data: result
            });

        } catch (error) {
            console.error('Error updating change request status:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Process change request (Finance Officer only)
router.post('/change-requests/:requestId/process',
    authenticateToken,
    checkRole(['finance_officer']),
    auditLog('change_request_processing', 'change_requests'),
    async (req, res) => {
        try {
            const { requestId } = req.params;
            const userId = req.user.id;

            const result = await changeRequestService.processChangeRequest(requestId, userId);

            res.json({
                success: true,
                message: 'Change request processed successfully',
                data: result
            });

        } catch (error) {
            console.error('Error processing change request:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
