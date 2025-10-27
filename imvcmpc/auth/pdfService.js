const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class PDFService {
    constructor(config = {}) {
        this.config = {
            puppeteerOptions: {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                ...config.puppeteerOptions
            },
            pdfOptions: {
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                },
                displayHeaderFooter: false,
                preferCSSPageSize: true,
                ...config.pdfOptions
            },
            tempDir: config.tempDir || path.join(__dirname, 'temp'),
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024 // 10MB
        };
        
        this.browser = null;
    }

    /**
     * Generate PDF from HTML content
     * @param {String} htmlContent - HTML content to convert
     * @param {Object} options - PDF generation options
     * @returns {Buffer} PDF buffer
     */
    async generatePDF(htmlContent, options = {}) {
        let page = null;
        
        try {
            // Ensure temp directory exists
            await this.ensureTempDirectory();
            
            // Launch browser if not already running
            if (!this.browser) {
                this.browser = await puppeteer.launch(this.config.puppeteerOptions);
            }
            
            // Create new page
            page = await this.browser.newPage();
            
            // Set viewport for consistent rendering
            await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
            
            // Inject CSS and JavaScript for better PDF rendering
            await this.injectPDFEnhancements(page);
            
            // Wrap HTML content with Chart.js library if it contains canvas elements
            const wrappedHTML = this.wrapHTMLWithChartJS(htmlContent);
            
            // Set content
            await page.setContent(wrappedHTML, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Wait for charts to render
            await this.waitForCharts(page);
            
            // Generate PDF with proper scaling
            const pdfOptions = { 
                ...this.config.pdfOptions, 
                ...options,
                width: '210mm',  // A4 width
                height: '297mm',  // A4 height
            };
            const pdfBuffer = await page.pdf(pdfOptions);
            
            return pdfBuffer;
            
        } catch (error) {
            console.error('PDF generation error:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        } finally {
            if (page) {
                await page.close();
            }
        }
    }
    
    /**
     * Wrap HTML content with Chart.js library if it contains canvas elements
     * @param {String} htmlContent - HTML content to wrap
     * @returns {String} Wrapped HTML content
     */
    wrapHTMLWithChartJS(htmlContent) {
        // Check if HTML is already a complete document (has DOCTYPE or <html> tag)
        const isCompleteDocument = htmlContent.trim().startsWith('<!DOCTYPE html>') || 
                                   htmlContent.trim().startsWith('<html');
        
        // If it's already a complete HTML document, return as-is
        if (isCompleteDocument) {
            return htmlContent;
        }
        
        // Check if HTML contains canvas elements
        if (htmlContent.includes('<canvas')) {
            return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .report-container {
            max-width: 100%;
        }
        canvas {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    ${htmlContent}
    <script>
        // Wait for Chart.js to be loaded, then initialize charts from canvas data
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js loaded successfully');
        }
    </script>
</body>
</html>`;
        }
        
        // If no canvas elements, return original content
        return htmlContent;
    }

    /**
     * Generate PDF from report data with AI recommendations
     * @param {Object} reportData - Report data object
     * @param {Object} aiRecommendations - AI recommendations
     * @param {Object} options - PDF options
     * @returns {Buffer} PDF buffer
     */
    async generateReportPDF(reportData, aiRecommendations = null, options = {}) {
        try {
            // Generate HTML content
            const htmlContent = this.generateReportHTML(reportData, aiRecommendations);
            
            // Generate PDF
            const pdfBuffer = await this.generatePDF(htmlContent, options);
            
            return pdfBuffer;
            
        } catch (error) {
            console.error('Report PDF generation error:', error);
            throw new Error(`Report PDF generation failed: ${error.message}`);
        }
    }

    /**
     * Generate HTML content for report with AI recommendations
     * @param {Object} reportData - Report data
     * @param {Object} aiRecommendations - AI recommendations
     * @returns {String} HTML content
     */
    generateReportHTML(reportData, aiRecommendations = null) {
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const currentTime = new Date().toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.type || 'Financial Report'} - IMVCMPC</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        ${this.getPDFStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <div class="report-header">
            <div class="header-left">
                <img src="data:image/png;base64,${this.getLogoBase64()}" alt="IMVCMPC Logo" class="logo">
                <div class="header-text">
                    <h1>IMVCMPC</h1>
                    <p>Ibaan Multi-Purpose Cooperative</p>
                </div>
            </div>
            <div class="header-right">
                <div class="report-info">
                    <h2>${reportData.type || 'Financial Report'}</h2>
                    <p>Generated: ${currentDate} at ${currentTime}</p>
                    <p>Period: ${reportData.period || 'N/A'}</p>
                </div>
            </div>
        </div>

        <!-- Report Content -->
        <div class="report-content">
            ${this.generateReportContent(reportData)}
        </div>

        <!-- AI Recommendations Section -->
        ${aiRecommendations ? this.generateAIRecommendationsHTML(aiRecommendations) : ''}

        <!-- Footer -->
        <div class="report-footer">
            <p>This report was generated by the IMVCMPC Financial Management System</p>
            <p>For questions or clarifications, please contact the Finance Officer</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Generate report content HTML
     * @param {Object} reportData - Report data
     * @returns {String} HTML content
     */
    generateReportContent(reportData) {
        let content = '';
        
        // Report statistics
        if (reportData.total !== undefined || reportData.activeMembers !== undefined) {
            content += `
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.total ? '₱' + Number(reportData.total).toLocaleString('en-PH') : 'N/A'}</div>
                    <div class="stat-label">Total Amount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${reportData.activeMembers || 0}</div>
                    <div class="stat-label">Active Members</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${reportData.period || 'N/A'}</div>
                    <div class="stat-label">Period</div>
                </div>
            </div>`;
        }

        // Branch performance table
        if (reportData.rows && Array.isArray(reportData.rows)) {
            content += `
            <div class="report-table">
                <h3>Branch Performance Summary</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Branch Name</th>
                            <th>Active Members</th>
                            <th>Total Savings</th>
                            <th>Total Disbursements</th>
                            <th>Net Position</th>
                            <th>Performance %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.rows.map(row => `
                            <tr>
                                <td>${row.branch_name || 'N/A'}</td>
                                <td>${Number(row.active_members || 0).toLocaleString('en-PH')}</td>
                                <td>₱${Number(row.total_savings || 0).toLocaleString('en-PH')}</td>
                                <td>₱${Number(row.total_disbursements || 0).toLocaleString('en-PH')}</td>
                                <td>₱${Number(row.net_position || 0).toLocaleString('en-PH')}</td>
                                <td>${Number(row.performancePct || 0).toFixed(2)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        // Render charts with Chart.js
        if (reportData.chart || reportData.charts) {
            content += this.generateChartHTML(reportData);
        }

        return content;
    }

    /**
     * Generate chart HTML with canvas elements
     * @param {Object} reportData - Report data
     * @returns {String} Chart HTML
     */
    generateChartHTML(reportData) {
        let chartHTML = '<div class="report-charts"><h3>Performance Visualizations</h3>';
        
        // Single chart (Savings/Disbursement)
        if (reportData.chart && Array.isArray(reportData.chart.labels)) {
            chartHTML += `
            <div style="margin-top: 20px; width: 100%;">
                <canvas id="reportChart" style="width: 100%; height: 400px;"></canvas>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const ctx = document.getElementById('reportChart').getContext('2d');
                    new Chart(ctx, {
                        type: '${reportData.chartType || 'bar'}',
                        data: ${JSON.stringify(reportData.chart)},
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });
                });
            </script>`;
        }
        
        // Multiple charts (Branch Performance)
        if (reportData.type === 'Branch Performance Report' && reportData.charts) {
            if (reportData.charts.savings) {
                chartHTML += `
                <div style="margin-top: 20px; width: 100%;">
                    <h4>Savings by Branch</h4>
                    <canvas id="branchSavingsChart" style="width: 100%; height: 400px;"></canvas>
                </div>
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        const ctx = document.getElementById('branchSavingsChart').getContext('2d');
                        new Chart(ctx, {
                            type: 'bar',
                            data: ${JSON.stringify(reportData.charts.savings)},
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: { y: { beginAtZero: true } }
                            }
                        });
                    });
                </script>`;
            }
            
            if (reportData.charts.disbursement) {
                chartHTML += `
                <div style="margin-top: 30px; width: 100%;">
                    <h4>Disbursements by Branch</h4>
                    <canvas id="branchDisbChart" style="width: 100%; height: 400px;"></canvas>
                </div>
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        const ctx = document.getElementById('branchDisbChart').getContext('2d');
                        new Chart(ctx, {
                            type: 'bar',
                            data: ${JSON.stringify(reportData.charts.disbursement)},
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: { y: { beginAtZero: true } }
                            }
                        });
                    });
                </script>`;
            }
        }
        
        chartHTML += '</div>';
        return chartHTML;
    }

    /**
     * Generate AI recommendations HTML
     * @param {Object} aiRecommendations - AI recommendations
     * @returns {String} HTML content
     */
    generateAIRecommendationsHTML(aiRecommendations) {
        if (!aiRecommendations) return '';

        return `
        <div class="ai-recommendations-section">
            <div class="ai-header">
                <h2><i class="fas fa-brain"></i> AI-Powered Prescriptive Recommendations</h2>
                <span class="beta-badge">BETA</span>
            </div>
            
            <div class="strategic-recommendations">
                <h3>Strategic Insights</h3>
                <div class="recommendation-content">
                    <p>${aiRecommendations.strategic || 'No strategic recommendations available.'}</p>
                </div>
            </div>
            
            ${aiRecommendations.branchLevel && aiRecommendations.branchLevel.length > 0 ? `
            <div class="branch-recommendations">
                <h3>Branch-Level Recommendations</h3>
                <div class="recommendations-list">
                    ${aiRecommendations.branchLevel.map(rec => `
                        <div class="recommendation-item priority-${rec.priority?.toLowerCase() || 'medium'}">
                            <div class="recommendation-header">
                                <h4>${rec.branchName || 'Unknown Branch'}</h4>
                                <span class="priority-badge">${rec.priority || 'Medium'} Priority</span>
                            </div>
                            <div class="recommendation-details">
                                <ul>
                                    ${(rec.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
                                </ul>
                                ${rec.rationale ? `<p class="rationale"><strong>Rationale:</strong> ${rec.rationale}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${aiRecommendations.keyInsights && aiRecommendations.keyInsights.length > 0 ? `
            <div class="key-insights">
                <h3>Key Insights</h3>
                <ul>
                    ${aiRecommendations.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${aiRecommendations.nextSteps && aiRecommendations.nextSteps.length > 0 ? `
            <div class="next-steps">
                <h3>Recommended Next Steps</h3>
                <ol>
                    ${aiRecommendations.nextSteps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            ` : ''}
        </div>`;
    }

    /**
     * Get PDF styles
     * @returns {String} CSS styles
     */
    getPDFStyles() {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .report-container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
        }
        
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #007542;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
        }
        
        .header-text h1 {
            color: #007542;
            font-size: 24px;
            font-weight: bold;
        }
        
        .header-text p {
            color: #666;
            font-size: 14px;
        }
        
        .header-right {
            text-align: right;
        }
        
        .report-info h2 {
            color: #007542;
            font-size: 20px;
            margin-bottom: 5px;
        }
        
        .report-info p {
            color: #666;
            font-size: 12px;
            margin: 2px 0;
        }
        
        .report-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        
        .stat-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            flex: 1;
            min-width: 150px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #007542;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        
        .report-table {
            margin-bottom: 30px;
        }
        
        .report-table h3 {
            color: #007542;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #007542;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .ai-recommendations-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
        }
        
        .ai-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .ai-header h2 {
            font-size: 22px;
            margin: 0;
        }
        
        .beta-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .strategic-recommendations,
        .branch-recommendations,
        .key-insights,
        .next-steps {
            margin-bottom: 25px;
        }
        
        .strategic-recommendations h3,
        .branch-recommendations h3,
        .key-insights h3,
        .next-steps h3 {
            font-size: 18px;
            margin-bottom: 15px;
            color: white;
        }
        
        .recommendation-content p {
            font-size: 16px;
            line-height: 1.6;
        }
        
        .recommendation-item {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
        }
        
        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .recommendation-header h4 {
            font-size: 16px;
            margin: 0;
        }
        
        .priority-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .priority-high {
            border-left: 4px solid #ff6b6b;
        }
        
        .priority-medium {
            border-left: 4px solid #ffd93d;
        }
        
        .priority-low {
            border-left: 4px solid #6bcf7f;
        }
        
        .recommendation-details ul {
            margin-left: 20px;
            margin-bottom: 10px;
        }
        
        .recommendation-details li {
            margin-bottom: 5px;
        }
        
        .rationale {
            font-style: italic;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .key-insights ul,
        .next-steps ol {
            margin-left: 20px;
        }
        
        .key-insights li,
        .next-steps li {
            margin-bottom: 8px;
        }
        
        .report-footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
        }
        
        .report-footer p {
            margin: 5px 0;
        }
        
        .chart-placeholder {
            background: #f8f9fa;
            border: 2px dashed #ddd;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #666;
        }
        
        @media print {
            .report-container {
                padding: 0;
            }
            
            .ai-recommendations-section {
                break-inside: avoid;
            }
            
            .recommendation-item {
                break-inside: avoid;
            }
        }
        `;
    }

    /**
     * Get header template for PDF
     * @returns {String} Header template
     */
    getHeaderTemplate() {
        return `
        <div style="font-size: 10px; padding: 0 15mm; width: 100%; text-align: center; color: #666;">
            <span>IMVCMPC Financial Management System</span>
        </div>`;
    }

    /**
     * Get footer template for PDF
     * @returns {String} Footer template
     */
    getFooterTemplate() {
        return `
        <div style="font-size: 10px; padding: 0 15mm; width: 100%; text-align: center; color: #666;">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`;
    }

    /**
     * Get logo as base64 (placeholder)
     * @returns {String} Base64 encoded logo
     */
    getLogoBase64() {
        // This would be replaced with actual logo base64 data
        return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }

    /**
     * Inject PDF enhancements
     * @param {Object} page - Puppeteer page
     */
    async injectPDFEnhancements(page) {
        await page.addStyleTag({
            content: `
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                }
            `
        });
    }

    /**
     * Wait for charts to render
     * @param {Object} page - Puppeteer page
     */
    async waitForCharts(page) {
        try {
            // Wait for Chart.js to be loaded
            await page.waitForFunction(() => {
                return typeof window.Chart !== 'undefined';
            }, { timeout: 10000 });
            
            // Wait for canvas elements to be rendered
            await page.waitForSelector('canvas', { timeout: 5000 });
            
            // Wait for Chart.js to initialize and render charts
            await page.waitForFunction(() => {
                const canvases = document.querySelectorAll('canvas');
                return canvases.length > 0;
            }, { timeout: 10000 });
            
            // Additional wait for chart animations to complete
            await page.waitForTimeout(3000);
        } catch (error) {
            // Charts might not be present, continue
            console.log('No charts detected or timeout waiting for charts');
        }
    }

    /**
     * Ensure temp directory exists
     */
    async ensureTempDirectory() {
        try {
            await fs.access(this.config.tempDir);
        } catch (error) {
            await fs.mkdir(this.config.tempDir, { recursive: true });
        }
    }

    /**
     * Close browser instance
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = PDFService;