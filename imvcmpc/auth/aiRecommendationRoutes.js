const express = require('express');
const { authenticateToken, checkRole, auditLog } = require('./middleware');
const config = require('./config');
const MCDAService = require('./mcdaService');
const AIRecommendationService = require('./aiRecommendationService');
const PDFService = require('./pdfService');

const router = express.Router();
const mcdaService = new MCDAService();
const aiService = new AIRecommendationService({
  AI_ENABLED: process.env.AI_ENABLED,
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
  AI_TEMPERATURE: process.env.AI_TEMPERATURE
});
const pdfService = new PDFService();

// Generate AI recommendations (MCDA + optional LLM)
router.post('/reports/generate-ai-recommendations',
  authenticateToken,
  checkRole(['marketing_clerk', 'finance_officer']),
  auditLog('generate_ai_recommendations', 'reports'),
  async (req, res) => {
    try {
      const { reportType, reportData } = req.body || {};
      if (!reportType || !reportData) {
        return res.status(400).json({ success: false, error: 'reportType and reportData are required' });
      }

      // For branch reports, expect rows; for others, construct minimal dataset
      let branchesData = [];
      if (reportType === 'branch' && reportData && Array.isArray(reportData.rows)) {
        branchesData = reportData.rows.map(r => ({
          branch_id: r.branch_id || null,
          branch_name: r.branch_name,
          active_members: r.active_members,
          total_savings: r.total_savings,
          total_disbursements: r.total_disbursements,
          net_position: r.net_position,
          performancePct: r.performancePct
        }));
      } else if ((reportType === 'savings' || reportType === 'disbursement') && reportData) {
        // Treat single-branch report as a one-element array for MCDA consistency
        branchesData = [{
          branch_id: null,
          branch_name: 'Current Branch',
          active_members: reportData.activeMembers || 0,
          total_savings: reportType === 'savings' ? (reportData.total || 0) : 0,
          total_disbursements: reportType === 'disbursement' ? (reportData.total || 0) : 0,
          net_position: (reportData.total || 0),
          performancePct: 0
        }];
      } else {
        return res.status(400).json({ success: false, error: 'Unsupported report type or missing data' });
      }

      // Run MCDA (TOPSIS)
      const mcdaResults = mcdaService.analyzeBranchPerformance(branchesData);

      // Generate AI (or fallback) recommendations
      const aiResult = await aiService.generateRecommendations(mcdaResults, reportData, reportType);

      return res.json({ success: true, data: { mcda: mcdaResults, ai: aiResult } });
    } catch (error) {
      console.error('AI recommendations error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Generate PDF from provided HTML
router.post('/reports/generate-pdf',
  authenticateToken,
  checkRole(['marketing_clerk', 'finance_officer']),
  auditLog('generate_pdf', 'reports'),
  async (req, res) => {
    try {
      const { reportHTML, title } = req.body || {};
      if (!reportHTML) {
        return res.status(400).json({ success: false, error: 'reportHTML is required' });
      }

      const pdfBuffer = await pdfService.htmlToPDF(reportHTML, { title: title || 'IMVCMPC Report' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;



