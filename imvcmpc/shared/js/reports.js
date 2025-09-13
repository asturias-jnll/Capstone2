// Reports System - Shared
document.addEventListener('DOMContentLoaded', function() {
    // Initialize shared utilities (includes user header)
    if (typeof SharedUtils !== 'undefined') {
        const sharedUtils = new SharedUtils();
        sharedUtils.init();
    }
    
    initializeReports();
});

// Initialize reports system
function initializeReports() {
    setupReportTypeSelector();
    setupBranchSelection();
    setupTransactionTypeButtons();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 1000);
    
    // Initialize branch-specific reports
    initializeBranchSpecificReports();
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
    // Update branch selection to show only current branch
    updateBranchSelectionForBranch(branchId, branchName);
}

// Hide branch selection for branch-specific users
function hideBranchSelection() {
    // Hide the main branch selection section
    const branchSelection = document.querySelector('.branch-selection');
    if (branchSelection) {
        branchSelection.style.display = 'none';
    }
    
    // Hide branch checkboxes in all configuration sections
    const branchCheckboxes = document.querySelectorAll('.branch-checkbox');
    branchCheckboxes.forEach(checkbox => {
        checkbox.style.display = 'none';
    });
    
    // Hide branch-related labels and text in config sections
    const branchLabels = document.querySelectorAll('.config-section .branch-label, .config-section .branch-text');
    branchLabels.forEach(label => {
        label.style.display = 'none';
    });
    
    // Hide the "Select Branches" label text
    const branchSelectionLabels = document.querySelectorAll('.branch-selection label');
    branchSelectionLabels.forEach(label => {
        label.style.display = 'none';
    });
}

// Hide branch reports option for non-main branch users
function hideBranchReportsOption() {
    // Hide the branch reports button
    const branchReportsBtn = document.querySelector('.report-type-btn[data-type="branch"]');
    if (branchReportsBtn) {
        branchReportsBtn.style.display = 'none';
    }
}

// Update branch selection for specific branch
function updateBranchSelectionForBranch(branchId, branchName) {
    const branchGrid = document.querySelector('.branch-grid');
    if (branchGrid) {
        branchGrid.innerHTML = `
            <div class="branch-checkbox">
                <input type="checkbox" id="branch${branchId}" value="${branchId}" checked disabled>
                <label class="checkmark" for="branch${branchId}">
                    <div class="branch-name">${branchName}</div>
                    <div class="branch-location">Branch ${branchId}</div>
                </label>
            </div>
        `;
    }
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
    
    // Check if user is non-main branch user
    const userBranchId = localStorage.getItem('user_branch_id');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // For non-main branch users, skip branch selection validation
    if (!isMainBranchUser && userBranchId) {
        return true;
    }
    
    // For main branch users, require branch selection
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
    
    // For non-main branch users, use their branch ID if no branches are selected
    let branchesToUse = selectedBranches;
    if (selectedBranches.length === 0) {
        const userBranchId = localStorage.getItem('user_branch_id');
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        if (!isMainBranchUser && userBranchId) {
            branchesToUse = [userBranchId];
        }
    }
    
    // Generate mock data based on selection
    const data = generateMockSavingsData(branchesToUse, year, month);
    
    return {
        type: 'Savings Report',
        branches: branchesToUse,
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
    
    // For non-main branch users, use their branch ID if no branches are selected
    let branchesToUse = selectedBranches;
    if (selectedBranches.length === 0) {
        const userBranchId = localStorage.getItem('user_branch_id');
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        if (!isMainBranchUser && userBranchId) {
            branchesToUse = [userBranchId];
        }
    }
    
    // Generate mock data based on selection
    const data = generateMockDisbursementData(branchesToUse, year, month);
    
    return {
        type: 'Disbursement Report',
        branches: branchesToUse,
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
    const data = generateBranchData(selectedBranch, year, month);
    
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
        'branch12': 'Branch 12 - MATAAS NA KAHOY',
        'branch13': 'Branch 13 - TANAUAN'
    };
    
    // Check if user is branch-specific
    const userBranchId = localStorage.getItem('user_branch_id');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    let data = [];
    
    if (!isMainBranchUser && userBranchId) {
        // Branch-specific user: generate 1 entry for their branch
        const userBranchName = `Branch ${userBranchId}`;
        const userBranchLocation = getBranchLocation(userBranchId);
        const branchFullName = `${userBranchName} - ${userBranchLocation}`;
        
        // Generate 1 entry for the user's branch
        data.push({
            branch: branchFullName,
            totalSavings: Math.floor(Math.random() * 500000) + 200000, // 200k-700k
            deposits: Math.floor(Math.random() * 100000) + 50000, // 50k-150k
            month: parseInt(month),
            year: parseInt(year)
        });
    } else {
        // Main branch user: generate 1 entry for each selected branch
        branches.forEach(branchId => {
            const branchName = branchNames[branchId];
            if (branchName) {
                // Generate 1 entry per branch
                data.push({
                    branch: branchName,
                    totalSavings: Math.floor(Math.random() * 500000) + 200000, // 200k-700k
                    deposits: Math.floor(Math.random() * 100000) + 50000, // 50k-150k
                    month: parseInt(month),
                    year: parseInt(year)
                });
            }
        });
    }
    
    return data;
}

// Generate mock disbursement data
function generateMockDisbursementData(branches, year, month) {
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
        'branch12': 'Branch 12 - MATAAS NA KAHOY',
        'branch13': 'Branch 13 - TANAUAN'
    };
    
    // Check if user is branch-specific
    const userBranchId = localStorage.getItem('user_branch_id');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    let data = [];
    
    if (!isMainBranchUser && userBranchId) {
        // Branch-specific user: generate 1 entry for their branch
        const userBranchName = `Branch ${userBranchId}`;
        const userBranchLocation = getBranchLocation(userBranchId);
        const branchFullName = `${userBranchName} - ${userBranchLocation}`;
        
        // Generate 1 entry for the user's branch
        data.push({
            branch: branchFullName,
            totalDisbursements: Math.floor(Math.random() * 800000) + 300000, // 300k-1.1M
            totalMembers: Math.floor(Math.random() * 50) + 20, // 20-70 members
            month: parseInt(month),
            year: parseInt(year)
        });
    } else {
        // Main branch user: generate 1 entry for each selected branch
        branches.forEach(branchId => {
            const branchName = branchNames[branchId];
            if (branchName) {
                // Generate 1 entry per branch
                data.push({
                    branch: branchName,
                    totalDisbursements: Math.floor(Math.random() * 800000) + 300000, // 300k-1.1M
                    totalMembers: Math.floor(Math.random() * 50) + 20, // 20-70 members
                    month: parseInt(month),
                    year: parseInt(year)
                });
            }
        });
    }
    
    return data;
}

// Generate mock member data
function generateMockMemberData(memberSearch, transactionType) {
    // Check if user is branch-specific
    const userBranchId = localStorage.getItem('user_branch_id');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    const data = [];
    let count = 25;
    
    if (!isMainBranchUser && userBranchId) {
        // Branch-specific user: generate data only for their branch
        count = Math.floor(Math.random() * 15) + 10; // 10-25 transactions for branch
        
        for (let i = 0; i < count; i++) {
            data.push({
                transactionId: `T${userBranchId}${String(i + 1).padStart(4, '0')}`,
                type: transactionType,
                amount: transactionType === 'savings' ? 
                    generateBranchSpecificSavings(userBranchId) : 
                    generateBranchSpecificDisbursement(userBranchId),
                description: transactionType === 'savings' ? 'Monthly Deposit' : 'Loan Disbursement',
                date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            });
        }
    } else {
        // Main branch user: generate general data
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
        'branch12': 'Branch 12 - MATAAS NA KAHOY',
        'branch13': 'Branch 13 - TANAUAN'
    };
    
    return {
        branchName: branchNames[branch],
        members: Math.floor(Math.random() * 200) + 50,
        savings: Math.floor(Math.random() * 5000000) + 1000000,
        disbursements: Math.floor(Math.random() * 3000000) + 500000,
        performance: Math.floor(Math.random() * 40) + 60
    };
}

// Generate branch-specific data
function generateBranchData(branch, year, month) {
    // Check if user is branch-specific
    const userBranchId = localStorage.getItem('user_branch_id');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    if (!isMainBranchUser && userBranchId) {
        // Branch-specific user: generate data only for their branch
        return generateBranchSpecificData(userBranchId);
    } else {
        // Main branch user: generate data for selected branch
        return generateMockBranchData(branch, year, month);
    }
}

// Generate branch-specific data
function generateBranchSpecificData(branchId) {
    const branchLocation = getBranchLocation(branchId);
    const baseAmounts = {
        2: { savings: 1160000, disbursements: 1050000, members: 180 }, // Bauan
        3: { savings: 1250000, disbursements: 1150000, members: 200 }, // San Jose
        4: { savings: 980000, disbursements: 880000, members: 150 },   // Rosario
        5: { savings: 870000, disbursements: 780000, members: 130 },   // San Juan
        6: { savings: 920000, disbursements: 820000, members: 160 },   // Taysan
        7: { savings: 850000, disbursements: 750000, members: 140 },   // Lobo
        8: { savings: 950000, disbursements: 850000, members: 170 },   // Calaca
        9: { savings: 780000, disbursements: 680000, members: 120 },   // Lemery
        10: { savings: 820000, disbursements: 720000, members: 145 },  // Agoncillo
        11: { savings: 880000, disbursements: 780000, members: 155 },  // San Nicolas
        12: { savings: 900000, disbursements: 800000, members: 165 }   // Taal
    };
    
    const baseData = baseAmounts[branchId] || { savings: 1000000, disbursements: 900000, members: 150 };
    
    // Add realistic variations
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    const savings = Math.round(baseData.savings * (1 + variation));
    const disbursements = Math.round(baseData.disbursements * (1 + variation));
    const members = Math.round(baseData.members * (1 + variation));
    const performance = Math.floor(Math.random() * 20) + 70; // 70-90% performance
    
    return {
        branchName: `Branch ${branchId} - ${branchLocation}`,
        members: members,
        savings: savings,
        disbursements: disbursements,
        performance: performance
    };
}

// Helper functions for branch-specific data generation
function getBranchLocation(branchId) {
    const locations = {
        2: 'BAUAN',
        3: 'SAN JOSE',
        4: 'ROSARIO',
        5: 'SAN JUAN',
        6: 'PADRE GARCIA',
        7: 'LIPA CITY',
        8: 'BATANGAS CITY',
        9: 'MABINI LIPA',
        10: 'CALAMIAS',
        11: 'LEMERY',
        12: 'MATAAS NA KAHOY',
        13: 'TANAUAN'
    };
    return locations[branchId] || 'UNKNOWN';
}

function generateBranchSpecificName(branchId, index) {
    const branchNames = {
        2: ['Maria Santos', 'Juan Dela Cruz', 'Ana Reyes', 'Pedro Mendoza', 'Carmen Garcia', 'Roberto Torres', 'Luz Villanueva', 'Miguel Lopez', 'Isabela Cruz', 'Antonio Santos'],
        3: ['Jose Rizal', 'Gabriela Silang', 'Andres Bonifacio', 'Melchora Aquino', 'Lapu-Lapu', 'Tandang Sora', 'Gregorio Del Pilar', 'Mariano Gomez', 'Jacinta Zamora', 'Jose Burgos'],
        4: ['Isabela Basa', 'Mariano Ponce', 'Marcelo Del Pilar', 'Graciano Lopez', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban', 'Rafael Palma', 'Teodoro Kalaw', 'Tomas Mapua'],
        5: ['Emilio Aguinaldo', 'Apolinario Mabini', 'Miguel Malvar', 'Artemio Ricarte', 'Macario Sakay', 'Gregoria De Jesus', 'Marina Dizon', 'Paciano Rizal', 'Trinidad Rizal', 'Josefa Rizal'],
        6: ['Santiago Alvarez', 'Mariano Alvarez', 'Pio Valenzuela', 'Jose Dizon', 'Josefa Llanes', 'Gregoria De Jesus', 'Marina Dizon', 'Candido Tirona', 'Vicente Lim', 'Jose Abad Santos'],
        7: ['Emilio Jacinto', 'Andres Bonifacio', 'Gregoria De Jesus', 'Procopio Bonifacio', 'Procorpio Bonifacio', 'Maximino Bonifacio', 'Espiridiona Bonifacio', 'Santiago Bonifacio', 'Troadio Bonifacio', 'Ciriaco Bonifacio'],
        8: ['Jose Rizal', 'Marcelo Del Pilar', 'Graciano Lopez', 'Mariano Ponce', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban', 'Rafael Palma', 'Teodoro Kalaw', 'Tomas Mapua'],
        9: ['Emilio Aguinaldo', 'Apolinario Mabini', 'Miguel Malvar', 'Artemio Ricarte', 'Macario Sakay', 'Gregoria De Jesus', 'Marina Dizon', 'Paciano Rizal', 'Trinidad Rizal', 'Josefa Rizal'],
        10: ['Santiago Alvarez', 'Mariano Alvarez', 'Pio Valenzuela', 'Jose Dizon', 'Josefa Llanes', 'Gregoria De Jesus', 'Marina Dizon', 'Candido Tirona', 'Vicente Lim', 'Jose Abad Santos'],
        11: ['Emilio Jacinto', 'Andres Bonifacio', 'Gregoria De Jesus', 'Procopio Bonifacio', 'Procorpio Bonifacio', 'Maximino Bonifacio', 'Espiridiona Bonifacio', 'Santiago Bonifacio', 'Troadio Bonifacio', 'Ciriaco Bonifacio'],
        12: ['Jose Rizal', 'Marcelo Del Pilar', 'Graciano Lopez', 'Mariano Ponce', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban', 'Rafael Palma', 'Teodoro Kalaw', 'Tomas Mapua']
    };
    
    const availableNames = branchNames[branchId] || ['Member 1', 'Member 2', 'Member 3', 'Member 4', 'Member 5'];
    return availableNames[index] || `Member ${index + 1}`;
}

function generateBranchSpecificSavings(branchId) {
    const baseAmounts = {
        2: 28000, // Bauan
        3: 42000, // San Jose
        4: 25000, // Rosario
        5: 22000, // San Juan
        6: 30000, // Taysan
        7: 28000, // Lobo
        8: 32000, // Calaca
        9: 24000, // Lemery
        10: 26000, // Agoncillo
        11: 29000, // San Nicolas
        12: 31000  // Taal
    };
    
    const baseAmount = baseAmounts[branchId] || 30000;
    const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
    return Math.round(baseAmount * (1 + variation));
}

function generateBranchSpecificDeposits(branchId) {
    const baseAmounts = {
        2: 12000, // Bauan
        3: 18000, // San Jose
        4: 10000, // Rosario
        5: 9000,  // San Juan
        6: 15000, // Taysan
        7: 14000, // Lobo
        8: 16000, // Calaca
        9: 12000, // Lemery
        10: 13000, // Agoncillo
        11: 14500, // San Nicolas
        12: 15500  // Taal
    };
    
    const baseAmount = baseAmounts[branchId] || 15000;
    const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
    return Math.round(baseAmount * (1 + variation));
}

function generateBranchSpecificDisbursement(branchId) {
    const baseAmounts = {
        2: 150000, // Bauan
        3: 180000, // San Jose
        4: 120000, // Rosario
        5: 100000, // San Juan
        6: 140000, // Taysan
        7: 130000, // Lobo
        8: 160000, // Calaca
        9: 110000, // Lemery
        10: 125000, // Agoncillo
        11: 135000, // San Nicolas
        12: 145000  // Taal
    };
    
    const baseAmount = baseAmounts[branchId] || 150000;
    const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
    return Math.round(baseAmount * (1 + variation));
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
    const totalAmount = reportData.data.reduce((sum, item) => sum + (isSavings ? item.totalSavings : item.totalDisbursements), 0);
    const totalMembers = reportData.data.reduce((sum, item) => sum + (isSavings ? 0 : item.totalMembers), 0);
    const uniqueBranches = [...new Set(reportData.data.map(item => item.branch))];
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${uniqueBranches.length}</div>
                    <div class="stat-label">Branches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${isSavings ? reportData.data.length * 30 : totalMembers}</div>
                    <div class="stat-label">Total Members</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱${totalAmount.toLocaleString()}</div>
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
                            <th>Month</th>
                            <th>Year</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    reportData.data.forEach(item => {
            html += `
                <tr>
                    <td>${item.branch}</td>
                    <td>₱${(isSavings ? (item.totalSavings + item.deposits) : item.totalDisbursements).toLocaleString()}</td>
                    <td>${getMonthName(item.month)}</td>
                    <td>${item.year}</td>
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
