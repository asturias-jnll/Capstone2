const math = require('mathjs');

class MCDAService {
    constructor() {
        this.defaultWeights = {
            total_savings: 0.25,
            total_disbursements: 0.20,
            net_interest_income: 0.30,
            active_members: 0.15,
            performance_pct: 0.10
        };
        this.criteria = {
            total_savings: { type: 'benefit', weight: this.defaultWeights.total_savings },
            total_disbursements: { type: 'cost', weight: this.defaultWeights.total_disbursements },
            net_interest_income: { type: 'benefit', weight: this.defaultWeights.net_interest_income },
            active_members: { type: 'benefit', weight: this.defaultWeights.active_members },
            performance_pct: { type: 'benefit', weight: this.defaultWeights.performance_pct }
        };
    }

    /**
     * Analyze branch performance using TOPSIS algorithm
     * @param {Array} branchesData - Array of branch performance data
     * @param {Object} customWeights - Optional custom weights for criteria
     * @returns {Object} Analysis results with rankings and recommendations
     */
    analyzeBranchPerformance(branchesData, customWeights = null) {
        try {
            if (!branchesData || !Array.isArray(branchesData) || branchesData.length === 0) {
                throw new Error('Invalid or empty branches data provided');
            }

            const weights = customWeights || this.defaultWeights;
            const decisionMatrix = this.prepareDecisionMatrix(branchesData);
            const normalizedMatrix = this.normalizeMatrix(decisionMatrix);
            const weightedMatrix = this.applyWeights(normalizedMatrix, weights);
            const { idealSolution, negativeIdealSolution } = this.calculateIdealSolutions(weightedMatrix);
            const distances = this.calculateDistances(weightedMatrix, idealSolution, negativeIdealSolution);
            const topsisScores = this.calculateTOPSISScores(distances);
            const rankedBranches = this.rankBranches(branchesData, topsisScores);
            const recommendations = this.generateRecommendations(rankedBranches, branchesData);
            
            return {
                success: true,
                rankedBranches,
                topsisScores,
                idealSolution,
                negativeIdealSolution,
                recommendations,
                analysisMetadata: {
                    totalBranches: branchesData.length,
                    criteriaUsed: Object.keys(this.criteria),
                    weightsUsed: weights,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Error in MCDA analysis:', error);
            return {
                success: false,
                error: error.message,
                rankedBranches: [],
                recommendations: {
                    strategic: "Unable to generate recommendations due to analysis error.",
                    branchLevel: []
                }
            };
        }
    }

    /**
     * Prepare decision matrix from branch data
     * @param {Array} branchesData - Raw branch data
     * @returns {Array} Decision matrix
     */
    prepareDecisionMatrix(branchesData) {
        return branchesData.map(branch => [
            parseFloat(branch.total_savings || 0),
            parseFloat(branch.total_disbursements || 0),
            parseFloat(branch.net_interest_income || 0),
            parseFloat(branch.active_members || 0),
            parseFloat(branch.performancePct || 0)
        ]);
    }

    /**
     * Normalize decision matrix using vector normalization
     * @param {Array} matrix - Decision matrix
     * @returns {Array} Normalized matrix
     */
    normalizeMatrix(matrix) {
        const numCriteria = matrix[0].length;
        const normalizedMatrix = [];
        const normalizationFactors = [];
        for (let j = 0; j < numCriteria; j++) {
            let sumOfSquares = 0;
            for (let i = 0; i < matrix.length; i++) {
                sumOfSquares += Math.pow(matrix[i][j], 2);
            }
            normalizationFactors[j] = Math.sqrt(sumOfSquares);
        }
        
        for (let i = 0; i < matrix.length; i++) {
            const normalizedRow = [];
            for (let j = 0; j < numCriteria; j++) {
                const normalizedValue = normalizationFactors[j] === 0 ? 0 : matrix[i][j] / normalizationFactors[j];
                normalizedRow.push(normalizedValue);
            }
            normalizedMatrix.push(normalizedRow);
        }
        
        return normalizedMatrix;
    }

    /**
     * Apply weights to normalized matrix
     * @param {Array} normalizedMatrix - Normalized decision matrix
     * @param {Object} weights - Criteria weights
     * @returns {Array} Weighted matrix
     */
    applyWeights(normalizedMatrix, weights) {
        const weightValues = [
            weights.total_savings,
            weights.total_disbursements,
            weights.net_interest_income,
            weights.active_members,
            weights.performance_pct
        ];
        
        return normalizedMatrix.map(row => 
            row.map((value, index) => value * weightValues[index])
        );
    }

    /**
     * Calculate ideal and negative-ideal solutions
     * @param {Array} weightedMatrix - Weighted decision matrix
     * @returns {Object} Ideal and negative-ideal solutions
     */
    calculateIdealSolutions(weightedMatrix) {
        const numCriteria = weightedMatrix[0].length;
        const idealSolution = [];
        const negativeIdealSolution = [];
        
        for (let j = 0; j < numCriteria; j++) {
            const columnValues = weightedMatrix.map(row => row[j]);
            const maxValue = Math.max(...columnValues);
            const minValue = Math.min(...columnValues);
            
            const criteriaKeys = Object.keys(this.criteria);
            const criteriaType = this.criteria[criteriaKeys[j]].type;
            
            if (criteriaType === 'benefit') {
                idealSolution[j] = maxValue;
                negativeIdealSolution[j] = minValue;
            } else {
                idealSolution[j] = minValue;
                negativeIdealSolution[j] = maxValue;
            }
        }
        
        return { idealSolution, negativeIdealSolution };
    }

    /**
     * Calculate distances from ideal and negative-ideal solutions
     * @param {Array} weightedMatrix - Weighted decision matrix
     * @param {Array} idealSolution - Ideal solution
     * @param {Array} negativeIdealSolution - Negative-ideal solution
     * @returns {Object} Distance calculations
     */
    calculateDistances(weightedMatrix, idealSolution, negativeIdealSolution) {
        const distancesFromIdeal = [];
        const distancesFromNegativeIdeal = [];
        
        for (let i = 0; i < weightedMatrix.length; i++) {
            let sumIdeal = 0;
            let sumNegativeIdeal = 0;
            
            for (let j = 0; j < weightedMatrix[i].length; j++) {
                sumIdeal += Math.pow(weightedMatrix[i][j] - idealSolution[j], 2);
                sumNegativeIdeal += Math.pow(weightedMatrix[i][j] - negativeIdealSolution[j], 2);
            }
            
            distancesFromIdeal.push(Math.sqrt(sumIdeal));
            distancesFromNegativeIdeal.push(Math.sqrt(sumNegativeIdeal));
        }
        
        return { distancesFromIdeal, distancesFromNegativeIdeal };
    }

    /**
     * Calculate TOPSIS scores
     * @param {Object} distances - Distance calculations
     * @returns {Array} TOPSIS scores
     */
    calculateTOPSISScores(distances) {
        const { distancesFromIdeal, distancesFromNegativeIdeal } = distances;
        const topsisScores = [];
        
        for (let i = 0; i < distancesFromIdeal.length; i++) {
            const denominator = distancesFromIdeal[i] + distancesFromNegativeIdeal[i];
            const score = denominator === 0 ? 0 : distancesFromNegativeIdeal[i] / denominator;
            topsisScores.push(score);
        }
        
        return topsisScores;
    }

    /**
     * Rank branches by TOPSIS score
     * @param {Array} branchesData - Original branch data
     * @param {Array} topsisScores - TOPSIS scores
     * @returns {Array} Ranked branches with scores and categories
     */
    rankBranches(branchesData, topsisScores) {
        const branchesWithScores = branchesData.map((branch, index) => ({
            ...branch,
            topsisScore: topsisScores[index],
            rank: 0
        }));
        
        branchesWithScores.sort((a, b) => b.topsisScore - a.topsisScore);
        return branchesWithScores.map((branch, index) => {
            const rank = index + 1;
            let category = 'Needs Improvement';
            
            if (branch.topsisScore >= 0.75) {
                category = 'Excellent';
            } else if (branch.topsisScore >= 0.50) {
                category = 'Good';
            }
            
            return {
                ...branch,
                rank,
                category,
                scorePercentage: Math.round(branch.topsisScore * 100)
            };
        });
    }

    /**
     * Generate strategic and branch-level recommendations
     * @param {Array} rankedBranches - Ranked branches with scores
     * @param {Array} originalData - Original branch data
     * @returns {Object} Strategic and branch-level recommendations
     */
    generateRecommendations(rankedBranches, originalData) {
        const excellentBranches = rankedBranches.filter(b => b.category === 'Excellent');
        const goodBranches = rankedBranches.filter(b => b.category === 'Good');
        const needsImprovementBranches = rankedBranches.filter(b => b.category === 'Needs Improvement');
        
        const strategicRecommendations = this.generateStrategicRecommendations(
            excellentBranches, 
            goodBranches, 
            needsImprovementBranches
        );
        const branchLevelRecommendations = this.generateBranchLevelRecommendations(rankedBranches);
        
        return {
            strategic: strategicRecommendations,
            branchLevel: branchLevelRecommendations
        };
    }

    /**
     * Generate strategic recommendations
     * @param {Array} excellentBranches - Excellent performing branches
     * @param {Array} goodBranches - Good performing branches
     * @param {Array} needsImprovementBranches - Branches needing improvement
     * @returns {String} Strategic recommendation text
     */
    generateStrategicRecommendations(excellentBranches, goodBranches, needsImprovementBranches) {
        let recommendations = [];
        
        if (excellentBranches.length > 0) {
            const excellentNames = excellentBranches.map(b => b.branch_name).join(', ');
            recommendations.push(`Focus on replicating successful strategies from top-performing branches: ${excellentNames}. These branches show balanced performance across all criteria and should serve as models for others.`);
        }
        
        if (needsImprovementBranches.length > 0) {
            const improvementNames = needsImprovementBranches.map(b => b.branch_name).join(', ');
            recommendations.push(`Allocate additional resources and support to branches requiring improvement: ${improvementNames}. Consider targeted interventions based on specific performance gaps.`);
        }
        
        if (goodBranches.length > 0) {
            recommendations.push(`Branches in the 'Good' category have solid foundations but may benefit from targeted improvements in specific areas to reach 'Excellent' status.`);
        }
        
        const totalBranches = excellentBranches.length + goodBranches.length + needsImprovementBranches.length;
        const excellentPercentage = Math.round((excellentBranches.length / totalBranches) * 100);
        
        if (excellentPercentage >= 50) {
            recommendations.push(`Strong overall performance with ${excellentPercentage}% of branches achieving 'Excellent' status. Focus on maintaining current strategies while addressing remaining gaps.`);
        } else if (excellentPercentage >= 25) {
            recommendations.push(`Moderate performance with ${excellentPercentage}% of branches achieving 'Excellent' status. Focus on elevating 'Good' branches to 'Excellent' status.`);
        } else {
            recommendations.push(`Significant improvement opportunities identified with only ${excellentPercentage}% of branches achieving 'Excellent' status. Consider comprehensive performance enhancement initiatives.`);
        }
        
        return recommendations.join(' ');
    }

    /**
     * Generate branch-level recommendations
     * @param {Array} rankedBranches - Ranked branches with scores
     * @returns {Array} Branch-level recommendations
     */
    generateBranchLevelRecommendations(rankedBranches) {
        return rankedBranches.map(branch => {
            const recommendations = [];
            
            if (branch.total_savings < branch.total_disbursements) {
                recommendations.push("Focus on increasing savings deposits to improve financial stability");
            }
            
            if (branch.active_members < 100) {
                recommendations.push("Implement member acquisition strategies to increase active membership");
            }
            
            if (branch.net_interest_income < 0) {
                recommendations.push("Review lending strategies and interest rate policies to improve net interest income profitability");
            }
            
            if (branch.performancePct < 0) {
                recommendations.push("Review operational efficiency and cost management practices");
            }
            
            if (branch.topsisScore < 0.5) {
                recommendations.push("Develop comprehensive improvement plan addressing multiple performance areas");
            }
            
            if (branch.topsisScore >= 0.75) {
                recommendations.push("Maintain current successful strategies and consider sharing best practices with other branches");
            }
            
            return {
                branchId: branch.branch_id || branch.id,
                branchName: branch.branch_name,
                score: branch.topsisScore,
                category: branch.category,
                recommendations: recommendations.length > 0 ? recommendations : ["Continue monitoring performance and maintain current operations"],
                priority: branch.topsisScore < 0.5 ? 'High' : branch.topsisScore < 0.75 ? 'Medium' : 'Low'
            };
        });
    }

    /**
     * Update criteria weights
     * @param {Object} newWeights - New weight configuration
     */
    updateWeights(newWeights) {
        const totalWeight = Object.values(newWeights).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            throw new Error('Weights must sum to 1.0');
        }
        
        this.defaultWeights = { ...this.defaultWeights, ...newWeights };
        Object.keys(newWeights).forEach(criteria => {
            if (this.criteria[criteria]) {
                this.criteria[criteria].weight = newWeights[criteria];
            }
        });
    }

    /**
     * Get current criteria configuration
     * @returns {Object} Current criteria and weights
     */
    getCriteriaConfiguration() {
        return {
            criteria: this.criteria,
            defaultWeights: this.defaultWeights
        };
    }
}

module.exports = MCDAService;

