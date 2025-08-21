// Reports System for Marketing Clerk
document.addEventListener('DOMContentLoaded', function() {
    initializeReports();
});

// Initialize reports system
function initializeReports() {
    setupReportTypeSelector();
    setupBranchSelection();
    setupTransactionTypeButtons();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 1000);
}

// Setup report type selector
function setupReportTypeSelector() {
    const reportTypeBtns = document.querySelectorAll('.report-type-btn');
    
    reportTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            reportTypeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding configuration section
            showConfigurationSection(this.getAttribute('data-type'));
            
            // Clear report canvas
            clearReportCanvas();
            
            // Hide export section
            hideExportSection();
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
    const exportSection = document.getElementById('exportSection');
    
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
        
        // Insert before export section
        exportSection.parentNode.insertBefore(generateSection, exportSection);
        exportSection.parentNode.insertBefore(reportCanvas, exportSection);
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

// Setup branch selection functionality
function setupBranchSelection() {
    // Setup individual branch checkboxes
    const branchCheckboxes = document.querySelectorAll('.branch-checkbox input[type="checkbox"]');
    branchCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            handleIndividualBranchSelection(this.closest('.config-section').id.replace('Config', ''));
        });
    });
}

// Handle individual branch selection
function handleIndividualBranchSelection(reportType) {
    // Individual branch selection logic can be added here if needed
    console.log('Branch selection changed for:', reportType);
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
    const activeReportType = document.querySelector('.report-type-btn.active');
    if (!activeReportType) {
        showMessage('Please select a report type first.', 'error');
        return;
    }
    
    const reportType = activeReportType.getAttribute('data-type');
    
    // Validate configuration
    if (!validateConfiguration(reportType)) {
        return;
    }
    
    // Generate report data
    const reportData = generateReportData(reportType);
    
    // Display report
    displayReport(reportData);
    
    // Show export section
    showExportSection();
    
    showMessage('Report generated successfully!', 'success');
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
    const configSection = document.getElementById(reportType + 'Config');
    const selectedBranches = configSection.querySelectorAll('.branch-checkbox input[type="checkbox"]:checked');
    
    if (selectedBranches.length === 0) {
        showMessage('Please select at least one branch.', 'error');
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
    
    const activeTypeBtn = document.querySelector('#memberConfig .type-btn.active');
    if (!activeTypeBtn) {
        showMessage('Please select a transaction type.', 'error');
        return false;
    }
    
    return true;
}

// Validate branch configuration
function validateBranchConfig() {
    const selectedBranch = document.querySelector('input[name="branchSelection"]:checked');
    if (!selectedBranch) {
        showMessage('Please select a branch.', 'error');
        return false;
    }
    
    const activeTypeBtns = document.querySelectorAll('#branchConfig .type-btn.active');
    if (activeTypeBtns.length !== 2) {
        showMessage('Please select both Savings and Disbursement transaction types.', 'error');
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
    const configSection = document.getElementById('savingsConfig');
    const selectedBranches = Array.from(configSection.querySelectorAll('.branch-checkbox input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    const year = document.getElementById('savingsYear').value;
    const month = document.getElementById('savingsMonth').value;
    
    // Generate mock data based on selection
    const data = generateMockSavingsData(selectedBranches, year, month);
    
    return {
        type: 'Savings Report',
        branches: selectedBranches,
        period: `${month} ${year}`,
        data: data
    };
}

// Generate disbursement report data
function generateDisbursementReportData() {
    const configSection = document.getElementById('disbursementConfig');
    const selectedBranches = Array.from(configSection.querySelectorAll('.branch-checkbox input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    const year = document.getElementById('disbursementYear').value;
    const month = document.getElementById('disbursementMonth').value;
    
    // Generate mock data based on selection
    const data = generateMockDisbursementData(selectedBranches, year, month);
    
    return {
        type: 'Disbursement Report',
        branches: selectedBranches,
        period: `${month} ${year}`,
        data: data
    };
}

// Generate member report data
function generateMemberReportData() {
    const memberSearch = document.getElementById('memberSearch').value.trim();
    const activeTypeBtn = document.querySelector('#memberConfig .type-btn.active');
    const transactionType = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'savings';
    
    // Generate mock data based on search and type
    const data = generateMockMemberData(memberSearch, transactionType);
    
    return {
        type: 'Member Report',
        member: memberSearch,
        transactionType: transactionType,
        data: data
    };
}

// Generate branch report data
function generateBranchReportData() {
    const selectedBranch = document.querySelector('input[name="branchSelection"]:checked').value;
    const year = document.getElementById('branchYear').value;
    const month = document.getElementById('branchMonth').value;
    
    // Generate mock data based on selection
    const data = generateMockBranchData(selectedBranch, year, month);
    
    return {
        type: 'Branch Performance Report',
        branch: selectedBranch,
        period: `${month} ${year}`,
        data: data
    };
}

// Generate mock savings data
function generateMockSavingsData(branches, year, month) {
    const branchNames = {
        'all': 'All Branches',
        'branch1': 'Branch 1 - IBAAN',
        'branch2': 'Branch 2 - BAUAN',
        'branch3': 'Branch 3 - SAN JOSE',
        'branch4': 'Branch 4 - ROSARIO',
        'branch5': 'Branch 5 - SAN JUAN',
        'branch6': 'Branch 6 - PADRE GARCIA',
        'branch7': 'Branch 7 - LIPA CITY',
        'branch8': 'Branch 8 - BATANGAS CITY',
        'branch9': 'Branch 9 - MABINI LIPA',
        'branch10': 'Branch 10 - CALAMIAS',
        'branch11': 'Branch 11 - LEMERY',
        'branch12': 'Branch 12 - MATAAS NA KAHOY'
    };
    
    const data = [];
    const count = branches.includes('all') ? 100 : branches.length * 15;
    
    for (let i = 0; i < count; i++) {
        const branch = branches.includes('all') ? 
            Object.values(branchNames).filter(name => name !== 'All Branches')[Math.floor(Math.random() * 12)] :
            branchNames[branches[Math.floor(Math.random() * branches.length)]];
        
        data.push({
            memberId: `M${String(i + 1).padStart(4, '0')}`,
            memberName: `Member ${i + 1}`,
            branch: branch,
            savings: Math.floor(Math.random() * 100000) + 10000,
            deposits: Math.floor(Math.random() * 50000) + 5000,
            date: new Date(parseInt(year), month ? parseInt(month) - 1 : Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        });
    }
    
    return data;
}

// Generate mock disbursement data
function generateMockDisbursementData(branches, year, month) {
    const branchNames = {
        'all': 'All Branches',
        'branch1': 'Branch 1 - IBAAN',
        'branch2': 'Branch 2 - BAUAN',
        'branch3': 'Branch 3 - SAN JOSE',
        'branch4': 'Branch 4 - ROSARIO',
        'branch5': 'Branch 5 - SAN JUAN',
        'branch6': 'Branch 6 - PADRE GARCIA',
        'branch7': 'Branch 7 - LIPA CITY',
        'branch8': 'Branch 8 - BATANGAS CITY',
        'branch9': 'Branch 9 - MABINI LIPA',
        'branch10': 'Branch 10 - CALAMIAS',
        'branch11': 'Branch 11 - LEMERY',
        'branch12': 'Branch 12 - MATAAS NA KAHOY'
    };
    
    const data = [];
    const count = branches.includes('all') ? 80 : branches.length * 12;
    
    for (let i = 0; i < count; i++) {
        const branch = branches.includes('all') ? 
            Object.values(branchNames).filter(name => name !== 'All Branches')[Math.floor(Math.random() * 12)] :
            branchNames[branches[Math.floor(Math.random() * branches.length)]];
        
        data.push({
            memberId: `M${String(i + 1).padStart(4, '0')}`,
            memberName: `Member ${i + 1}`,
            branch: branch,
            amount: Math.floor(Math.random() * 200000) + 25000,
            purpose: ['Business Loan', 'Personal Loan', 'Emergency Loan', 'Education Loan'][Math.floor(Math.random() * 4)],
            date: new Date(parseInt(year), month ? parseInt(month) - 1 : Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        });
    }
    
    return data;
}

// Generate mock member data
function generateMockMemberData(memberSearch, transactionType) {
    const data = [];
    const count = 25;
    
    for (let i = 0; i < count; i++) {
        data.push({
            transactionId: `T${String(i + 1).padStart(6, '0')}`,
            type: transactionType,
            amount: transactionType === 'savings' ? 
                Math.floor(Math.random() * 50000) + 5000 : 
                Math.floor(Math.random() * 150000) + 25000,
            description: transactionType === 'savings' ? 'Monthly Deposit' : 'Loan Disbursement',
            date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        });
    }
    
    return data.sort((a, b) => b.date - a.date);
}

// Generate mock branch data
function generateMockBranchData(branch, year, month) {
    const branchNames = {
        'branch1': 'Branch 1 - IBAAN',
        'branch2': 'Branch 2 - BAUAN',
        'branch3': 'Branch 3 - SAN JOSE',
        'branch4': 'Branch 4 - ROSARIO',
        'branch5': 'Branch 5 - SAN JUAN',
        'branch6': 'Branch 6 - PADRE GARCIA',
        'branch7': 'Branch 7 - LIPA CITY',
        'branch8': 'Branch 8 - BATANGAS CITY',
        'branch9': 'Branch 9 - MABINI LIPA',
        'branch10': 'Branch 10 - CALAMIAS',
        'branch11': 'Branch 11 - LEMERY',
        'branch12': 'Branch 12 - MATAAS NA KAHOY'
    };
    
    return {
        branchName: branchNames[branch],
        members: Math.floor(Math.random() * 200) + 50,
        savings: Math.floor(Math.random() * 5000000) + 1000000,
        disbursements: Math.floor(Math.random() * 3000000) + 500000,
        performance: Math.floor(Math.random() * 40) + 60
    };
}

// Display report in canvas
function displayReport(reportData) {
    const reportCanvas = document.getElementById('reportCanvas');
    if (!reportCanvas) return;
    
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
    }
    
    reportCanvas.innerHTML = html;
}

// Generate savings/disbursement report HTML
function generateSavingsDisbursementHTML(reportData) {
    const isSavings = reportData.type === 'Savings Report';
    const totalAmount = reportData.data.reduce((sum, item) => sum + (isSavings ? item.savings : item.amount), 0);
    const totalMembers = reportData.data.length;
    
    let html = `
        <div class="report-content">
        <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.branches.includes('all') ? 'All' : reportData.branches.length}</div>
                    <div class="stat-label">Branches</div>
            </div>
                <div class="stat-card">
                    <div class="stat-value">${totalMembers}</div>
                    <div class="stat-label">Total Members</div>
            </div>
                <div class="stat-card">
                    <div class="stat-value">₱${totalAmount.toLocaleString()}</div>
                    <div class="stat-label">Total ${isSavings ? 'Savings' : 'Disbursements'}</div>
            </div>
                <div class="stat-card">
                    <div class="stat-value">${reportData.period}</div>
                    <div class="stat-label">Period</div>
            </div>
        </div>
    
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Member ID</th>
                            <th>Member Name</th>
                            <th>Branch</th>
                            <th>${isSavings ? 'Savings' : 'Amount'}</th>
                            <th>${isSavings ? 'Deposits' : 'Purpose'}</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    reportData.data.forEach(item => {
            html += `
                <tr>
                <td>${item.memberId}</td>
                <td>${item.memberName}</td>
                <td>${item.branch}</td>
                <td>₱${(isSavings ? item.savings : item.amount).toLocaleString()}</td>
                <td>${isSavings ? '₱' + item.deposits.toLocaleString() : item.purpose}</td>
                <td>${item.date.toLocaleDateString()}</td>
                </tr>
            `;
        });
        
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
    const totalTransactions = reportData.data.length;
    const totalAmount = reportData.data.reduce((sum, item) => sum + item.amount, 0);
    
    let html = `
        <div class="report-content">
        <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.member}</div>
                    <div class="stat-label">Member</div>
            </div>
                <div class="stat-card">
                    <div class="stat-value">${totalTransactions}</div>
                    <div class="stat-label">Total Transactions</div>
            </div>
                <div class="stat-card">
                    <div class="stat-value">₱${totalAmount.toLocaleString()}</div>
                    <div class="stat-label">Total Amount</div>
            </div>
                <div class="stat-card">
                    <div class="stat-value">${reportData.transactionType}</div>
                    <div class="stat-label">Transaction Type</div>
            </div>
        </div>
    
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Description</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    reportData.data.forEach(item => {
            html += `
                <tr>
                <td>${item.transactionId}</td>
                <td><span class="badge ${item.type}">${item.type.toUpperCase()}</span></td>
                <td>₱${item.amount.toLocaleString()}</td>
                <td>${item.description}</td>
                <td>${item.date.toLocaleDateString()}</td>
                </tr>
            `;
        });
        
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
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.branch}</div>
                    <div class="stat-label">Branch</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${reportData.data.members}</div>
                    <div class="stat-label">Total Members</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱${reportData.data.savings.toLocaleString()}</div>
                    <div class="stat-label">Total Savings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱${reportData.data.disbursements.toLocaleString()}</div>
                    <div class="stat-label">Total Disbursements</div>
                </div>
            </div>
            
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Branch Name</th>
                            <th>Members</th>
                            <th>Total Savings</th>
                            <th>Total Disbursements</th>
                            <th>Performance %</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${reportData.data.branchName}</td>
                            <td>${reportData.data.members}</td>
                            <td>₱${reportData.data.savings.toLocaleString()}</td>
                            <td>₱${reportData.data.disbursements.toLocaleString()}</td>
                            <td>${reportData.data.performance}%</td>
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

// Show export section
function showExportSection() {
    const exportSection = document.getElementById('exportSection');
    if (exportSection) {
        exportSection.style.display = 'block';
    }
}

// Hide export section
function hideExportSection() {
    const exportSection = document.getElementById('exportSection');
    if (exportSection) {
        exportSection.style.display = 'none';
    }
}

// Clear configuration based on report type
function clearConfiguration(reportType) {
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
    }
    
    // Clear report canvas and hide export section
    clearReportCanvas();
    hideExportSection();
    
    showMessage('Configuration cleared successfully!', 'success');
}

// Clear savings configuration
function clearSavingsConfig() {
    const configSection = document.getElementById('savingsConfig');
    configSection.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('savingsYear').value = '2025';
    document.getElementById('savingsMonth').value = '1';
}

// Clear disbursement configuration
function clearDisbursementConfig() {
    const configSection = document.getElementById('disbursementConfig');
    configSection.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('disbursementYear').value = '2025';
    document.getElementById('disbursementMonth').value = '1';
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

// Export to PDF
function exportToPDF() {
    showMessage('PDF export functionality will be implemented here.', 'info');
}

// Show message
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    messageDiv.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#3b82f6'};
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 4 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        messageDiv.style.transform = 'translateX(100%)';
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 4000);
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
