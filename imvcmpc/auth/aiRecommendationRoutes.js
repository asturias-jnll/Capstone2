const express = require('express');
const crypto = require('crypto');
const { authenticateToken, checkRole, auditLog } = require('./middleware');
const config = require('./config');
const db = require('./database');
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

// Generate AI recommendations (MCDA + optional LLM) with caching
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

      // STEP 1: Generate cache key based on report configuration
      const cacheConfig = {
        reportType,
        period: reportData.period,
        branches: reportData.branches,
        // Include which transaction types are selected (savings, disbursements, or both)
        chartTypes: {
          hasSavings: !!reportData.charts?.savings,
          hasDisbursement: !!reportData.charts?.disbursement
        },
        rows: reportData.rows?.map(r => ({
          branch_id: r.branch_id,
          total_savings: parseFloat(r.total_savings || 0),
          total_disbursements: parseFloat(r.total_disbursements || 0),
          net_interest_income: parseFloat(r.net_interest_income || 0),
          active_members: parseInt(r.active_members || 0, 10)
        }))
      };
      const cacheKey = crypto.createHash('md5')
        .update(JSON.stringify(cacheConfig))
        .digest('hex');
      
      console.log('🔑 [AI-RECO] Cache key:', cacheKey);

      // STEP 2: Check if cached recommendation exists
      try {
        const cacheResult = await db.query(`
          SELECT 
            mcda_results, 
            ai_recommendations, 
            source, 
            model,
            created_at,
            access_count
          FROM ai_recommendation_cache
          WHERE cache_key = $1
        `, [cacheKey]);

        if (cacheResult.rows.length > 0) {
          const cached = cacheResult.rows[0];
          console.log('✅ [AI-RECO] Cache HIT! Using cached recommendation');
          console.log('✅ [AI-RECO] Original created:', cached.created_at);
          console.log('✅ [AI-RECO] Access count:', cached.access_count);
          
          // Update access tracking
          await db.query(`
            UPDATE ai_recommendation_cache
            SET accessed_at = CURRENT_TIMESTAMP,
                access_count = access_count + 1
            WHERE cache_key = $1
          `, [cacheKey]);

          return res.json({
            success: true,
            data: {
              mcda: cached.mcda_results,
              ai: {
                ...cached.ai_recommendations,
                cached: true,
                cacheInfo: {
                  created: cached.created_at,
                  accessCount: cached.access_count + 1,
                  source: cached.source,
                  model: cached.model
                }
              }
            }
          });
        }
      } catch (cacheError) {
        console.warn('⚠️ [AI-RECO] Cache lookup error:', cacheError.message);
        // Continue with generation if cache fails
      }

      console.log('❌ [AI-RECO] Cache MISS! Generating new recommendation...');

      // STEP 3: Prepare data and run MCDA
      let branchesData = [];
      if (reportType === 'branch' && reportData && Array.isArray(reportData.rows)) {
        branchesData = reportData.rows.map(r => ({
          branch_id: r.branch_id || null,
          branch_name: r.branch_location_only || r.branch_location || r.branch_name, // Use location only for AI
          active_members: r.active_members,
          total_savings: r.total_savings,
          total_disbursements: r.total_disbursements,
          net_interest_income: r.net_interest_income,
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
          net_interest_income: 0,
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

      // STEP 4: Store in cache
      try {
        await db.query(`
          INSERT INTO ai_recommendation_cache (
            cache_key, 
            report_type, 
            report_config, 
            mcda_results, 
            ai_recommendations, 
            source, 
            model
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (cache_key) DO UPDATE SET
            accessed_at = CURRENT_TIMESTAMP,
            access_count = ai_recommendation_cache.access_count + 1
        `, [
          cacheKey,
          reportType,
          cacheConfig,
          mcdaResults,
          aiResult,
          aiResult.source,
          aiResult.metadata?.model || null
        ]);
        console.log('💾 [AI-RECO] Cached recommendation saved');
      } catch (cacheError) {
        console.warn('⚠️ [AI-RECO] Failed to cache recommendation:', cacheError.message);
        // Don't fail the request if caching fails
      }

      return res.json({ 
        success: true, 
        data: { 
          mcda: mcdaResults, 
          ai: {
            ...aiResult,
            cached: false
          }
        } 
      });
    } catch (error) {
      console.error('❌ [AI-RECO] Error:', error.message);
      console.error('❌ [AI-RECO] Stack:', error.stack);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Clear AI recommendation cache (IT Head only)
router.delete('/reports/clear-ai-cache',
  authenticateToken,
  checkRole(['it_head']),
  auditLog('clear_ai_cache', 'reports'),
  async (req, res) => {
    try {
      const { daysOld = 30 } = req.query;
      const daysOldInt = parseInt(daysOld, 10);
      
      if (isNaN(daysOldInt) || daysOldInt < 1) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid daysOld parameter. Must be a positive integer.' 
        });
      }
      
      console.log(`🗑️ [AI-CACHE] Clearing cache entries older than ${daysOldInt} days...`);
      
      const result = await db.query(`
        DELETE FROM ai_recommendation_cache
        WHERE created_at < NOW() - INTERVAL '${daysOldInt} days'
        RETURNING id, cache_key, created_at
      `);
      
      console.log(`✅ [AI-CACHE] Deleted ${result.rowCount} cache entries`);
      
      res.json({
        success: true,
        message: `Deleted ${result.rowCount} cache entries older than ${daysOldInt} days`,
        deletedCount: result.rowCount
      });
    } catch (error) {
      console.error('❌ [AI-CACHE] Cache cleanup error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get AI cache statistics (IT Head only)
router.get('/reports/ai-cache-stats',
  authenticateToken,
  checkRole(['it_head']),
  async (req, res) => {
    try {
      console.log('📊 [AI-CACHE] Fetching cache statistics...');
      
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(access_count) as total_accesses,
          AVG(access_count) as avg_accesses_per_entry,
          COUNT(CASE WHEN source = 'ai' THEN 1 END) as ai_generated,
          COUNT(CASE WHEN source = 'rule-based-fallback' THEN 1 END) as rule_based,
          MIN(created_at) as oldest_entry,
          MAX(created_at) as newest_entry,
          MAX(accessed_at) as last_accessed
        FROM ai_recommendation_cache
      `);
      
      const topAccessed = await db.query(`
        SELECT 
          report_type,
          cache_key,
          access_count,
          created_at,
          accessed_at
        FROM ai_recommendation_cache
        ORDER BY access_count DESC
        LIMIT 10
      `);
      
      console.log('✅ [AI-CACHE] Statistics retrieved');
      
      res.json({
        success: true,
        data: {
          summary: stats.rows[0],
          topAccessed: topAccessed.rows
        }
      });
    } catch (error) {
      console.error('❌ [AI-CACHE] Error fetching cache stats:', error);
      res.status(500).json({ success: false, error: error.message });
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



