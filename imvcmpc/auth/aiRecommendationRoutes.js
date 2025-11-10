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
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
  AI_TEMPERATURE: process.env.AI_TEMPERATURE,
  AI_TIMEOUT: process.env.AI_TIMEOUT
});
const pdfService = new PDFService();

// Test AI connectivity and configuration
router.get('/test-ai',
  authenticateToken,
  checkRole(['marketing_clerk', 'finance_officer', 'it_head']),
  async (req, res) => {
    try {
      console.log('🔍 [AI-TEST] Testing AI connectivity...');
      const testResult = await aiService.testAIConnectivity();
      
      console.log('🔍 [AI-TEST] Results:', {
        enabled: testResult.config?.enabled,
        provider: testResult.config?.provider,
        model: testResult.config?.model,
        hasApiKey: !!testResult.config?.apiKey,
        apiKeyPreview: testResult.config?.apiKey ? `${testResult.config.apiKey.substring(0, 10)}...` : 'None',
        clientInitialized: testResult.config?.clientInitialized
      });

      return res.json({
        success: testResult.success,
        message: testResult.message,
        configuration: {
          enabled: testResult.config?.enabled,
          provider: testResult.config?.provider,
          model: testResult.config?.model,
          hasApiKey: !!testResult.config?.apiKey,
          apiKeyPreview: testResult.config?.apiKey ? `${testResult.config.apiKey.substring(0, 10)}...` : 'None',
          clientInitialized: testResult.config?.clientInitialized,
          maxTokens: testResult.config?.maxTokens,
          temperature: testResult.config?.temperature
        },
        response: testResult.response,
        error: testResult.error,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [AI-TEST] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Generate AI recommendations (MCDA + optional LLM)
router.post('/reports/generate-ai-recommendations',
  authenticateToken,
  checkRole(['marketing_clerk', 'finance_officer', 'it_head']),
  auditLog('generate_ai_recommendation', 'reports'),
  async (req, res) => {
    try {
      console.log('🤖 [AI-RECO] Starting AI recommendation generation...');
      const { reportType, reportData } = req.body || {};
      if (!reportType || !reportData) {
        console.warn('⚠️ [AI-RECO] Missing required parameters');
        return res.status(400).json({ success: false, error: 'reportType and reportData are required' });
      }

      console.log('🤖 [AI-RECO] Report Type:', reportType);
      console.log('🤖 [AI-RECO] AI Config:', {
        enabled: aiService.config.enabled,
        provider: aiService.config.provider,
        model: aiService.config.model,
        hasApiKey: !!aiService.config.apiKey
      });

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
      console.log('📊 [AI-RECO] Running MCDA analysis...');
      const mcdaResults = mcdaService.analyzeBranchPerformance(branchesData);
      console.log('📊 [AI-RECO] MCDA completed. Branches analyzed:', mcdaResults.rankedBranches?.length);

      // Generate AI (or fallback) recommendations
      console.log('🧠 [AI-RECO] Generating recommendations...');
      const startTime = Date.now();
      const aiResult = await aiService.generateRecommendations(mcdaResults, reportData, reportType);
      const duration = Date.now() - startTime;
      
      console.log('✅ [AI-RECO] Recommendations generated successfully');
      console.log('✅ [AI-RECO] Source:', aiResult.source);
      console.log('✅ [AI-RECO] Provider:', aiResult.metadata?.provider || 'N/A');
      console.log('✅ [AI-RECO] Model:', aiResult.metadata?.model || 'N/A');
      console.log('✅ [AI-RECO] Duration:', duration, 'ms');
      if (aiResult.error) {
        console.warn('⚠️ [AI-RECO] Fallback reason:', aiResult.metadata?.fallbackReason);
        console.warn('⚠️ [AI-RECO] Error:', aiResult.error);
      }

      return res.json({ success: true, data: { mcda: mcdaResults, ai: aiResult } });
    } catch (error) {
      console.error('❌ [AI-RECO] Error:', error.message);
      console.error('❌ [AI-RECO] Stack:', error.stack);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Generate PDF from provided HTML
router.post('/reports/generate-pdf',
  authenticateToken,
  checkRole(['marketing_clerk', 'finance_officer', 'it_head']),
  auditLog('generate_report_pdf', 'reports'),
  async (req, res) => {
    try {
      const { reportHTML, title } = req.body || {};
      if (!reportHTML) {
        return res.status(400).json({ success: false, error: 'reportHTML is required' });
      }

      const pdfBuffer = await pdfService.generatePDF(reportHTML, { title: title || 'IMVCMPC Report' });
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



