// Finance Officer Reports System
document.addEventListener('DOMContentLoaded', function() {
    // Initialize shared utilities (includes user header)
    if (typeof SharedUtils !== 'undefined') {
        const sharedUtils = new SharedUtils();
        sharedUtils.init();
    }
    
    initializeFOReports();
});

// Initialize Finance Officer reports system
function initializeFOReports() {
    setupReportTypeDropdown();
    setupBranchSelection();
    setupTransactionTypeButtons();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 1000);
    
    // Initialize branch-specific reports
    initializeBranchSpecificReports();
    
    // Initialize report histories
    initializeReportHistories();
}

// Initialize branch-specific reports
function initializeBranchSpecificReports() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
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
        headerTitle.textContent = 'Financial Reports';
    }
}

// Filter reports for specific branch
function filterReportsForBranch(branchId, branchName) {
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
    // Hide the branch reports option from dropdown
    const branchOption = document.querySelector('#reportTypeDropdown option[value="branch"]');
    if (branchOption) {
        branchOption.style.display = 'none';
    }
}

// Setup report type dropdown selector
function setupReportTypeDropdown() {
    const reportTypeDropdown = document.getElementById('reportTypeDropdown');
    
    if (reportTypeDropdown) {
        reportTypeDropdown.addEventListener('change', function() {
            const selectedType = this.value;
            
            if (selectedType === '') {
                // Show initial state
                showInitialState();
                hideAllConfigurations();
                hideAllReportHistories();
                hideSendFinanceSection();
            } else {
                // Show corresponding configuration section
                showConfigurationSection(selectedType);
                
                // Show corresponding history section
                showReportHistory(selectedType);
                
                // Hide send finance section
                hideSendFinanceSection();
            }
        });
    }
}

// Show initial state
function showInitialState() {
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'flex';
    }
}

// Hide all configuration sections
function hideAllConfigurations() {
    const configSections = document.querySelectorAll('.config-section');
    configSections.forEach(section => {
        section.classList.remove('active');
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
    hideAllConfigurations();
    
    // Show selected configuration section
    const selectedSection = document.getElementById(reportType + 'Config');
    if (selectedSection) {
        selectedSection.classList.add('active');

        // Add request button after the configuration
        addReportCanvas();
    }
}

// Add request button (no canvas)
function addReportCanvas() {
    const reportConfig = document.querySelector('.report-config');
    const existing = document.querySelector('.generate-section');
    if (!existing) {
        // Create request section
        const requestSection = document.createElement('div');
        requestSection.className = 'generate-section';
        requestSection.innerHTML = `
            <button class="generate-btn" onclick="requestReport()">
                <i class="fas fa-paper-plane"></i>
                <span>Request Report from Marketing Clerk</span>
            </button>
        `;

        // Append after configuration block
        if (reportConfig && reportConfig.parentNode) {
            reportConfig.parentNode.insertBefore(requestSection, reportConfig.nextSibling);
        }
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
        const reportTypeDropdown = document.getElementById('reportTypeDropdown');
        if (!reportTypeDropdown || !reportTypeDropdown.value) {
            showMessage('Please select a report type first.', 'error');
            return;
        }
        
        const reportType = reportTypeDropdown.value;
        
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
// No report canvas for Finance Officer page

// Show send finance section
// No-op placeholders retained for compatibility
function showSendFinanceSection() {}
function hideSendFinanceSection() {}

// New: Request report handler
function requestReport() {
    const reportTypeDropdown = document.getElementById('reportTypeDropdown');
    if (!reportTypeDropdown || !reportTypeDropdown.value) {
        showMessage('Please select a report type first.', 'error');
        return;
    }

    const reportType = reportTypeDropdown.value;
    if (!validateConfiguration(reportType)) {
        return;
    }

    // Build request payload
    const branchId = localStorage.getItem('user_branch_id');
    const payload = {
        report_type: reportType,
        report_config: collectReportConfig(reportType),
        fo_notes: null,
        priority: 'normal',
        due_at: null
    };

    const token = localStorage.getItem('access_token');
    if (!token) {
        showMessage('You are not authenticated.', 'error');
        return;
    }

    fetch('/api/auth/report-requests', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).then(async (res) => {
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Failed to send report request');
        }
        return res.json();
    }).then(() => {
        showMessage('Report request sent to Marketing Clerk!', 'success');
    }).catch((err) => {
        console.error('Report request error:', err);
        showMessage('Failed to send report request.', 'error');
    });
}

// Collect the current configuration for selected report type
function collectReportConfig(reportType) {
    try {
        switch (reportType) {
            case 'savings':
            case 'disbursement': {
                const year = document.getElementById(reportType + 'Year')?.value;
                const month = document.getElementById(reportType + 'Month')?.value;
                return { year, month };
            }
            case 'member': {
                const member = document.getElementById('memberSearch')?.value?.trim();
                const activeBtn = document.querySelector('#memberConfig .type-btn.active');
                const transactionType = activeBtn ? activeBtn.getAttribute('data-type') : 'savings';
                return { member, transactionType };
            }
            case 'branch': {
                const selected = Array.from(document.querySelectorAll('input[name="branchSelection"]:checked')).map(cb => cb.value);
                const year = document.getElementById('branchYear')?.value;
                const month = document.getElementById('branchMonth')?.value;
                const types = Array.from(document.querySelectorAll('#branchConfig .type-btn.active')).map(b => b.getAttribute('data-type'));
                return { branches: selected, year, month, transactionTypes: types };
            }
            default:
                return {};
        }
    } catch (_) {
        return {};
    }
}

// Clear configuration based on report type
function clearConfiguration(reportType) {
    try {
        if (!reportType) {
            showMessage('Invalid report type for clearing.', 'error');
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
        
        // Clear report canvas and hide send finance section
        clearReportCanvas();
        hideSendFinanceSection();
        
        showMessage('Configuration cleared successfully!', 'success');
    } catch (error) {
        console.error('Error clearing configuration:', error);
        showMessage('An error occurred while clearing the configuration.', 'error');
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
    const reportTypeDropdown = document.getElementById('reportTypeDropdown');
    if (!reportTypeDropdown || !reportTypeDropdown.value) {
        showMessage('Please generate a report first.', 'error');
        return;
    }
    
    const reportType = reportTypeDropdown.value;
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
