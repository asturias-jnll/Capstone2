const express = require('express');
const { authenticateToken, checkRole, auditLog } = require('./middleware');
const ReportRequestService = require('./reportRequestService');

const router = express.Router();
const service = new ReportRequestService();

// Create a report request (Finance Officer)
router.post('/report-requests',
    authenticateToken,
    checkRole(['finance_officer']),
    auditLog('report_request_creation', 'report_requests'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const branchId = req.user.branch_id;
            const { report_type, report_config, fo_notes, priority, due_at } = req.body || {};

            if (!report_type || !report_config) {
                return res.status(400).json({ success: false, error: 'report_type and report_config are required' });
            }

            const result = await service.createReportRequest({
                requestedBy: userId,
                branchId,
                reportType: report_type,
                reportConfig: report_config,
                foNotes: fo_notes || null,
                priority: priority || 'normal',
                dueAt: due_at || null
            });

            res.status(201).json({ success: true, data: result });
        } catch (error) {
            console.error('Create report request error:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }
);

// Update report request status (MC marks in_progress/completed)
router.patch('/report-requests/:id/status',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    auditLog('report_request_status_update', 'report_requests'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status, outcome, failure_reason } = req.body || {};
            if (!status) return res.status(400).json({ success: false, error: 'status is required' });

            const updated = await service.updateStatus(id, status, req.user.id, outcome || null, failure_reason || null);
            if (!updated) return res.status(404).json({ success: false, error: 'Report request not found' });
            res.json({ success: true, data: updated });
        } catch (error) {
            console.error('Update report request status error:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }
);

// Get report request by ID (for prefill)
router.get('/report-requests/:id',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    async (req, res) => {
      try {
        const { id } = req.params;
        const data = await service.getById(id);
        if (!data) {
          return res.status(404).json({ success: false, error: 'Report request not found' });
        }
        res.json({ success: true, data });
      } catch (error) {
        console.error('Get report request error:', error);
        res.status(400).json({ success: false, error: error.message });
      }
    }
  );

module.exports = router;


