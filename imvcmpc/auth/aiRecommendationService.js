const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class AIRecommendationService {
    constructor(config = {}) {
        this.config = {
            enabled: config.AI_ENABLED === 'true' || config.AI_ENABLED === true,
            provider: config.AI_PROVIDER || 'openai',
            apiKey: config.OPENAI_API_KEY || config.ANTHROPIC_API_KEY || config.AI_API_KEY,
            model: config.AI_MODEL || 'gpt-4-turbo-preview',
            maxTokens: parseInt(config.AI_MAX_TOKENS) || 2000,
            temperature: parseFloat(config.AI_TEMPERATURE) || 0.7,
            timeout: parseInt(config.AI_TIMEOUT) || 30000
        };
        
        this.openai = null;
        this.anthropic = null;
        
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
            
            if (this.config.provider === 'openai') {
                this.openai = new OpenAI({
                    apiKey: this.config.apiKey,
                    timeout: this.config.timeout
                });
                console.log('✅ [AI-SERVICE] OpenAI client initialized successfully');
            } else if (this.config.provider === 'anthropic') {
                this.anthropic = new Anthropic({
                    apiKey: this.config.apiKey,
                    timeout: this.config.timeout
                });
                console.log('✅ [AI-SERVICE] Anthropic client initialized successfully');
            } else {
                console.warn(`⚠️ [AI-SERVICE] Unsupported AI provider: ${this.config.provider}. Falling back to rule-based recommendations.`);
                this.config.enabled = false;
            }
        } catch (error) {
            console.error('❌ [AI-SERVICE] Failed to initialize AI client:', error.message);
            console.error('❌ [AI-SERVICE] Stack:', error.stack);
            this.config.enabled = false;
        }
    }

    /**
     * Generate AI-powered recommendations using MCDA results
     * @param {Object} mcdaResults - Results from MCDA analysis
     * @param {Object} reportData - Original report data
     * @param {String} reportType - Type of report (branch, savings, disbursement, member)
     * @returns {Object} AI-generated recommendations
     */
    async generateRecommendations(mcdaResults, reportData, reportType = 'branch') {
        try {
            // If AI is disabled or not available, use rule-based recommendations
            if (!this.config.enabled || (!this.openai && !this.anthropic)) {
                console.log('ℹ️ [AI-SERVICE] AI disabled or not configured, using rule-based recommendations');
                console.log('ℹ️ [AI-SERVICE] Config:', {
                    enabled: this.config.enabled,
                    hasOpenAI: !!this.openai,
                    hasAnthropic: !!this.anthropic,
                    provider: this.config.provider
                });
                return this.generateRuleBasedRecommendations(mcdaResults, reportData, reportType);
            }

            console.log('🚀 [AI-SERVICE] AI is enabled, generating recommendations with', this.config.provider);
            
            // Prepare prompt for AI
            const prompt = this.buildAIPrompt(mcdaResults, reportData, reportType);
            console.log('📝 [AI-SERVICE] Prompt prepared, length:', prompt.length, 'characters');
            
            // Call AI API
            console.log('📡 [AI-SERVICE] Calling', this.config.provider, 'API with model', this.config.model);
            const startTime = Date.now();
            const aiResponse = await this.callAIAPI(prompt);
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
            
            // Fallback to rule-based recommendations
            console.log('🔄 [AI-SERVICE] Falling back to rule-based recommendations');
            return {
                success: false,
                source: 'rule-based-fallback',
                error: error.message,
                recommendations: this.generateRuleBasedRecommendations(mcdaResults, reportData, reportType),
                metadata: {
                    fallbackReason: 'AI API error',
                    errorType: error.constructor.name,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Build AI prompt based on MCDA results and report data
     * @param {Object} mcdaResults - MCDA analysis results
     * @param {Object} reportData - Report data
     * @param {String} reportType - Report type
     * @returns {String} Formatted prompt for AI
     */
    buildAIPrompt(mcdaResults, reportData, reportType) {
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

TASK:
Provide strategic and branch-level recommendations based on this analysis. Focus on:
1. Strategic insights for overall cooperative performance
2. Specific actionable recommendations for each branch
3. Priority areas for improvement
4. Best practices to replicate from top performers

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
   - Net Position: ₱${Number(branch.net_position || 0).toLocaleString('en-PH')}
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
        } else if (this.config.provider === 'openai' && this.openai) {
            // Call OpenAI API
            console.log('🤖 [AI-SERVICE] Calling OpenAI API...');
            try {
                const response = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a financial analyst specializing in cooperative performance analysis. Provide clear, actionable recommendations based on data analysis.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    timeout: this.config.timeout
                });

                console.log('✅ [AI-SERVICE] OpenAI API response received');
                console.log('✅ [AI-SERVICE] Usage:', response.usage);
                return response.choices[0]?.message?.content || '';
            } catch (error) {
                console.error('❌ [AI-SERVICE] OpenAI API error:', error.message);
                if (error.status) console.error('❌ [AI-SERVICE] Status code:', error.status);
                throw error;
            }
        } else {
            const errorMsg = 'AI client not initialized';
            console.error('❌ [AI-SERVICE]', errorMsg);
            console.error('❌ [AI-SERVICE] Provider:', this.config.provider);
            console.error('❌ [AI-SERVICE] Has Anthropic client:', !!this.anthropic);
            console.error('❌ [AI-SERVICE] Has OpenAI client:', !!this.openai);
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
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    strategic: parsed.strategic || "Strategic recommendations not provided.",
                    branchLevel: parsed.branchLevel || [],
                    keyInsights: parsed.keyInsights || [],
                    nextSteps: parsed.nextSteps || []
                };
            } else {
                // Fallback: treat entire response as strategic recommendation
                return {
                    strategic: aiResponse,
                    branchLevel: [],
                    keyInsights: [],
                    nextSteps: []
                };
            }
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return {
                strategic: aiResponse || "Unable to generate AI recommendations.",
                branchLevel: [],
                keyInsights: [],
                nextSteps: []
            };
        }
    }

    /**
     * Generate rule-based recommendations as fallback
     * @param {Object} mcdaResults - MCDA analysis results
     * @param {Object} reportData - Report data
     * @param {String} reportType - Report type
     * @returns {Object} Rule-based recommendations
     */
    generateRuleBasedRecommendations(mcdaResults, reportData, reportType) {
        const rankedBranches = mcdaResults.rankedBranches || [];
        const excellentBranches = rankedBranches.filter(b => b.category === 'Excellent');
        const needsImprovementBranches = rankedBranches.filter(b => b.category === 'Needs Improvement');
        
        // Strategic recommendations
        let strategic = "Based on TOPSIS analysis of branch performance: ";
        
        if (excellentBranches.length > 0) {
            const excellentNames = excellentBranches.map(b => b.branch_name).join(', ');
            strategic += `Top-performing branches (${excellentNames}) demonstrate strong performance across all criteria. `;
        }
        
        if (needsImprovementBranches.length > 0) {
            const improvementNames = needsImprovementBranches.map(b => b.branch_name).join(', ');
            strategic += `Branches requiring attention (${improvementNames}) need targeted interventions to improve performance. `;
        }
        
        strategic += "Focus on replicating successful strategies from high performers while addressing specific gaps in underperforming branches.";
        
        // Branch-level recommendations
        const branchLevel = rankedBranches.map(branch => {
            const recommendations = [];
            const priority = branch.topsisScore < 0.5 ? 'High' : branch.topsisScore < 0.75 ? 'Medium' : 'Low';
            
            if (branch.topsisScore < 0.5) {
                recommendations.push("Develop comprehensive improvement plan");
                recommendations.push("Increase member engagement activities");
                recommendations.push("Review operational efficiency");
            } else if (branch.topsisScore < 0.75) {
                recommendations.push("Focus on specific performance gaps");
                recommendations.push("Implement best practices from top performers");
            } else {
                recommendations.push("Maintain current successful strategies");
                recommendations.push("Share best practices with other branches");
            }
            
            return {
                branchName: branch.branch_name,
                priority,
                recommendations,
                rationale: `Based on TOPSIS score of ${(branch.topsisScore * 100).toFixed(1)}% and ${branch.category} category classification.`
            };
        });
        
        return {
            strategic,
            branchLevel,
            keyInsights: [
                `${excellentBranches.length} branches achieved 'Excellent' status`,
                `${needsImprovementBranches.length} branches need improvement`,
                `Average TOPSIS score: ${(rankedBranches.reduce((sum, b) => sum + b.topsisScore, 0) / rankedBranches.length * 100).toFixed(1)}%`
            ],
            nextSteps: [
                "Review detailed branch performance metrics",
                "Develop action plans for underperforming branches",
                "Document and share best practices from top performers"
            ]
        };
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

        if (!this.openai && !this.anthropic) {
            return {
                success: false,
                message: 'AI client not initialized',
                config: this.config
            };
        }

        try {
            const testPrompt = "Respond with 'AI service is working' if you can read this message.";
            let response;

            if (this.config.provider === 'anthropic' && this.anthropic) {
                response = await this.anthropic.messages.create({
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
            } else if (this.config.provider === 'openai' && this.openai) {
                response = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages: [{ role: 'user', content: testPrompt }],
                    max_tokens: 50,
                    temperature: 0
                });

                return {
                    success: true,
                    message: 'AI service is working',
                    response: response.choices[0]?.message?.content,
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
            clientInitialized: !!(this.openai || this.anthropic)
        };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.config.enabled && this.config.apiKey && !this.openai) {
            this.initializeAIClient();
        }
    }
}

module.exports = AIRecommendationService;

