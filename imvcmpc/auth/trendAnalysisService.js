class TrendAnalysisService {
    constructor() {
        // Configuration for anomaly detection
        this.anomalyThreshold = 2.0; // Z-score threshold (2 standard deviations)
    }

    /**
     * Analyze trends from monthly data
     * @param {Array} monthlyData - Array of monthly data objects with {month, monthName, total, members}
     * @returns {Object} Trend analysis results
     */
    analyzeTrends(monthlyData) {
        if (!monthlyData || monthlyData.length === 0) {
            return {
                success: false,
                error: 'No monthly data provided'
            };
        }

        if (monthlyData.length < 2) {
            return {
                success: false,
                error: 'Insufficient data for trend analysis (need at least 2 months)'
            };
        }

        const totals = monthlyData.map(m => parseFloat(m.total || 0));
        const monthlyChanges = this.calculateMonthlyChanges(monthlyData);
        const anomalies = this.detectAnomalies(monthlyData);
        const peaksAndLows = this.findPeaksAndLows(monthlyData);
        const forecast = this.predictNextMonth(monthlyData);
        const metrics = this.calculateTrendMetrics(monthlyData);

        return {
            success: true,
            monthlyChanges,
            anomalies,
            peaksAndLows,
            forecast,
            metrics,
            dataPoints: monthlyData.length
        };
    }

    /**
     * Calculate month-over-month percentage changes
     * @param {Array} monthlyData - Monthly data array
     * @returns {Array} Array of change objects
     */
    calculateMonthlyChanges(monthlyData) {
        const changes = [];
        
        for (let i = 1; i < monthlyData.length; i++) {
            const current = parseFloat(monthlyData[i].total || 0);
            const previous = parseFloat(monthlyData[i - 1].total || 0);
            
            let changePercent = 0;
            let changeAmount = 0;
            let direction = 'stable';
            
            if (previous > 0) {
                changePercent = ((current - previous) / previous) * 100;
                changeAmount = current - previous;
            } else if (current > 0) {
                changePercent = 100; // New data from zero
                changeAmount = current;
            }
            
            if (changePercent > 0.1) {
                direction = 'increase';
            } else if (changePercent < -0.1) {
                direction = 'decrease';
            }
            
            changes.push({
                month: monthlyData[i].monthName,
                monthIndex: monthlyData[i].month,
                previousMonth: monthlyData[i - 1].monthName,
                currentAmount: current,
                previousAmount: previous,
                changeAmount: changeAmount,
                changePercent: parseFloat(changePercent.toFixed(2)),
                direction: direction
            });
        }
        
        return changes;
    }

    /**
     * Detect anomalies using statistical methods (z-score)
     * @param {Array} monthlyData - Monthly data array
     * @returns {Object} Anomaly detection results
     */
    detectAnomalies(monthlyData) {
        const totals = monthlyData.map(m => parseFloat(m.total || 0));
        
        // Calculate mean and standard deviation
        const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
        const variance = totals.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / totals.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev === 0) {
            return {
                hasAnomalies: false,
                drops: [],
                spikes: []
            };
        }
        
        const anomalies = {
            hasAnomalies: false,
            drops: [],
            spikes: [],
            mean: mean,
            stdDev: stdDev,
            threshold: this.anomalyThreshold
        };
        
        monthlyData.forEach((month, index) => {
            const value = parseFloat(month.total || 0);
            const zScore = (value - mean) / stdDev;
            
            if (Math.abs(zScore) > this.anomalyThreshold) {
                anomalies.hasAnomalies = true;
                
                const anomaly = {
                    month: month.monthName,
                    monthIndex: month.month,
                    amount: value,
                    zScore: parseFloat(zScore.toFixed(2)),
                    deviation: parseFloat(((value - mean) / mean * 100).toFixed(2)),
                    severity: Math.abs(zScore) > 3 ? 'high' : 'medium'
                };
                
                if (zScore < -this.anomalyThreshold) {
                    anomalies.drops.push(anomaly);
                } else if (zScore > this.anomalyThreshold) {
                    anomalies.spikes.push(anomaly);
                }
            }
        });
        
        return anomalies;
    }

    /**
     * Find highest and lowest months
     * @param {Array} monthlyData - Monthly data array
     * @returns {Object} Peak and low month information
     */
    findPeaksAndLows(monthlyData) {
        if (monthlyData.length === 0) {
            return { highest: null, lowest: null };
        }
        
        let highest = monthlyData[0];
        let lowest = monthlyData[0];
        
        monthlyData.forEach(month => {
            const value = parseFloat(month.total || 0);
            const highestValue = parseFloat(highest.total || 0);
            const lowestValue = parseFloat(lowest.total || 0);
            
            if (value > highestValue) {
                highest = month;
            }
            if (value < lowestValue) {
                lowest = month;
            }
        });
        
        const highestValue = parseFloat(highest.total || 0);
        const lowestValue = parseFloat(lowest.total || 0);
        const difference = highestValue - lowestValue;
        const differencePercent = lowestValue > 0 ? (difference / lowestValue) * 100 : 0;
        
        return {
            highest: {
                month: highest.monthName,
                monthIndex: highest.month,
                amount: highestValue,
                members: highest.members || 0
            },
            lowest: {
                month: lowest.monthName,
                monthIndex: lowest.month,
                amount: lowestValue,
                members: lowest.members || 0
            },
            difference: difference,
            differencePercent: parseFloat(differencePercent.toFixed(2))
        };
    }

    /**
     * Predict next month using linear regression
     * @param {Array} monthlyData - Monthly data array
     * @returns {Object} Forecast results
     */
    predictNextMonth(monthlyData) {
        if (monthlyData.length < 2) {
            return {
                predicted: null,
                confidence: 'low',
                range: null,
                method: 'insufficient_data'
            };
        }
        
        const n = monthlyData.length;
        const x = monthlyData.map((_, i) => i + 1); // Month indices (1, 2, 3, ...)
        const y = monthlyData.map(m => parseFloat(m.total || 0));
        
        // Calculate linear regression
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Predict next month (n + 1)
        const nextMonthIndex = n + 1;
        const predicted = slope * nextMonthIndex + intercept;
        
        // Calculate confidence based on data quality and trend consistency
        const recentTrend = this.calculateRecentTrend(monthlyData);
        const volatility = this.calculateVolatility(monthlyData);
        
        let confidence = 'medium';
        if (n >= 6 && volatility < 0.15 && Math.abs(recentTrend) < 0.3) {
            confidence = 'high';
        } else if (n < 3 || volatility > 0.3) {
            confidence = 'low';
        }
        
        // Calculate confidence range (±15% for medium, ±10% for high, ±25% for low)
        const rangePercent = confidence === 'high' ? 0.10 : confidence === 'medium' ? 0.15 : 0.25;
        const range = {
            min: Math.max(0, predicted * (1 - rangePercent)),
            max: predicted * (1 + rangePercent)
        };
        
        return {
            predicted: Math.max(0, parseFloat(predicted.toFixed(2))),
            confidence: confidence,
            range: {
                min: parseFloat(range.min.toFixed(2)),
                max: parseFloat(range.max.toFixed(2))
            },
            method: 'linear_regression',
            slope: parseFloat(slope.toFixed(2)),
            intercept: parseFloat(intercept.toFixed(2))
        };
    }

    /**
     * Calculate recent trend (last 3 months vs previous 3 months)
     * @param {Array} monthlyData - Monthly data array
     * @returns {Number} Trend percentage
     */
    calculateRecentTrend(monthlyData) {
        if (monthlyData.length < 6) {
            return 0;
        }
        
        const recent = monthlyData.slice(-3).reduce((sum, m) => sum + parseFloat(m.total || 0), 0);
        const previous = monthlyData.slice(-6, -3).reduce((sum, m) => sum + parseFloat(m.total || 0), 0);
        
        if (previous === 0) return 0;
        return ((recent - previous) / previous);
    }

    /**
     * Calculate volatility (coefficient of variation)
     * @param {Array} monthlyData - Monthly data array
     * @returns {Number} Volatility as decimal
     */
    calculateVolatility(monthlyData) {
        const totals = monthlyData.map(m => parseFloat(m.total || 0));
        const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
        
        if (mean === 0) return 0;
        
        const variance = totals.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / totals.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev / mean; // Coefficient of variation
    }

    /**
     * Calculate aggregate trend metrics
     * @param {Array} monthlyData - Monthly data array
     * @returns {Object} Aggregate metrics
     */
    calculateTrendMetrics(monthlyData) {
        const totals = monthlyData.map(m => parseFloat(m.total || 0));
        const firstValue = totals[0];
        const lastValue = totals[totals.length - 1];
        
        const total = totals.reduce((a, b) => a + b, 0);
        const average = total / totals.length;
        const mean = average;
        
        const variance = totals.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / totals.length;
        const stdDev = Math.sqrt(variance);
        const volatility = mean > 0 ? stdDev / mean : 0;
        
        // Overall growth rate
        const overallGrowth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
        
        // Average monthly change
        const monthlyChanges = this.calculateMonthlyChanges(monthlyData);
        const avgMonthlyChange = monthlyChanges.length > 0
            ? monthlyChanges.reduce((sum, c) => sum + c.changePercent, 0) / monthlyChanges.length
            : 0;
        
        // Trend direction
        let trendDirection = 'stable';
        if (overallGrowth > 5) {
            trendDirection = 'increasing';
        } else if (overallGrowth < -5) {
            trendDirection = 'decreasing';
        }
        
        return {
            total: total,
            average: parseFloat(average.toFixed(2)),
            firstValue: firstValue,
            lastValue: lastValue,
            overallGrowth: parseFloat(overallGrowth.toFixed(2)),
            avgMonthlyChange: parseFloat(avgMonthlyChange.toFixed(2)),
            trendDirection: trendDirection,
            volatility: parseFloat((volatility * 100).toFixed(2)), // As percentage
            stdDev: parseFloat(stdDev.toFixed(2)),
            dataPoints: monthlyData.length
        };
    }
}

module.exports = TrendAnalysisService;

