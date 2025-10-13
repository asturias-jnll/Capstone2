// Reports System - Marketing Clerk (Shared Implementation)
// Global lock flag to prevent editing when prefilled from FO
window.isPrefillLocked = false;
document.addEventListener('DOMContentLoaded', function() {
    // Initialize shared utilities (includes user header)
    if (typeof SharedUtils !== 'undefined') {
        const sharedUtils = new SharedUtils();
        sharedUtils.init();
    }
    
    initializeReports();
    prefillFromReportRequest();
});

// Normalize and set a <select> value, tolerating zero-padded and numeric forms
function setSelectValueByNormalized(select, value) {
    try {
        if (!select || value == null) return;
        const options = Array.from(select.options || []);
        const valStr = String(value);

        // 1) Exact match
        if (options.some(o => o.value === valStr)) {
            select.value = valStr;
            return;
        }

        // 2) Zero-padded 2-digit
        const pad2 = valStr.padStart(2, '0');
        if (options.some(o => o.value === pad2)) {
            select.value = pad2;
            return;
        }

        // 3) Numeric compare (e.g., "1" == 1, matches option with value "1" or "01")
        const num = parseInt(valStr, 10);
        if (!Number.isNaN(num)) {
            const byNum = options.find(o => parseInt(o.value, 10) === num);
            if (byNum) {
                select.value = byNum.value;
                return;
            }
        }
    } catch (_) {}
}

// Initialize reports system
function initializeReports() {
    setupReportTypeSelector();
    setupBranchSelection();
    setupTransactionTypeButtons();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 1000);
    
    // Initialize branch-specific reports
    initializeBranchSpecificReports();
    
    // Initialize report histories
    initializeReportHistories();
}

// Prefill the UI when arriving from a report_request notification
function prefillFromReportRequest() {
    try {
        // Accept either sessionStorage or URL param as the entry point
        const urlParams = new URLSearchParams(window.location.search);
        const urlRequestId = urlParams.get('requestId');
        const raw = sessionStorage.getItem('report_request_prefill');
        let requestId = null;
        let metadata = null;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                requestId = parsed.requestId || urlRequestId;
                metadata = parsed.metadata || null;
            } catch (_) {
                requestId = urlRequestId;
            }
            sessionStorage.removeItem('report_request_prefill');
        } else {
            requestId = urlRequestId;
        }

        // If we don't have anything to prefill, stop
        if (!requestId && !metadata) return;

        // Always hydrate from API when we have a requestId; merge with any metadata
        const token = localStorage.getItem('access_token');
        const hydrate = async () => {
            const shouldFetch = !!requestId && !!token;
            if (shouldFetch) {
                try {
                    const res = await fetch(`/api/auth/report-requests/${requestId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.success && data.data) {
                        metadata = metadata || {};
                        // API is source of truth; metadata values provide fallbacks only
                        metadata.report_type = data.data.report_type || metadata.report_type;
                        metadata.config = data.data.report_config || metadata.config || {};
                        }
                    }
                } catch (_) {}
            }
        };

        // Hydrate metadata if necessary before applying
        // Note: using async IIFE to keep function signature unchanged
        (async () => {
            await hydrate();

            if (!metadata || !metadata.report_type) return;

            const reportType = metadata.report_type;

            // Activate report type UI
            const btn = document.querySelector(`.report-type-btn[data-type="${reportType}"]`);
            if (btn) btn.click();

            const cfg = metadata.config || {};
            switch (reportType) {
                case 'savings':
                case 'disbursement': {
                    const yearEl = document.getElementById(reportType + 'Year');
                    const monthEl = document.getElementById(reportType + 'Month');
                    if (yearEl && cfg.year != null) setSelectValueByNormalized(yearEl, cfg.year);
                    if (monthEl && cfg.month != null) setSelectValueByNormalized(monthEl, cfg.month);
                    break;
                }
                case 'member': {
                    if (document.getElementById('memberSearch')) document.getElementById('memberSearch').value = cfg.member || '';
                    if (cfg.transactionType) {
                        const tbtn = document.querySelector(`#memberConfig .type-btn[data-type="${cfg.transactionType}"]`);
                        if (tbtn) {
                            document.querySelectorAll('#memberConfig .type-btn').forEach(b => b.classList.remove('active'));
                            tbtn.classList.add('active');
                        }
                    }
                    break;
                }
                case 'branch': {
                    if (Array.isArray(cfg.branches)) {
                        cfg.branches.forEach(val => {
                            const cb = document.querySelector(`input[name="branchSelection"][value="${val}"]`);
                            if (cb) cb.checked = true;
                        });
                    }
                    const byEl = document.getElementById('branchYear');
                    const bmEl = document.getElementById('branchMonth');
                    if (byEl && cfg.year != null) setSelectValueByNormalized(byEl, cfg.year);
                    if (bmEl && cfg.month != null) setSelectValueByNormalized(bmEl, cfg.month);
                    if (Array.isArray(cfg.transactionTypes)) {
                        cfg.transactionTypes.forEach(t => {
                            const tbtn = document.querySelector(`#branchConfig .type-btn[data-type="${t}"]`);
                            if (tbtn) tbtn.classList.add('active');
                        });
                    }
                    break;
                }
            }

            // Lock the prefilled configuration so MC cannot change it
            lockPrefilledConfiguration(reportType);

            // Optionally mark the request as in_progress
            if (token && requestId) {
                fetch(`/api/auth/report-requests/${requestId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'in_progress' })
                }).catch(() => {});
            }
        })();
    } catch (e) {
        console.error('Prefill from report request failed:', e);
    }
}

// Initialize branch-specific reports
function initializeBranchSpecificReports() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Update reports header based on branch
    updateReportsHeader(userBranchName, isMainBranchUser);
    
    // For non-main branch users, hide branch-related options
    if (!isMainBranchUser && userBranchName) {
        // Hide branch selection for branch-specific users
        hideBranchSelection();
        
        // Hide branch reports option for non-main branch users
        hideBranchReportsOption();
        
        // Filter reports data based on user's branch
        filterReportsForBranch(userBranchId, userBranchName);
    }
}

// Update reports header based on branch
function updateReportsHeader(branchName, isMainBranch) {
    const headerTitle = document.querySelector('.reports-header h1');
    if (headerTitle) {
        // Always show "Financial Reports" regardless of branch
        headerTitle.textContent = 'Financial Reports';
    }
}

// Filter reports for specific branch
function filterReportsForBranch(branchId, branchName) {
    // For non-main branch users, we just hide the branch selection
    // The branch is already determined by their user data
    console.log(`Filtering reports for ${branchName} (Branch ${branchId})`);
}

// Hide branch selection for branch-specific users
function hideBranchSelection() {
    // Hide branch selection sections in savings and disbursement configs
    const savingsBranchSelection = document.querySelector('#savingsConfig .branch-selection');
    const disbursementBranchSelection = document.querySelector('#disbursementConfig .branch-selection');
    
    if (savingsBranchSelection) {
        savingsBranchSelection.style.display = 'none';
    }
    if (disbursementBranchSelection) {
        disbursementBranchSelection.style.display = 'none';
    }
    
    // Show branch indicators for non-main branch users
    showBranchIndicators();
}

// Show branch indicators for non-main branch users
function showBranchIndicators() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
    
    if (userBranchId && userBranchName && userBranchLocation) {
        const branchDisplayName = `${userBranchName} - ${userBranchLocation}`;
        
        // Show savings branch indicator
        const savingsIndicator = document.getElementById('savingsBranchIndicator');
        const savingsBranchName = document.getElementById('savingsBranchName');
        if (savingsIndicator && savingsBranchName) {
            savingsBranchName.textContent = branchDisplayName;
            savingsIndicator.style.display = 'flex';
        }
        
        // Show disbursement branch indicator
        const disbursementIndicator = document.getElementById('disbursementBranchIndicator');
        const disbursementBranchName = document.getElementById('disbursementBranchName');
        if (disbursementIndicator && disbursementBranchName) {
            disbursementBranchName.textContent = branchDisplayName;
            disbursementIndicator.style.display = 'flex';
        }
    }
}

// Hide branch reports option for non-main branch users
function hideBranchReportsOption() {
    // Hide the branch reports button
    const branchReportsBtn = document.querySelector('.report-type-btn[data-type="branch"]');
    if (branchReportsBtn) {
        branchReportsBtn.style.display = 'none';
    }
}


// Setup report type selector
function setupReportTypeSelector() {
    const reportTypeBtns = document.querySelectorAll('.report-type-btn');
    
    reportTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (window.isPrefillLocked) return; // prevent switching types when locked
            // Remove active class from all buttons
            reportTypeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding configuration section
            showConfigurationSection(this.getAttribute('data-type'));
            
            // Show corresponding history section
            showReportHistory(this.getAttribute('data-type'));
            
            // Clear report canvas
            clearReportCanvas();
            
            // Hide send finance section
            hideSendFinanceSection();
        });
    });
}

// Show configuration section based on report type
function showConfigurationSection(reportType) {
    // Hide initial state
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'none';
    }
    
    // Hide all configuration sections
    const configSections = document.querySelectorAll('.config-section');
    configSections.forEach(section => section.classList.remove('active'));
    
    // Don't hide all histories - let each report type show its own history
    
    // Show selected configuration section
    const selectedSection = document.getElementById(reportType + 'Config');
    if (selectedSection) {
        selectedSection.classList.add('active');
        
        // Add report canvas and generate button after the configuration
        addReportCanvas();
    }
}

// Add report canvas and generate button
function addReportCanvas() {
    const reportConfig = document.querySelector('.report-config');
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    
    // Check if report canvas already exists
    if (!document.getElementById('reportCanvas')) {
        // Create report canvas
        const reportCanvas = document.createElement('div');
        reportCanvas.className = 'report-canvas';
        reportCanvas.id = 'reportCanvas';
        reportCanvas.innerHTML = `
            <div class="canvas-placeholder">
                <i class="fas fa-chart-bar"></i>
                <h3>Report Canvas</h3>
                <p>Configure your report settings above and click "Generate Report" to display data here.</p>
            </div>
        `;
        
        // Create generate section
        const generateSection = document.createElement('div');
        generateSection.className = 'generate-section';
        generateSection.innerHTML = `
            <button class="generate-btn" onclick="generateReport()">
                <i class="fas fa-chart-line"></i>
                <span>Generate Report</span>
            </button>
        `;
        
        // Insert before send finance section
        sendFinanceSection.parentNode.insertBefore(generateSection, sendFinanceSection);
        sendFinanceSection.parentNode.insertBefore(reportCanvas, sendFinanceSection);
    }
}

// Show generate button
function showGenerateButton() {
    const generateSection = document.querySelector('.generate-section');
    if (!generateSection) {
        // Create generate section if it doesn't exist
        const reportConfig = document.querySelector('.report-config');
        const generateSectionHTML = `
            <div class="generate-section">
                <button class="generate-btn" onclick="generateReport()">
                    <i class="fas fa-chart-line"></i>
                    <span>Generate Report</span>
                </button>
            </div>
        `;
        reportConfig.insertAdjacentHTML('afterend', generateSectionHTML);
    } else {
        generateSection.style.display = 'block';
    }
}

// Setup branch selection functionality (only for main branch users)
function setupBranchSelection() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Only setup branch selection for main branch users
    if (isMainBranchUser) {
        const branchCheckboxes = document.querySelectorAll('.branch-checkbox input[type="checkbox"]');
        branchCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                console.log('Branch selection changed for main branch user');
            });
        });
    }
}

// Setup transaction type buttons
function setupTransactionTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-btn');
    
    typeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (window.isPrefillLocked) return; // prevent changing transaction types when locked
            const configSection = this.closest('.config-section');
            const configId = configSection.id;
            
            if (configId === 'branchConfig') {
                // For branch config, toggle the clicked button (both can be selected)
                this.classList.toggle('active');
            } else {
                // For other configs, only one can be selected
                const typeButtons = configSection.querySelectorAll('.type-btn');
                typeButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

// Generate report based on current configuration
function generateReport() {
    try {
        const activeReportType = document.querySelector('.report-type-btn.active');
        if (!activeReportType) {
            showMessage('Please select a report type first.', 'error');
            return;
        }
        
        const reportType = activeReportType.getAttribute('data-type');
        if (!reportType) {
            showMessage('Invalid report type selected.', 'error');
            return;
        }
        
        // Validate configuration
        if (!validateConfiguration(reportType)) {
            return;
        }
        
        // Generate report data
        const reportData = generateReportData(reportType);
        if (!reportData) {
            showMessage('Failed to generate report data.', 'error');
            return;
        }
        
        // Display report
        displayReport(reportData);
        
    // Show send to finance section
    showSendFinanceSection();
    
    showMessage('Report generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating report:', error);
        showMessage('An error occurred while generating the report.', 'error');
    }
}

// Validate configuration based on report type
function validateConfiguration(reportType) {
    switch (reportType) {
        case 'savings':
        case 'disbursement':
            return validateSavingsDisbursementConfig(reportType);
        case 'member':
            return validateMemberConfig();
        case 'branch':
            return validateBranchConfig();
        default:
            return false;
    }
}

// Validate savings/disbursement configuration
function validateSavingsDisbursementConfig(reportType) {
    // Check if form elements exist
    const yearElement = document.getElementById(reportType + 'Year');
    const monthElement = document.getElementById(reportType + 'Month');
    
    if (!yearElement || !monthElement) {
        showMessage('Report configuration form not found.', 'error');
        return false;
    }
    
    return true;
}

// Validate member configuration
function validateMemberConfig() {
    const memberSearch = document.getElementById('memberSearch').value.trim();
    if (!memberSearch) {
        showMessage('Please enter a member name or ID.', 'error');
        return false;
    }
    
    // Validate year and month
    const yearElement = document.getElementById('memberYear');
    const monthElement = document.getElementById('memberMonth');
    
    if (!yearElement || !monthElement) {
        showMessage('Report configuration form not found.', 'error');
        return false;
    }
    
    // Transaction type is always both (no validation needed)
    return true;
}

// Validate branch configuration
function validateBranchConfig() {
    const selectedBranches = Array.from(document.querySelectorAll('input[name="branchSelection"]:checked'));
    if (selectedBranches.length === 0) {
        showMessage('Please select at least one branch.', 'error');
        return false;
    }
    
    const activeTypeBtns = document.querySelectorAll('#branchConfig .type-btn.active');
    if (activeTypeBtns.length === 0) {
        showMessage('Please select at least one transaction type (Savings or Disbursement).', 'error');
        return false;
    }
    
    return true;
}

// Generate report data based on type
function generateReportData(reportType) {
    switch (reportType) {
        case 'savings':
            return generateSavingsReportData();
        case 'disbursement':
            return generateDisbursementReportData();
        case 'member':
            return generateMemberReportData();
        case 'branch':
            return generateBranchReportData();
        default:
            return null;
    }
}

// Generate savings report data
function generateSavingsReportData() {
    const yearElement = document.getElementById('savingsYear');
    const monthElement = document.getElementById('savingsMonth');
    
    if (!yearElement || !monthElement) {
        console.error('Savings report form elements not found');
        return {
            type: 'Savings Report',
            period: 'Unknown',
            data: []
        };
    }
    
    const year = yearElement.value || '2025';
    const month = monthElement.value || '1';
    
    return {
        type: 'Savings Report',
        period: `${month} ${year}`,
        data: []
    };
}

// Generate disbursement report data
function generateDisbursementReportData() {
    const yearElement = document.getElementById('disbursementYear');
    const monthElement = document.getElementById('disbursementMonth');
    
    if (!yearElement || !monthElement) {
        console.error('Disbursement report form elements not found');
        return {
            type: 'Disbursement Report',
            period: 'Unknown',
            data: []
        };
    }
    
    const year = yearElement.value || '2025';
    const month = monthElement.value || '1';
    
    return {
        type: 'Disbursement Report',
        period: `${month} ${year}`,
        data: []
    };
}

// Generate member report data
function generateMemberReportData() {
    const memberSearch = document.getElementById('memberSearch').value.trim();
    const activeTypeBtn = document.querySelector('#memberConfig .type-btn.active');
    const transactionType = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'savings';
    
    return {
        type: 'Member Report',
        member: memberSearch,
        transactionType: transactionType,
        data: []
    };
}

// Generate branch report data
function generateBranchReportData() {
    const selectedBranches = Array.from(document.querySelectorAll('input[name="branchSelection"]:checked')).map(cb => cb.value);
    const year = document.getElementById('branchYear').value;
    const month = document.getElementById('branchMonth').value;
    
    return {
        type: 'Branch Performance Report',
        branches: selectedBranches,
        period: `${month} ${year}`,
        data: {}
    };
}




// Display report in canvas
function displayReport(reportData) {
    try {
        if (!reportData || !reportData.type) {
            console.error('Invalid report data provided');
            return;
        }
        
        const reportCanvas = document.getElementById('reportCanvas');
        if (!reportCanvas) {
            console.error('Report canvas element not found');
            return;
        }
        
        let html = '';
        
        switch (reportData.type) {
            case 'Savings Report':
            case 'Disbursement Report':
                html = generateSavingsDisbursementHTML(reportData);
                break;
            case 'Member Report':
                html = generateMemberReportHTML(reportData);
                break;
            case 'Branch Performance Report':
                html = generateBranchReportHTML(reportData);
                break;
            default:
                console.error('Unknown report type:', reportData.type);
                html = '<div class="error-message">Unknown report type</div>';
        }
        
        if (html) {
            reportCanvas.innerHTML = html;
        }
    } catch (error) {
        console.error('Error displaying report:', error);
        const reportCanvas = document.getElementById('reportCanvas');
        if (reportCanvas) {
            reportCanvas.innerHTML = '<div class="error-message">Error displaying report</div>';
        }
    }
}

// Generate savings/disbursement report HTML
function generateSavingsDisbursementHTML(reportData) {
    const isSavings = reportData.type === 'Savings Report';
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Branches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getMonthName(reportData.period.split(' ')[0])}</div>
                    <div class="stat-label">Month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱0</div>
                    <div class="stat-label">Total ${isSavings ? 'Savings' : 'Disbursements'}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentDate}</div>
                    <div class="stat-label">Generated</div>
                </div>
            </div>
    
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Branch</th>
                            <th>${isSavings ? 'Total Savings Deposits' : 'Total Disbursements'}</th>
                            <th>Total Members</th>
                            <th>Year</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    // Show empty data since no database is connected
    html += `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No data available - Database not connected
                    </td>
                </tr>
            `;
        
        html += `
                    </tbody>
                </table>
            </div>
        </div>
        `;
    
    return html;
}

// Generate member report HTML
function generateMemberReportHTML(reportData) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.member}</div>
                    <div class="stat-label">Member</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Total Transactions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱0</div>
                    <div class="stat-label">Total Amount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${reportData.transactionType}</div>
                    <div class="stat-label">Transaction Type</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentDate}</div>
                    <div class="stat-label">Generated</div>
                </div>
            </div>
    
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    // Show empty data since no database is connected
    html += `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No data available - Database not connected
                    </td>
                </tr>
            `;
        
        html += `
                    </tbody>
                </table>
            </div>
        </div>
        `;
    
    return html;
}

// Generate branch report HTML
function generateBranchReportHTML(reportData) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const month = reportData.period.split(' ')[0];
    const year = reportData.period.split(' ')[1];
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.branch}</div>
                    <div class="stat-label">Branch</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getMonthName(month)}</div>
                    <div class="stat-label">Month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${year}</div>
                    <div class="stat-label">Year</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentDate}</div>
                    <div class="stat-label">Generated Date</div>
                </div>
            </div>
            
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Branch Name</th>
                            <th>Total Members</th>
                            <th>Total Savings</th>
                            <th>Total Disbursements</th>
                            <th>Performance %</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: #9ca3af;">
                                <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                                No data available - Database not connected
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    return html;
}

// Clear report canvas
function clearReportCanvas() {
    const reportCanvas = document.getElementById('reportCanvas');
    if (reportCanvas) {
        reportCanvas.innerHTML = `
            <div class="canvas-placeholder">
                <i class="fas fa-chart-bar"></i>
                <h3>Report Canvas</h3>
                <p>Configure your report settings above and click "Generate Report" to display data here.</p>
            </div>
        `;
    }
}

// Show send finance section
function showSendFinanceSection() {
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    if (sendFinanceSection) {
        sendFinanceSection.style.display = 'block';
    }
}

// Hide send finance section
function hideSendFinanceSection() {
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    if (sendFinanceSection) {
        sendFinanceSection.style.display = 'none';
    }
}

// Clear configuration based on report type
function clearConfiguration(reportType) {
    try {
        if (!reportType) {
            showMessage('Invalid report type for clearing.', 'error');
            return;
        }
        if (window.isPrefillLocked) {
            showMessage('Configuration is locked by Finance Officer.', 'warning');
            return;
        }
        
        switch (reportType) {
            case 'savings':
                clearSavingsConfig();
                break;
            case 'disbursement':
                clearDisbursementConfig();
                break;
            case 'member':
                clearMemberConfig();
                break;
            case 'branch':
                clearBranchConfig();
                break;
            default:
                showMessage('Unknown report type.', 'error');
                return;
        }
        
    // Hide send finance section
    hideSendFinanceSection();
        
        showMessage('Configuration cleared successfully!', 'success');
    } catch (error) {
        console.error('Error clearing configuration:', error);
        showMessage('An error occurred while clearing the configuration.', 'error');
    }
}

// Disable editing for prefilled configuration
function lockPrefilledConfiguration(reportType) {
    try {
        window.isPrefillLocked = true;

        // Disable report type buttons
        document.querySelectorAll('.report-type-btn').forEach(b => {
            b.disabled = true;
            b.style.opacity = '0.6';
            b.style.cursor = 'not-allowed';
        });

        // Helper to disable all buttons inside a config section
        const disableButtons = (section) => {
            if (!section) return;
            section.querySelectorAll('button').forEach(btn => {
                if (btn.classList.contains('generate-btn')) return; // keep generate active elsewhere
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
            });
        };

        // Disable clear button only for the active locked section
        const activeSection = document.getElementById(reportType + 'Config');
        if (activeSection) {
            const clearBtn = activeSection.querySelector('.clear-config-btn');
            if (clearBtn) {
                clearBtn.disabled = true;
                clearBtn.style.opacity = '0.6';
                clearBtn.style.cursor = 'not-allowed';
            }
        }

        // Disable inputs per report type
        switch (reportType) {
            case 'savings':
            case 'disbursement': {
                const yearEl = document.getElementById(reportType + 'Year');
                const monthEl = document.getElementById(reportType + 'Month');
                if (yearEl) yearEl.disabled = true;
                if (monthEl) monthEl.disabled = true;
                break;
            }
            case 'member': {
                const memberSearch = document.getElementById('memberSearch');
                const yearEl = document.getElementById('memberYear');
                const monthEl = document.getElementById('memberMonth');
                if (memberSearch) memberSearch.disabled = true;
                if (yearEl) yearEl.disabled = true;
                if (monthEl) monthEl.disabled = true;
                // Disable any type buttons within member config
                document.querySelectorAll('#memberConfig .type-btn').forEach(b => {
                    b.disabled = true;
                    b.style.opacity = '0.6';
                    b.style.cursor = 'not-allowed';
                });
                break;
            }
            case 'branch': {
                document.querySelectorAll('input[name="branchSelection"]').forEach(cb => cb.disabled = true);
                const byEl = document.getElementById('branchYear');
                const bmEl = document.getElementById('branchMonth');
                if (byEl) byEl.disabled = true;
                if (bmEl) bmEl.disabled = true;
                document.querySelectorAll('#branchConfig .type-btn').forEach(b => {
                    b.disabled = true;
                    b.style.opacity = '0.6';
                    b.style.cursor = 'not-allowed';
                });
                break;
            }
        }

        // Add a subtle note to the header
        const header = document.querySelector('.config-header h3');
        if (header && !document.getElementById('locked-note')) {
            const note = document.createElement('small');
            note.id = 'locked-note';
            note.textContent = ' (Locked by Finance Officer request)';
            note.style.color = '#6b7280';
            header.appendChild(note);
        }

        // Also dim and disable type buttons within the active section
        disableButtons(activeSection);
    } catch (_) {
        // no-op
    }
}

// Clear savings configuration
function clearSavingsConfig() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Clear branch selection for main branch users
    if (isMainBranchUser) {
        const configSection = document.getElementById('savingsConfig');
        if (configSection) {
            const checkboxes = configSection.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }
    
    // Clear year and month fields
    const yearElement = document.getElementById('savingsYear');
    const monthElement = document.getElementById('savingsMonth');
    
    if (yearElement) yearElement.value = '2025';
    if (monthElement) monthElement.value = '1';
}

// Clear disbursement configuration
function clearDisbursementConfig() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Clear branch selection for main branch users
    if (isMainBranchUser) {
        const configSection = document.getElementById('disbursementConfig');
        if (configSection) {
            const checkboxes = configSection.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }
    
    // Clear year and month fields
    const yearElement = document.getElementById('disbursementYear');
    const monthElement = document.getElementById('disbursementMonth');
    
    if (yearElement) yearElement.value = '2025';
    if (monthElement) monthElement.value = '1';
}

// Clear member configuration
function clearMemberConfig() {
    document.getElementById('memberSearch').value = '';
    document.querySelectorAll('#memberConfig .type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Clear branch configuration
function clearBranchConfig() {
    document.querySelectorAll('input[name="branchSelection"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('branchYear').value = '2025';
    document.getElementById('branchMonth').value = '1';
    document.querySelectorAll('#branchConfig .type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Send to Finance Officer
function sendToFinanceOfficer() {
    const activeReportType = document.querySelector('.report-type-btn.active');
    if (!activeReportType) {
        showMessage('Please generate a report first.', 'error');
        return;
    }
    
    const reportType = activeReportType.getAttribute('data-type');
    const reportData = generateReportData(reportType);
    
    if (!reportData) {
        showMessage('No report data available to send.', 'error');
        return;
    }
    
    // Create sent report entry
    const sentReport = createSentReportEntry(reportData);
    
    // Save to report history
    saveReportHistory(reportType, reportData);
    
    // Show report history for this report type
    showReportHistory(reportType);
    
    showMessage('Report sent to Finance Officer successfully!', 'success');
}

// Create sent report entry
function createSentReportEntry(reportData) {
    const now = new Date();
    const timestamp = now.getTime();
    
    // Generate filename
    const reportTypeName = reportData.type.replace(' Report', '');
    const branchInfo = getBranchInfoForReport(reportData);
    const dateStr = now.toISOString().split('T')[0];
    const filename = `${reportTypeName}_${branchInfo}_${dateStr}.pdf`;
    
    return {
        id: timestamp,
        reportType: reportData.type,
        branch: branchInfo,
        filename: filename,
        sentTime: now.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit' 
        }),
        sentDate: now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }),
        timestamp: timestamp
    };
}

// Get branch info for report
function getBranchInfoForReport(reportData) {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    if (isMainBranchUser) {
        if (reportData.branches && reportData.branches.length > 0) {
            if (reportData.branches.length === 1) {
                const branchId = reportData.branches[0].replace('branch', '');
                const branchLocation = getBranchLocation(branchId);
                return `Branch ${branchId} - ${branchLocation}`;
            } else {
                return `Multiple Branches (${reportData.branches.length})`;
            }
        }
        return 'All Branches';
    } else {
        const userBranchId = localStorage.getItem('user_branch_id');
        const userBranchName = localStorage.getItem('user_branch_name');
        const userBranchLocation = localStorage.getItem('user_branch_location');
        return `${userBranchName} - ${userBranchLocation}` || `Branch ${userBranchId}`;
    }
}




// Get report type display name
function getReportTypeDisplayName(reportType) {
    switch (reportType) {
        case 'savings': return 'Savings Report';
        case 'disbursement': return 'Disbursement Report';
        case 'member': return 'Member Report';
        case 'branch': return 'Branch Performance Report';
        default: return 'Report';
    }
}


// Show message
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Animate in
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 4000);
}

// Get notification icon
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// Get notification color
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#22C55E'; // Green for success
        case 'error': return '#EF4444';   // Red for error
        case 'warning': return '#F59E0B'; // Orange for warning
        case 'info': return '#3B82F6';    // Blue for info
        default: return '#3B82F6';
    }
}

// Helper function to get month name
function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || 'Unknown';
}

// Update current date and time
function updateCurrentDateTime() {
    const now = new Date();
    
    const currentDate = document.getElementById('currentDate');
    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    const currentTime = document.getElementById('currentTime');
    if (currentTime) {
        currentTime.textContent = now.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
}

// Initialize report histories
function initializeReportHistories() {
    // Load existing report histories from localStorage
    loadReportHistories();
}

// Load report histories for all report types
function loadReportHistories() {
    const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
    
    reportTypes.forEach(type => {
        const history = getReportHistory(type);
        displayReportHistory(type, history);
    });
}

// Get report history for a specific type
function getReportHistory(reportType) {
    const key = `reportHistory_${reportType}`;
    const history = localStorage.getItem(key);
    return history ? JSON.parse(history) : [];
}

// Save report history for a specific type
function saveReportHistory(reportType, reportData) {
    const key = `reportHistory_${reportType}`;
    const history = getReportHistory(reportType);
    
    const newReport = {
        id: Date.now(),
        title: generateReportTitle(reportType, reportData),
        details: generateReportDetails(reportType, reportData),
        date: new Date().toISOString(),
        status: 'sent',
        type: reportType
    };
    
    history.unshift(newReport); // Add to beginning
    
    // Keep only last 10 reports
    if (history.length > 10) {
        history.splice(10);
    }
    
    localStorage.setItem(key, JSON.stringify(history));
    displayReportHistory(reportType, history);
}

// Display report history for a specific type
function displayReportHistory(reportType, history) {
    const historySection = document.getElementById(`${reportType}ReportHistory`);
    const historyList = document.getElementById(`${reportType}HistoryList`);
    
    if (!historySection || !historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <h5>No Reports Sent</h5>
                <p>No ${reportType} reports have been sent yet.</p>
            </div>
        `;
    } else {
        historyList.innerHTML = history.map(report => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">${report.title}</div>
                    <div class="history-details">${report.details}</div>
                </div>
                <div class="history-meta">
                    <div class="history-date">${formatReportDate(report.date)}</div>
                    <div class="history-status ${report.status}">${report.status}</div>
                </div>
            </div>
        `).join('');
    }
}

// Generate report title based on type and data
function generateReportTitle(reportType, data) {
    switch (reportType) {
        case 'savings':
            return `Savings Report - ${data.month || 'All'} ${data.year || new Date().getFullYear()}`;
        case 'disbursement':
            return `Disbursement Report - ${data.month || 'All'} ${data.year || new Date().getFullYear()}`;
        case 'member':
            return `Member Report - ${data.memberName || 'All Members'}`;
        case 'branch':
            return `Branch Report - ${data.branchName || 'All Branches'}`;
        default:
            return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    }
}

// Generate report details based on type and data
function generateReportDetails(reportType, data) {
    const details = [];
    
    switch (reportType) {
        case 'savings':
        case 'disbursement':
            if (data.branches && data.branches.length > 0) {
                details.push(`${data.branches.length} branch(es) selected`);
            }
            if (data.month) {
                details.push(`Month: ${getMonthName(data.month)}`);
            }
            if (data.year) {
                details.push(`Year: ${data.year}`);
            }
            break;
        case 'member':
            if (data.transactionType) {
                details.push(`Transaction Type: ${data.transactionType}`);
            }
            if (data.memberName) {
                details.push(`Member: ${data.memberName}`);
            }
            break;
        case 'branch':
            if (data.branchName) {
                details.push(`Branch: ${data.branchName}`);
            }
            if (data.transactionTypes && data.transactionTypes.length > 0) {
                details.push(`Types: ${data.transactionTypes.join(', ')}`);
            }
            break;
    }
    
    return details.join(' • ') || 'Report generated';
}

// Format report date for display
function formatReportDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show report history for a specific type
function showReportHistory(reportType) {
    console.log('Showing report history for:', reportType);
    
    // Hide all other report histories first
    hideAllReportHistories();
    
    // Show the selected report history
    const historySection = document.getElementById(`${reportType}ReportHistory`);
    console.log('History section found:', historySection);
    
    if (historySection) {
        historySection.style.display = 'block';
        console.log('History section displayed for:', reportType);
    } else {
        console.error('History section not found for:', reportType);
    }
}

// Hide report history for a specific type
function hideReportHistory(reportType) {
    const historySection = document.getElementById(`${reportType}ReportHistory`);
    if (historySection) {
        historySection.style.display = 'none';
    }
}

// Hide all report histories
function hideAllReportHistories() {
    const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
    console.log('Hiding all report histories');
    reportTypes.forEach(type => {
        console.log('Hiding history for:', type);
        hideReportHistory(type);
    });
}
