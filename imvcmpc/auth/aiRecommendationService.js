const Anthropic = require('@anthropic-ai/sdk');
const TrendAnalysisService = require('./trendAnalysisService');

class AIRecommendationService {
    constructor(config = {}) {
        this.config = {
            enabled: config.AI_ENABLED === 'true' || config.AI_ENABLED === true,
            provider: config.AI_PROVIDER || 'anthropic',
            apiKey: config.ANTHROPIC_API_KEY || config.AI_API_KEY,
            model: config.AI_MODEL || 'claude-sonnet-4-20250514',
            maxTokens: parseInt(config.AI_MAX_TOKENS) || 2000,
            temperature: parseFloat(config.AI_TEMPERATURE) || 0.7,
            timeout: parseInt(config.AI_TIMEOUT) || 30000
        };
        
        this.anthropic = null;
        this.Anthropic = Anthropic; // Store class reference
        this.trendAnalysisService = new TrendAnalysisService();
        
        // Initialize AI client if enabled
        if (this.config.enabled && this.config.apiKey) {
            this.initializeAIClient();
        }
    }

    /**
     * Initialize AI client based on provider
     */
    initializeAIClient() {
        try {
            console.log('🔧 [AI-SERVICE] Initializing AI client...');
            console.log('🔧 [AI-SERVICE] Provider:', this.config.provider);
            console.log('🔧 [AI-SERVICE] Model:', this.config.model);
            console.log('🔧 [AI-SERVICE] Max Tokens:', this.config.maxTokens, '(type:', typeof this.config.maxTokens + ')');
            console.log('🔧 [AI-SERVICE] Temperature:', this.config.temperature, '(type:', typeof this.config.temperature + ')');
            console.log('🔧 [AI-SERVICE] Has API Key:', !!this.config.apiKey);
            console.log('🔧 [AI-SERVICE] API Key prefix:', this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'None');
            
            if (this.config.provider === 'anthropic') {
                this.anthropic = new Anthropic({
                    apiKey: this.config.apiKey,
                    timeout: this.config.timeout
                });
                console.log('✅ [AI-SERVICE] Anthropic client initialized successfully');
            } else {
                console.warn(`⚠️ [AI-SERVICE] Unsupported AI provider: ${this.config.provider}. Only 'anthropic' is supported. Falling back to rule-based recommendations.`);
                this.config.enabled = false;
            }
        } catch (error) {
            console.error('❌ [AI-SERVICE] Failed to initialize AI client:', error.message);
            console.error('❌ [AI-SERVICE] Stack:', error.stack);
            this.config.enabled = false;
        }
    }

    /**
     * Generate AI-powered recommendations using MCDA results or trend analysis
     * @param {Object} mcdaResults - Results from MCDA analysis (for branch reports) or trend analysis (for savings/disbursement)
     * @param {Object} reportData - Original report data
     * @param {String} reportType - Type of report (branch, savings, disbursement, member)
     * @returns {Object} AI-generated recommendations
     */
    async generateRecommendations(mcdaResults, reportData, reportType = 'branch') {
        // Route to appropriate analysis method based on report type
        if (reportType === 'savings' || reportType === 'disbursement') {
            return this.generateTrendRecommendations(reportData, reportType);
        }
        
        // Existing branch report logic (unchanged)
        try {
            // If AI is disabled or not available, throw error
            if (!this.config.enabled || !this.anthropic) {
                const errorMsg = 'AI is disabled or not configured. Please enable AI and provide API credentials.';
                console.error('❌ [AI-SERVICE]', errorMsg);
                console.error('❌ [AI-SERVICE] Config:', {
                    enabled: this.config.enabled,
                    hasAnthropic: !!this.anthropic,
                    provider: this.config.provider
                });
                throw new Error(errorMsg);
            }

            console.log('🚀 [AI-SERVICE] AI is enabled, generating recommendations with', this.config.provider);
            
            // Prepare prompt for AI
            const prompt = this.buildAIPrompt(mcdaResults, reportData, reportType);
            console.log('📝 [AI-SERVICE] Prompt prepared, length:', prompt.length, 'characters');
            
            // Calculate dynamic timeout based on dataset size
            // For branch reports with many branches, increase timeout
            const rankedBranches = mcdaResults.rankedBranches || [];
            const branchCount = rankedBranches.length;
            // Base timeout: 30s, add 10s per 5 branches (max 120s for 50+ branches)
            const dynamicTimeout = Math.min(
                this.config.timeout + Math.floor(branchCount / 5) * 10000,
                120000 // Max 120 seconds
            );
            console.log('⏱️ [AI-SERVICE] Using timeout:', dynamicTimeout, 'ms (branches:', branchCount + ', base:', this.config.timeout + 'ms)');
            
            // Temporarily override timeout for this request
            const originalTimeout = this.config.timeout;
            this.config.timeout = dynamicTimeout;
            
            // Temporarily store original client
            const originalAnthropic = this.anthropic;
            
            // Reinitialize client with new timeout if needed
            if (this.anthropic) {
                this.anthropic = new this.Anthropic({
                    apiKey: this.config.apiKey,
                    timeout: dynamicTimeout
                });
            }
            
            // Call AI API
            console.log('📡 [AI-SERVICE] Calling', this.config.provider, 'API with model', this.config.model);
            const startTime = Date.now();
            let aiResponse;
            try {
                aiResponse = await this.callAIAPI(prompt);
            } finally {
                // Restore original timeout and client
                this.config.timeout = originalTimeout;
                this.anthropic = originalAnthropic;
            }
            const apiDuration = Date.now() - startTime;
            console.log('✅ [AI-SERVICE] API call completed in', apiDuration, 'ms');
            console.log('✅ [AI-SERVICE] Response length:', aiResponse?.length || 0, 'characters');
            
            // Parse and structure AI response
            const recommendations = this.parseAIResponse(aiResponse, mcdaResults);
            console.log('✅ [AI-SERVICE] Response parsed successfully');
            
            return {
                success: true,
                source: 'ai',
                recommendations,
                metadata: {
                    model: this.config.model,
                    provider: this.config.provider,
                    timestamp: new Date().toISOString(),
                    apiDuration: apiDuration,
                    responseLength: aiResponse?.length || 0
                }
            };

        } catch (error) {
            console.error('❌ [AI-SERVICE] AI recommendation generation failed:', error.message);
            console.error('❌ [AI-SERVICE] Error type:', error.constructor.name);
            console.error('❌ [AI-SERVICE] Stack:', error.stack);
            
            // Re-throw error - no fallback to hardcoded recommendations
            throw error;
        }
    }

    /**
     * Build AI prompt based on MCDA results or trend analysis
     * @param {Object} mcdaResults - MCDA analysis results (for branch) or trend analysis (for savings/disbursement)
     * @param {Object} reportData - Report data
     * @param {String} reportType - Report type
     * @returns {String} Formatted prompt for AI
     */
    buildAIPrompt(mcdaResults, reportData, reportType) {
        // Route to appropriate prompt builder based on report type
        if (reportType === 'savings' || reportType === 'disbursement') {
            return this.buildTrendPrompt(reportData, reportType, mcdaResults);
        }
        
        // Existing branch report prompt (unchanged)
        const rankedBranches = mcdaResults.rankedBranches || [];
        const criteria = mcdaResults.analysisMetadata?.criteriaUsed || [];
        const weights = mcdaResults.analysisMetadata?.weightsUsed || {};
        
        let prompt = `You are a financial analyst providing prescriptive recommendations for a cooperative's branch performance analysis.

CONTEXT:
- Report Type: ${reportType.toUpperCase()} Report
- Analysis Method: TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)
- Total Branches Analyzed: ${rankedBranches.length}
- Analysis Criteria: ${criteria.join(', ')}

BRANCH PERFORMANCE DATA:
${this.formatBranchDataForAI(rankedBranches)}

ANALYSIS WEIGHTS:
${Object.entries(weights).map(([criterion, weight]) => `- ${criterion}: ${(weight * 100).toFixed(1)}%`).join('\n')}

METRICS EXPLANATION:
- Total Savings = Capital coming IN from members (financial resources available)
- Total Disbursements = Capital going OUT as loans (lending activity)
- Net Interest Income = Profit generated from lending operations (financial health indicator)

RESOURCE OPTIMIZATION OPPORTUNITIES:
When analyzing branches, identify opportunities to optimize resource allocation:
- If Branch A has high savings but low disbursements (underutilized capital), while Branch B has high loan demand but limited funds, recommend redistributing lending capital from Branch A to Branch B
- Share expertise from high Net Interest Income branches to improve lending strategies in underperforming branches
- Allocate investment resources to branches with high growth potential

TASK:
Provide strategic and branch-level recommendations based on this analysis. Focus on:
1. Strategic insights for overall cooperative performance
2. Resource allocation and optimization strategies (capital redistribution, expertise sharing)
3. Specific actionable recommendations for each branch
4. Priority areas for improvement
5. Best practices to replicate from top performers

FORMAT YOUR RESPONSE AS JSON:
{
  "strategic": "Strategic recommendation text here...",
  "branchLevel": [
    {
      "branchName": "Branch Name",
      "priority": "High/Medium/Low",
      "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
      "rationale": "Brief explanation of why these recommendations are important"
    }
  ],
  "keyInsights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "nextSteps": ["Next step 1", "Next step 2"]
}

Ensure recommendations are:
- Specific and actionable
- Based on the actual data provided
- Appropriate for a financial cooperative context
- Prioritized by urgency and impact`;

        return prompt;
    }

    /**
     * Format branch data for AI consumption
     * @param {Array} rankedBranches - Ranked branches with scores
     * @returns {String} Formatted branch data
     */
    formatBranchDataForAI(rankedBranches) {
        return rankedBranches.map((branch, index) => {
            return `${index + 1}. ${branch.branch_name || 'Unknown Branch'}
   - TOPSIS Score: ${(branch.topsisScore * 100).toFixed(1)}%
   - Category: ${branch.category}
   - Total Savings: ₱${Number(branch.total_savings || 0).toLocaleString('en-PH')}
   - Total Disbursements: ₱${Number(branch.total_disbursements || 0).toLocaleString('en-PH')}
   - Net Interest Income: ₱${Number(branch.net_interest_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
   - Active Members: ${Number(branch.active_members || 0).toLocaleString('en-PH')}
   - Performance %: ${Number(branch.performancePct || 0).toFixed(2)}%`;
        }).join('\n\n');
    }

    /**
     * Call AI API with the prompt
     * @param {String} prompt - Formatted prompt
     * @returns {String} AI response
     */
    async callAIAPI(prompt) {
        if (this.config.provider === 'anthropic' && this.anthropic) {
            // Call Claude API
            console.log('🤖 [AI-SERVICE] Calling Anthropic Claude API...');
            try {
                const response = await this.anthropic.messages.create({
                    model: this.config.model,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    system: 'You are a financial analyst specializing in cooperative performance analysis. Provide clear, actionable recommendations based on data analysis.',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                });

                console.log('✅ [AI-SERVICE] Claude API response received');
                console.log('✅ [AI-SERVICE] Usage:', response.usage);
                return response.content[0]?.text || '';
            } catch (error) {
                console.error('❌ [AI-SERVICE] Anthropic API error:', error.message);
                if (error.status) console.error('❌ [AI-SERVICE] Status code:', error.status);
                throw error;
            }
        } else {
            const errorMsg = 'AI client not initialized or unsupported provider';
            console.error('❌ [AI-SERVICE]', errorMsg);
            console.error('❌ [AI-SERVICE] Provider:', this.config.provider);
            console.error('❌ [AI-SERVICE] Has Anthropic client:', !!this.anthropic);
            throw new Error(errorMsg);
        }
    }

    /**
     * Parse AI response and structure recommendations
     * @param {String} aiResponse - Raw AI response
     * @param {Object} mcdaResults - Original MCDA results
     * @returns {Object} Structured recommendations
     */
    parseAIResponse(aiResponse, mcdaResults) {
        if (!aiResponse || aiResponse.trim().length === 0) {
            throw new Error('AI API returned empty response');
        }
        
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Validate required fields
                if (!parsed.strategic) {
                    throw new Error('AI response missing required "strategic" field');
                }
                
                return {
                    strategic: parsed.strategic,
                    branchLevel: parsed.branchLevel || [],
                    keyInsights: parsed.keyInsights || [],
                    nextSteps: parsed.nextSteps || []
                };
            } else {
                // If no JSON found, throw error - we require structured JSON response
                throw new Error('AI response is not in valid JSON format. Expected structured JSON with strategic recommendations.');
            }
        } catch (error) {
            console.error('❌ [AI-SERVICE] Failed to parse AI response:', error.message);
            console.error('❌ [AI-SERVICE] Response preview:', aiResponse.substring(0, 200));
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Generate trend-based recommendations for savings/disbursement reports
     * @param {Object} reportData - Report data with monthlyData
     * @param {String} reportType - Report type (savings or disbursement)
     * @returns {Object} AI-generated or rule-based recommendations
     */
    async generateTrendRecommendations(reportData, reportType) {
        try {
            // Run trend analysis
            const monthlyData = reportData.monthlyData || [];
            const trendAnalysis = this.trendAnalysisService.analyzeTrends(monthlyData);
            
            if (!trendAnalysis.success) {
                const errorMsg = `Trend analysis failed: ${trendAnalysis.error || 'Unknown error'}`;
                console.error('❌ [AI-SERVICE]', errorMsg);
                throw new Error(errorMsg);
            }
            
            // If AI is disabled or not available, throw error
            if (!this.config.enabled || !this.anthropic) {
                const errorMsg = 'AI is disabled or not configured. Please enable AI and provide API credentials.';
                console.error('❌ [AI-SERVICE]', errorMsg);
                throw new Error(errorMsg);
            }
            
            console.log('🚀 [AI-SERVICE] AI is enabled, generating trend recommendations with', this.config.provider);
            
            // Prepare prompt for AI
            const prompt = this.buildTrendPrompt(reportData, reportType, trendAnalysis);
            console.log('📝 [AI-SERVICE] Trend prompt prepared, length:', prompt.length, 'characters');
            
            // Call AI API
            console.log('📡 [AI-SERVICE] Calling', this.config.provider, 'API with model', this.config.model);
            const startTime = Date.now();
            let aiResponse;
            try {
                aiResponse = await this.callAIAPI(prompt);
            } catch (error) {
                console.error('❌ [AI-SERVICE] AI API call failed:', error.message);
                throw error;
            }
            const apiDuration = Date.now() - startTime;
            console.log('✅ [AI-SERVICE] API call completed in', apiDuration, 'ms');
            console.log('✅ [AI-SERVICE] Response length:', aiResponse?.length || 0, 'characters');
            
            // Parse and structure AI response
            const recommendations = this.parseTrendAIResponse(aiResponse, trendAnalysis);
            console.log('✅ [AI-SERVICE] Trend response parsed successfully');
            
            return {
                success: true,
                source: 'ai',
                recommendations,
                trendAnalysis: trendAnalysis,
                metadata: {
                    model: this.config.model,
                    provider: this.config.provider,
                    timestamp: new Date().toISOString(),
                    apiDuration: apiDuration,
                    responseLength: aiResponse?.length || 0,
                    analysisType: 'time-series-trend'
                }
            };
            
        } catch (error) {
            console.error('❌ [AI-SERVICE] Trend recommendation generation failed:', error.message);
            console.error('❌ [AI-SERVICE] Error type:', error.constructor.name);
            console.error('❌ [AI-SERVICE] Stack:', error.stack);
            
            // Re-throw error - no fallback to hardcoded recommendations
            throw error;
        }
    }

    /**
     * Build AI prompt for trend-based analysis
     * @param {Object} reportData - Report data with monthlyData
     * @param {String} reportType - Report type (savings or disbursement)
     * @param {Object} trendAnalysis - Trend analysis results
     * @returns {String} Formatted prompt for AI
     */
    buildTrendPrompt(reportData, reportType, trendAnalysis) {
        const monthlyData = reportData.monthlyData || [];
        const isSavings = reportType === 'savings';
        const reportTypeName = isSavings ? 'Savings' : 'Disbursement';
        
        let prompt = `You are a financial analyst providing prescriptive recommendations for a cooperative's ${reportTypeName.toLowerCase()} performance analysis.

CONTEXT:
- Report Type: ${reportTypeName} Report
- Analysis Method: Time-Series Trend Analysis
- Period: ${reportData.period || 'N/A'}
- Total ${reportTypeName}: ₱${Number(reportData.total || 0).toLocaleString('en-PH')}
- Active Members: ${reportData.activeMembers || 0}
- Data Points: ${monthlyData.length} months

${this.formatTrendDataForAI(monthlyData, trendAnalysis)}

TREND ANALYSIS RESULTS:
${this.formatTrendAnalysisForAI(trendAnalysis)}

TASK:
Provide strategic and actionable recommendations based on this time-series analysis. Focus on:
1. Strategic insights about overall ${reportTypeName.toLowerCase()} performance trends
2. Analysis of monthly increases/decreases and their implications
3. Identification and explanation of unusual drops or spikes
4. Comparison of highest vs lowest months and what factors may have contributed
5. Next month prediction and preparation strategies
6. Specific actionable recommendations to improve ${reportTypeName.toLowerCase()} performance

FORMAT YOUR RESPONSE AS JSON:
{
  "strategic": "Strategic recommendation text here...",
  "trendInsights": {
    "overallTrend": "Description of overall trend (increasing/decreasing/stable)",
    "keyPatterns": ["Pattern 1", "Pattern 2", "Pattern 3"],
    "seasonalNotes": "Any seasonal patterns observed"
  },
  "monthlyAnalysis": [
    {
      "month": "Month Name",
      "change": "+X% or -X%",
      "insight": "Brief insight about this month's performance"
    }
  ],
  "anomalies": [
    {
      "month": "Month Name",
      "type": "drop or spike",
      "severity": "high or medium",
      "explanation": "Why this anomaly occurred",
      "recommendation": "What to do about it"
    }
  ],
  "peakAndLow": {
    "highestMonth": {
      "month": "Month Name",
      "insight": "Why this month performed best"
    },
    "lowestMonth": {
      "month": "Month Name",
      "insight": "Why this month performed worst"
    },
    "recommendations": ["Recommendation 1", "Recommendation 2"]
  },
  "forecast": {
    "nextMonthPrediction": "Predicted amount or range",
    "confidence": "high/medium/low",
    "preparationStrategies": ["Strategy 1", "Strategy 2"]
  },
  "actionableRecommendations": [
    {
      "priority": "High/Medium/Low",
      "category": "Marketing Strategy/Investigation/Product Development/etc",
      "recommendation": "Specific actionable recommendation",
      "rationale": "Why this recommendation is important"
    }
  ],
  "nextSteps": ["Next step 1", "Next step 2", "Next step 3"]
}

Ensure recommendations are:
- Specific and actionable
- Based on the actual trend data provided
- Appropriate for a financial cooperative context
- Prioritized by urgency and impact
- Focused on improving ${reportTypeName.toLowerCase()} performance`;

        return prompt;
    }

    /**
     * Format trend data for AI consumption
     * @param {Array} monthlyData - Monthly data array
     * @param {Object} trendAnalysis - Trend analysis results
     * @returns {String} Formatted trend data
     */
    formatTrendDataForAI(monthlyData, trendAnalysis) {
        // Determine report type from data context (savings or disbursement)
        const isSavings = monthlyData.length > 0 && monthlyData[0].total !== undefined;
        let formatted = `MONTHLY ${isSavings ? 'SAVINGS' : 'DISBURSEMENT'} DATA:\n\n`;
        
        monthlyData.forEach((month, index) => {
            formatted += `${index + 1}. ${month.monthName || month.month || 'Unknown'}\n`;
            formatted += `   - Amount: ₱${Number(month.total || 0).toLocaleString('en-PH')}\n`;
            formatted += `   - Active Members: ${Number(month.members || 0).toLocaleString('en-PH')}\n`;
            if (index > 0) {
                const change = trendAnalysis.monthlyChanges?.[index - 1];
                if (change) {
                    formatted += `   - Change from ${change.previousMonth}: ${change.changePercent > 0 ? '+' : ''}${change.changePercent.toFixed(2)}% (${change.direction})\n`;
                }
            }
            formatted += '\n';
        });
        
        return formatted;
    }

    /**
     * Format trend analysis results for AI consumption
     * @param {Object} trendAnalysis - Trend analysis results
     * @returns {String} Formatted analysis
     */
    formatTrendAnalysisForAI(trendAnalysis) {
        if (!trendAnalysis.success) {
            return 'Trend analysis incomplete or failed.';
        }
        
        let formatted = '';
        
        // Metrics
        if (trendAnalysis.metrics) {
            formatted += `OVERALL METRICS:\n`;
            formatted += `- Total: ₱${Number(trendAnalysis.metrics.total || 0).toLocaleString('en-PH')}\n`;
            formatted += `- Average per month: ₱${Number(trendAnalysis.metrics.average || 0).toLocaleString('en-PH')}\n`;
            formatted += `- Overall growth: ${trendAnalysis.metrics.overallGrowth > 0 ? '+' : ''}${trendAnalysis.metrics.overallGrowth.toFixed(2)}%\n`;
            formatted += `- Trend direction: ${trendAnalysis.metrics.trendDirection}\n`;
            formatted += `- Volatility: ${trendAnalysis.metrics.volatility.toFixed(2)}%\n\n`;
        }
        
        // Peaks and lows
        if (trendAnalysis.peaksAndLows) {
            formatted += `PEAK AND LOW MONTHS:\n`;
            formatted += `- Highest: ${trendAnalysis.peaksAndLows.highest.month} (₱${Number(trendAnalysis.peaksAndLows.highest.amount || 0).toLocaleString('en-PH')})\n`;
            formatted += `- Lowest: ${trendAnalysis.peaksAndLows.lowest.month} (₱${Number(trendAnalysis.peaksAndLows.lowest.amount || 0).toLocaleString('en-PH')})\n`;
            formatted += `- Difference: ₱${Number(trendAnalysis.peaksAndLows.difference || 0).toLocaleString('en-PH')} (${trendAnalysis.peaksAndLows.differencePercent.toFixed(2)}%)\n\n`;
        }
        
        // Anomalies
        if (trendAnalysis.anomalies && trendAnalysis.anomalies.hasAnomalies) {
            formatted += `ANOMALIES DETECTED:\n`;
            if (trendAnalysis.anomalies.drops.length > 0) {
                formatted += `Unusual Drops:\n`;
                trendAnalysis.anomalies.drops.forEach(drop => {
                    formatted += `- ${drop.month}: ₱${Number(drop.amount || 0).toLocaleString('en-PH')} (${drop.deviation}% below average, ${drop.severity} severity)\n`;
                });
            }
            if (trendAnalysis.anomalies.spikes.length > 0) {
                formatted += `Unusual Spikes:\n`;
                trendAnalysis.anomalies.spikes.forEach(spike => {
                    formatted += `- ${spike.month}: ₱${Number(spike.amount || 0).toLocaleString('en-PH')} (${spike.deviation}% above average, ${spike.severity} severity)\n`;
                });
            }
            formatted += '\n';
        }
        
        // Forecast
        if (trendAnalysis.forecast) {
            formatted += `NEXT MONTH FORECAST:\n`;
            formatted += `- Predicted: ₱${Number(trendAnalysis.forecast.predicted || 0).toLocaleString('en-PH')}\n`;
            formatted += `- Confidence: ${trendAnalysis.forecast.confidence}\n`;
            formatted += `- Range: ₱${Number(trendAnalysis.forecast.range?.min || 0).toLocaleString('en-PH')} - ₱${Number(trendAnalysis.forecast.range?.max || 0).toLocaleString('en-PH')}\n\n`;
        }
        
        return formatted;
    }

    /**
     * Parse AI response for trend recommendations
     * @param {String} aiResponse - Raw AI response
     * @param {Object} trendAnalysis - Trend analysis results
     * @returns {Object} Structured recommendations
     */
    parseTrendAIResponse(aiResponse, trendAnalysis) {
        if (!aiResponse || aiResponse.trim().length === 0) {
            throw new Error('AI API returned empty response');
        }
        
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Validate required fields
                if (!parsed.strategic) {
                    throw new Error('AI response missing required "strategic" field');
                }
                
                return {
                    strategic: parsed.strategic,
                    trendInsights: parsed.trendInsights || {},
                    monthlyAnalysis: parsed.monthlyAnalysis || [],
                    anomalies: parsed.anomalies || [],
                    peakAndLow: parsed.peakAndLow || {},
                    forecast: parsed.forecast || {},
                    actionableRecommendations: parsed.actionableRecommendations || [],
                    nextSteps: parsed.nextSteps || []
                };
            } else {
                // If no JSON found, throw error - we require structured JSON response
                throw new Error('AI response is not in valid JSON format. Expected structured JSON with strategic recommendations.');
            }
        } catch (error) {
            console.error('❌ [AI-SERVICE] Failed to parse trend AI response:', error.message);
            console.error('❌ [AI-SERVICE] Response preview:', aiResponse.substring(0, 200));
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Test AI connectivity and configuration
     * @returns {Object} Test results
     */
    async testAIConnectivity() {
        if (!this.config.enabled) {
            return {
                success: false,
                message: 'AI is disabled in configuration',
                config: this.config
            };
        }

        if (!this.anthropic) {
            return {
                success: false,
                message: 'AI client not initialized',
                config: this.config
            };
        }

        try {
            const testPrompt = "Respond with 'AI service is working' if you can read this message.";
            
            if (this.config.provider === 'anthropic' && this.anthropic) {
                const response = await this.anthropic.messages.create({
                    model: this.config.model,
                    max_tokens: 50,
                    messages: [{ role: 'user', content: testPrompt }]
                });
                
                return {
                    success: true,
                    message: 'AI service is working',
                    response: response.content[0]?.text,
                    config: this.config
                };
            } else {
                return {
                    success: false,
                    message: 'Unsupported AI provider. Only Anthropic is supported.',
                    config: this.config
                };
            }
        } catch (error) {
            return {
                success: false,
                message: 'AI service test failed',
                error: error.message,
                config: this.config
            };
        }
    }

    /**
     * Get service configuration
     * @returns {Object} Current configuration
     */
    getConfiguration() {
        return {
            ...this.config,
            clientInitialized: !!this.anthropic
        };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.config.enabled && this.config.apiKey && !this.anthropic) {
            this.initializeAIClient();
        }
    }
}

module.exports = AIRecommendationService;

