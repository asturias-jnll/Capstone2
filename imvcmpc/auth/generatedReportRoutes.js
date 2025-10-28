const express = require('express');
const { authenticateToken, checkRole, auditLog } = require('./middleware');
const GeneratedReportService = require('./generatedReportService');

const router = express.Router();
const service = new GeneratedReportService();

// Create new generated report (Marketing Clerk)
router.post('/generated-reports',
    authenticateToken,
    checkRole(['marketing_clerk']),
    auditLog('create_generated_report', 'generated_reports'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const branchId = req.user.branch_id;
            const { report_request_id, report_type, config, data, pdf_data, file_name } = req.body;
            

            // Validate required fields
            if (!report_type || !config || !data || !pdf_data || !file_name) {
                return res.status(400).json({
                    success: false,
                    error: 'report_type, config, data, pdf_data, and file_name are required'
                });
            }

            // Validate report type
            const validReportTypes = ['savings', 'disbursement', 'member', 'branch'];
            if (!validReportTypes.includes(report_type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid report_type. Must be one of: ' + validReportTypes.join(', ')
                });
            }

            const result = await service.createGeneratedReport({
                reportRequestId: report_request_id || null,
                generatedBy: userId,
                branchId: branchId,
                reportType: report_type,
                config: config,
                data: data,
                pdfData: pdf_data,
                fileName: file_name
            });

            res.status(201).json({
                success: true,
                data: {
                    id: result.report.id,
                    report_type: result.report.report_type,
                    status: result.report.status,
                    created_at: result.report.created_at,
                    file_size: result.fileSize,
                    notification_created: !!result.notification
                }
            });
        } catch (error) {
            console.error('Create generated report error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get reports list (filtered by role)
router.get('/generated-reports',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const userRole = req.user.role_name; // use normalized role key
            const branchId = req.user.branch_id;
            
            
            const filters = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                report_type: req.query.report_type || null,
                status: req.query.status || null,
                start_date: req.query.start_date || null,
                end_date: req.query.end_date || null
            };

            const result = await service.getReportsByUser(userId, userRole, branchId, filters);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get reports error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get specific report details
router.get('/generated-reports/:id',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role_name; // use normalized role key
            const branchId = req.user.branch_id;

            const report = await service.getReportById(id, userId, userRole, branchId);

            if (!report) {
                return res.status(404).json({
                    success: false,
                    error: 'Report not found or access denied'
                });
            }

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Get report error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Download PDF
router.get('/generated-reports/:id/pdf',
    authenticateToken,
    checkRole(['marketing_clerk', 'finance_officer']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role_name; // use normalized role key
            const branchId = req.user.branch_id;

            const pdfBuffer = await service.getReportPDF(id, userId, userRole, branchId);

            if (!pdfBuffer) {
                return res.status(404).json({
                    success: false,
                    error: 'PDF not found or access denied'
                });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="report_${id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Download PDF error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Mark report as viewed (Finance Officer only)
router.patch('/generated-reports/:id/viewed',
    authenticateToken,
    checkRole(['finance_officer']),
    auditLog('mark_report_viewed', 'generated_reports'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const report = await service.markReportAsViewed(id, userId);

            if (!report) {
                return res.status(404).json({
                    success: false,
                    error: 'Report not found or access denied'
                });
            }

            res.json({
                success: true,
                data: {
                    id: report.id,
                    viewed_at: report.updated_at
                }
            });
        } catch (error) {
            console.error('Mark report viewed error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Update report status (Marketing Clerk only)
router.patch('/generated-reports/:id/status',
    authenticateToken,
    checkRole(['marketing_clerk']),
    auditLog('update_report_status', 'generated_reports'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user.id;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'status is required'
                });
            }

            const validStatuses = ['pending', 'processing', 'completed', 'failed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
                });
            }

            const report = await service.updateReportStatus(id, status, userId);

            if (!report) {
                return res.status(404).json({
                    success: false,
                    error: 'Report not found or access denied'
                });
            }

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Update report status error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
