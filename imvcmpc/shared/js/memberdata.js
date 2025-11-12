// Transaction Ledger System
document.addEventListener('DOMContentLoaded', function() {
    initializeTransactionLedger();
    initializeDynamicUserHeader();
    setupEventListeners();
    
    // Check if we need to highlight a specific request (from notification)
    checkForHighlightRequest();
});

// Initialize dynamic user header
function initializeDynamicUserHeader() {
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement && userRoleElement) {
        const userRole = localStorage.getItem('user_role') || 'User';
        const userBranch = localStorage.getItem('user_branch_name') || 'Unknown Branch';
        const isMainBranch = localStorage.getItem('is_main_branch_user') === 'true';
        
        userNameElement.textContent = userRole;
        userRoleElement.textContent = `IMVCMPC - ${userBranch}`;
        
        // Update branch status section
        const branchStatusElement = document.getElementById('branchStatus');
        const branchStatusTextElement = document.getElementById('branchStatusText');
        
        if (branchStatusElement && branchStatusTextElement) {
            if (isMainBranch) {
                branchStatusTextElement.textContent = `Main Branch - Access limited to this branch`;
                branchStatusElement.style.borderLeftColor = '#22C55E';
                branchStatusElement.style.background = '#f0fdf4';
            } else {
                branchStatusTextElement.textContent = `${userBranch} - Access limited to this branch`;
                branchStatusElement.style.borderLeftColor = '#22C55E';
                branchStatusElement.style.background = '#f0fdf4';
            }
        }
    }
}

// Transaction data from database
let transactions = [];
let currentTransactions = [];
let editingTransactionId = null;
let currentZoom = 90;
let pendingDeletionRequests = new Map(); // Track transactions with pending deletion requests
let pendingEditRequests = new Map(); // Track transactions with pending edit requests

// Initialize transaction ledger
function initializeTransactionLedger() {
    // Check user role immediately to prevent button flash
    const userRole = localStorage.getItem('user_role');
    const addTransactionBtn = document.querySelector('.add-transaction-btn');
    
    // Hide Add Transaction button for Finance Officer role immediately
    if (addTransactionBtn && userRole === 'Finance Officer') {
        addTransactionBtn.classList.add('finance-officer-hidden');
    }
    
    // Ensure DOM is ready
    setTimeout(() => {
        // Check user access and hide/show transaction controls accordingly
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        
        // Update button visibility based on role
        if (addTransactionBtn) {
            if (userRole === 'Finance Officer') {
                addTransactionBtn.classList.add('finance-officer-hidden');
                addTransactionBtn.style.display = 'none';
            } else {
                addTransactionBtn.classList.remove('finance-officer-hidden');
                addTransactionBtn.style.display = 'block';
            }
        }
        
        loadTransactionsFromDatabase();
        setDefaultDate();
        initializeScrollControls();
        setupScrollButtons(); // Setup scroll button event listeners
        // Make sure scroll functions are available
        window.scrollLeft = scrollLeft;
        window.scrollRight = scrollRight;
        
        // Load pending requests count for marketing clerks and finance officers
        const currentUserRole = localStorage.getItem('user_role');
        console.log('=== INITIALIZATION DEBUG ===');
        console.log('Current user role:', currentUserRole);
        console.log('DOM ready, checking elements...');
        
        // Check if required elements exist
        const requestCountElement = document.getElementById('requestCount');
        const pendingRequestsBtn = document.getElementById('pendingRequestsBtn');
        console.log('Request count element found:', !!requestCountElement);
        console.log('Pending requests button found:', !!pendingRequestsBtn);
        
        if (currentUserRole === 'Marketing Clerk') {
            console.log('Calling updatePendingRequestsCount for Marketing Clerk');
            updatePendingRequestsCount();
        } else if (currentUserRole === 'Finance Officer') {
            console.log('Calling updateFinanceOfficerNotifications for Finance Officer');
            updateFinanceOfficerNotifications();
        } else {
            console.log('Unknown role, not calling any notification functions');
        }
    }, 500);
}

// API Configuration
const API_BASE_URL = '/api/auth';

// Get authentication token
function getAuthToken() {
    return localStorage.getItem('access_token');
}

// Automatic login function for member data page
async function autoLogin() {
    try {
        console.log('🔄 Attempting auto-login...');
        
        // Clear any existing token to force fresh login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_branch_id');
        localStorage.removeItem('user_branch_name');
        localStorage.removeItem('is_main_branch_user');
        
        console.log('📡 Making login request to:', `${API_BASE_URL}/login`);
        
        // Try to login with the test finance officer user
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'test.ibaan',
                password: 'Test12345!'
            })
        });

        console.log('📊 Login response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Login failed:', response.status, errorText);
            throw new Error(`Login failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Login response data:', result);
        
        if (result.success && result.tokens && result.tokens.access_token) {
            // Store the token in localStorage
            localStorage.setItem('access_token', result.tokens.access_token);
            
            // Store user data
            if (result.user) {
                // Map API role to frontend role format
                const roleMapping = {
                    'finance_officer': 'Finance Officer',
                    'marketing_clerk': 'Marketing Clerk'
                };
                const frontendRole = roleMapping[result.user.role] || 'Finance Officer';
                
                localStorage.setItem('user_role', frontendRole);
                localStorage.setItem('user_branch_id', result.user.branch_id || '1');
                localStorage.setItem('user_branch_name', result.user.branch_name || 'Main Branch');
                localStorage.setItem('is_main_branch_user', result.user.is_main_branch_user ? 'true' : 'false');
            } else {
                localStorage.setItem('user_role', 'Finance Officer');
                localStorage.setItem('user_branch_id', '1');
                localStorage.setItem('user_branch_name', 'Main Branch');
                localStorage.setItem('is_main_branch_user', 'true');
            }
            
            console.log('🎉 Auto-login successful, token stored');
            console.log('👤 User info stored:', {
                role: localStorage.getItem('user_role'),
                branch: localStorage.getItem('user_branch_name'),
                isMainBranch: localStorage.getItem('is_main_branch_user')
            });
            
            return result.tokens.access_token;
        } else {
            throw new Error('Invalid login response');
        }
    } catch (error) {
        console.error('Auto-login failed:', error);
        return null;
    }
}

// Ensure authentication token is available
async function ensureAuthToken() {
    let token = getAuthToken();
    console.log('Current token:', token ? 'exists' : 'not found');
    
    if (!token) {
        console.log('No token found, attempting auto-login...');
        token = await autoLogin();
    }
    
    if (!token) {
        console.error('Authentication failed - no token available');
        throw new Error('Unable to authenticate. Please check your login credentials.');
    }
    
    console.log('Authentication successful, token available');
    return token;
}

// API Helper function
async function apiRequest(endpoint, options = {}) {
    try {
        const token = await ensureAuthToken();
        const url = `${API_BASE_URL}${endpoint}`;
        
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const config = { ...defaultOptions, ...options };
        
        const response = await fetch(url, config);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || `API request failed with status ${response.status}`);
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

// Load transactions from database
async function loadTransactionsFromDatabase() {
    try {
        console.log('🔄 Loading transactions from database...');
        
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        const userRole = localStorage.getItem('user_role');
        const userBranchId = localStorage.getItem('user_branch_id');
        const userBranchName = localStorage.getItem('user_branch_name');
        
        console.log('👤 User info:', { isMainBranchUser, userRole, userBranchId, userBranchName });
        
        // Validate that we have branch information
        if (!userBranchId) {
            throw new Error('Branch information not found. Please log in again.');
        }

        showLoadingState();
        
        // Test server connection first
        try {
            console.log('Testing server connection...');
            const healthResponse = await fetch('/health');
            if (healthResponse.ok) {
                const healthText = await healthResponse.text();
                console.log('✅ Server health check:', healthText);
            } else {
                throw new Error(`Health check failed: ${healthResponse.status}`);
            }
        } catch (healthError) {
            console.error('❌ Server health check failed:', healthError);
            throw new Error('Server is not running. Please start the server on port 3001.');
        }
        
        // Always include branch_id in the request for proper data isolation
        console.log('📡 Making API request to:', `/transactions?branch_id=${userBranchId}`);
        const response = await apiRequest(`/transactions?branch_id=${userBranchId}`);
        console.log('📊 API response:', response);
        
        if (response.success) {
            transactions = response.data || [];
            currentTransactions = [...transactions];
            console.log('Transactions loaded:', transactions.length);
            
            // Load pending deletion and edit requests for Marketing Clerks
            if (userRole === 'Marketing Clerk') {
                await loadPendingDeletionRequests(userBranchId);
                await loadPendingEditRequests(userBranchId);
            }
            
            renderTransactionTable();
            
        } else {
            throw new Error(response.message || 'Failed to load transactions');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactions = [];
        currentTransactions = [];
        renderTransactionTable();
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please ensure the server is running on port 3001.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.message.includes('403')) {
            errorMessage = 'Access denied. You do not have permission to view transactions.';
        } else if (error.message.includes('404')) {
            errorMessage = 'API endpoint not found. Please check server configuration.';
        }
        
    } finally {
        hideLoadingState();
    }
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('transactionDate');
    if (dateInput) {
        dateInput.value = today;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add validation clearing on input for transaction form
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        const formFields = transactionForm.querySelectorAll('input, select');
        formFields.forEach(field => {
            field.addEventListener('input', function() {
                // Clear error styling for this field
                this.style.borderColor = '';
                this.style.boxShadow = '';
                
                // Remove error message for this field
                const errorMessage = this.parentNode.querySelector('.field-error');
                if (errorMessage) {
                    errorMessage.remove();
                }
            });
        });
    }
    
    // View controls
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // View switching functionality can be added here
        });
    });
}

// Render transaction table
function renderTransactionTable() {
    const tbody = document.getElementById('transactionTableBody');
    
    if (currentTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="empty-transactions">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = currentTransactions.map(transaction => `
        <tr class="transaction-row" data-transaction-id="${transaction.id}">
            <td>${formatDate(transaction.transaction_date || transaction.date)}</td>
            <td>${transaction.payee}</td>
            <td>${transaction.reference || ''}</td>
            <td>${transaction.cross_reference || transaction.crossReference || ''}</td>
            <td>${transaction.check_number || transaction.checkNumber || ''}</td>
            <td>${formatAmount(transaction.cash_in_bank || transaction.cashInBank)}</td>
            <td>${formatAmount(transaction.loan_receivables || transaction.loanReceivables)}</td>
            <td>${formatAmount(transaction.savings_deposits || transaction.savingsDeposits)}</td>
            <td>${formatAmount(transaction.interest_income || transaction.interestIncome)}</td>
            <td>${formatAmount(transaction.service_charge || transaction.serviceCharge)}</td>
            <td>${formatAmount(transaction.sundries)}</td>
            <td>${transaction.particulars}</td>
            <td>${formatAmount(transaction.debit_amount || transaction.debit)}</td>
            <td>${formatAmount(transaction.credit_amount || transaction.credit)}</td>
        </tr>
    `).join('');
    
    // Add click event listeners to transaction rows
    addTransactionRowListeners();
}


// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
    });
}

// Format amount for display
function formatAmount(amount) {
    if (!amount || amount === 0) return '0.00';
    return parseFloat(amount).toFixed(2);
}

// Add click event listeners to transaction rows
function addTransactionRowListeners() {
    const rows = document.querySelectorAll('.transaction-row');
    rows.forEach(row => {
        row.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-transaction-id');
            const transaction = currentTransactions.find(t => t.id == transactionId);
            if (transaction) {
                showTransactionModal(transaction);
            }
        });
        
        // Add hover effect
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f0f8ff';
            this.style.cursor = 'pointer';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

// Show transaction modal for edit/update/delete
function showTransactionModal(transaction) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('transactionModal');
    if (!modal) {
        modal = createTransactionModal();
        document.body.appendChild(modal);
    }
    
    // Populate modal with transaction data
    populateTransactionModal(transaction);
    
    // Show modal
    modal.style.display = 'flex';
}

// Create transaction modal
function createTransactionModal() {
    const modal = document.createElement('div');
    modal.id = 'transactionModal';
    modal.className = 'modal';
    
    // Check user role to determine if edit and delete buttons should be shown
    const userRole = localStorage.getItem('user_role');
    const isFinanceOfficer = userRole === 'Finance Officer';
    
    // Create edit button HTML conditionally
    const editButtonHtml = isFinanceOfficer ? '' : `
                <button class="btn btn-warning" onclick="startEditMode()">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>`;
    
    // Create delete button HTML conditionally
    const deleteButtonHtml = isFinanceOfficer ? '' : `
                <button class="btn btn-danger" onclick="deleteTransaction()">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>`;
    
    modal.innerHTML = `
        <div class="modal-content transaction-details-modal">
            <div class="modal-header">
                <h3>Transaction Details</h3>
                <button type="button" class="close-btn" onclick="closeTransactionModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="transaction-details">
                    <div class="details-section">
                        <h4 class="section-title">Basic Information</h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <label>Date</label>
                                <span id="modalDate" class="readonly-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Payee</label>
                                <span id="modalPayee" class="readonly-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Reference</label>
                                <span id="modalReference" class="editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Cross Reference</label>
                                <span id="modalCrossReference" class="editable-field"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4 class="section-title">Transaction Details</h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <label>Check Number</label>
                                <span id="modalCheckNumber" class="editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Particulars</label>
                                <span id="modalParticulars" class="editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Debit Amount</label>
                                <span id="modalDebit" class="amount editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Credit Amount</label>
                                <span id="modalCredit" class="amount editable-field"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4 class="section-title">Account Balances</h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <label>Cash in Bank</label>
                                <span id="modalCashInBank" class="amount editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Loan Receivables</label>
                                <span id="modalLoanReceivables" class="amount editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Savings Deposits</label>
                                <span id="modalSavingsDeposits" class="amount editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Interest Income</label>
                                <span id="modalInterestIncome" class="amount editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Service Charge</label>
                                <span id="modalServiceCharge" class="amount editable-field"></span>
                            </div>
                            <div class="detail-item">
                                <label>Sundries</label>
                                <span id="modalSundries" class="amount editable-field"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" id="modalFooter">
                <button class="btn btn-secondary" onclick="closeTransactionModal()">
                    <i class="fas fa-times"></i>
                    Close
                </button>
                ${editButtonHtml}
                ${deleteButtonHtml}
            </div>
        </div>
    `;
    
    // Add modal styles - Simplified to match base modal styles
    const style = document.createElement('style');
    style.textContent = `
        
        .transaction-details-modal .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 24px 0 24px;
            border-bottom: 1px solid var(--gray-100);
            margin-bottom: 24px;
        }
        
        .transaction-details-modal .modal-header h3 {
            margin: 0;
            color: var(--dark-green);
            font-weight: 600;
            font-size: 1.25rem;
        }
        
        .transaction-details-modal .modal-body {
            padding: 0 24px;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .transaction-details {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        
        .details-section {
            background: var(--gray-50);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--gray-100);
        }
        
        .details-section .section-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--dark-green);
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--gray-200);
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .detail-item label {
            font-weight: 500;
            color: var(--gray-700);
            font-size: 14px;
            text-transform: none;
            letter-spacing: 0;
        }
        
        .detail-item span {
            color: var(--gray-800);
            font-size: 14px;
            font-weight: 500;
            padding: 8px 12px;
            background: var(--white);
            border-radius: 6px;
            border: 1px solid var(--gray-200);
            min-height: 20px;
        }
        
        .detail-item .amount {
            font-weight: 600;
            color: var(--dark-green);
            text-align: right;
        }
        
        .modal-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
            padding: 24px;
            border-top: 1px solid var(--gray-100);
            background: var(--gray-50);
        }
        
        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-secondary {
            background: var(--white);
            color: var(--gray-600);
            border: 1px solid var(--gray-300);
        }
        
        .btn-warning {
            background: var(--dark-green);
            color: var(--white);
        }
        
        .btn-danger {
            background: var(--red);
            color: var(--white);
        }
        
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .btn-secondary:hover {
            background: var(--gray-50);
            border-color: var(--gray-400);
        }
        
        .btn-warning:hover {
            background: #0A4F18;
        }
        
        .btn-danger:hover {
            background: #DC2626;
        }
        
        /* Responsive styles now handled by main CSS file */
    `;
    document.head.appendChild(style);
    
    return modal;
}

// Populate transaction modal with data
function populateTransactionModal(transaction) {
    // Reset modal to normal view first
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.classList.remove('edit-mode');
    }
    
    document.getElementById('modalDate').textContent = formatDate(transaction.transaction_date || transaction.date);
    document.getElementById('modalPayee').textContent = transaction.payee;
    document.getElementById('modalReference').textContent = transaction.reference || '';
    document.getElementById('modalCrossReference').textContent = transaction.cross_reference || transaction.crossReference || '';
    document.getElementById('modalCheckNumber').textContent = transaction.check_number || transaction.checkNumber || '';
    document.getElementById('modalParticulars').textContent = transaction.particulars;
    document.getElementById('modalDebit').textContent = formatAmount(transaction.debit_amount || transaction.debit);
    document.getElementById('modalCredit').textContent = formatAmount(transaction.credit_amount || transaction.credit);
    
    // Populate account balance fields
    document.getElementById('modalCashInBank').textContent = formatAmount(transaction.cash_in_bank || transaction.cashInBank);
    document.getElementById('modalLoanReceivables').textContent = formatAmount(transaction.loan_receivables || transaction.loanReceivables);
    document.getElementById('modalSavingsDeposits').textContent = formatAmount(transaction.savings_deposits || transaction.savingsDeposits);
    document.getElementById('modalInterestIncome').textContent = formatAmount(transaction.interest_income || transaction.interestIncome);
    document.getElementById('modalServiceCharge').textContent = formatAmount(transaction.service_charge || transaction.serviceCharge);
    document.getElementById('modalSundries').textContent = formatAmount(transaction.sundries);
    
    // Store current transaction for edit/delete operations
    window.currentTransaction = transaction;
    
    // Reset modal footer to normal view (this will set buttons based on pending requests)
    resetModalFooterToNormal();
}

// Close transaction modal
function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('edit-mode');
        
        // Reset modal footer to normal view
        resetModalFooterToNormal();
        
        // Clear current transaction
        window.currentTransaction = null;
    }
}

// Start edit mode in transaction modal
function startEditMode() {
    if (!window.currentTransaction) return;
    
    // Check user role and prevent Finance Officers from editing
    const userRole = localStorage.getItem('user_role');
    if (userRole === 'Finance Officer') {
        return;
    }
    
    // Check if there are pending requests that prevent editing
    const hasPendingEdit = pendingEditRequests.has(window.currentTransaction.id);
    const hasPendingDeletion = pendingDeletionRequests.has(window.currentTransaction.id);
    
    if (hasPendingEdit) {
        const existingRequest = pendingEditRequests.get(window.currentTransaction.id);
        showErrorMessage(`An edit request for this transaction is already pending (Request #${existingRequest.id.substring(0, 8)}). Please wait for the Finance Officer to process it.`);
        return;
    }
    
    if (hasPendingDeletion) {
        showErrorMessage('Cannot edit: A deletion request is pending for this transaction. Please wait for the Finance Officer to process it.');
        return;
    }
    
    // Add edit mode class to modal
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.classList.add('edit-mode');
    }
    
    // Convert editable fields to input elements
    convertFieldsToInputs();
    
    // Update modal footer with edit buttons
    updateModalFooterForEdit();
}

// Convert editable fields to input elements
function convertFieldsToInputs() {
    const editableFields = [
        'modalReference', 'modalCrossReference', 'modalCheckNumber', 
        'modalParticulars', 'modalDebit', 'modalCredit',
        'modalCashInBank', 'modalLoanReceivables', 'modalSavingsDeposits',
        'modalInterestIncome', 'modalServiceCharge', 'modalSundries'
    ];
    
    editableFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            const currentValue = field.textContent;
            const inputType = fieldId.includes('Amount') || fieldId.includes('Bank') || 
                            fieldId.includes('Receivables') || fieldId.includes('Deposits') || 
                            fieldId.includes('Income') || fieldId.includes('Charge') || 
                            fieldId.includes('Sundries') ? 'number' : 'text';
            
            field.innerHTML = `<input type="${inputType}" value="${currentValue}" class="edit-input" step="0.01" min="0">`;
        }
    });
}

// Setup change detection for form inputs
function setupChangeDetection() {
    const editableFields = [
        'modalReference', 'modalCrossReference', 'modalCheckNumber', 
        'modalParticulars', 'modalDebit', 'modalCredit',
        'modalCashInBank', 'modalLoanReceivables', 'modalSavingsDeposits',
        'modalInterestIncome', 'modalServiceCharge', 'modalSundries'
    ];
    
    // Store original values for comparison
    const originalValues = {};
    editableFields.forEach(fieldId => {
        const input = document.querySelector(`#${fieldId} input`);
        if (input) {
            originalValues[fieldId] = input.value;
        }
    });
    
    // Add event listeners to all input fields
    editableFields.forEach(fieldId => {
        const input = document.querySelector(`#${fieldId} input`);
        if (input) {
            input.addEventListener('input', () => {
                checkForChanges(originalValues);
            });
        }
    });
}

// Check if any changes have been made
function checkForChanges(originalValues) {
    const editableFields = [
        'modalReference', 'modalCrossReference', 'modalCheckNumber', 
        'modalParticulars', 'modalDebit', 'modalCredit',
        'modalCashInBank', 'modalLoanReceivables', 'modalSavingsDeposits',
        'modalInterestIncome', 'modalServiceCharge', 'modalSundries'
    ];
    
    let hasChanges = false;
    
    editableFields.forEach(fieldId => {
        const input = document.querySelector(`#${fieldId} input`);
        if (input && input.value !== originalValues[fieldId]) {
            hasChanges = true;
        }
    });
    
    // Update button state
    const requestBtn = document.getElementById('requestChangesBtn');
    if (requestBtn) {
        if (hasChanges) {
            requestBtn.disabled = false;
            requestBtn.classList.remove('btn-disabled');
            requestBtn.classList.add('btn-primary');
        } else {
            requestBtn.disabled = true;
            requestBtn.classList.remove('btn-primary');
            requestBtn.classList.add('btn-disabled');
        }
    }
}

// Update modal footer for edit mode
function updateModalFooterForEdit() {
    const modalFooter = document.getElementById('modalFooter');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="cancelEdit()">
                <i class="fas fa-times"></i>
                Cancel
            </button>
            <button class="btn btn-disabled" id="requestChangesBtn" onclick="requestChanges()" disabled>
                <i class="fas fa-paper-plane"></i>
                Request Changes
            </button>
        `;
        
        // Add event listeners to input fields for change detection
        setupChangeDetection();
    }
}

// Reset modal footer to normal view
function resetModalFooterToNormal() {
    const modalFooter = document.getElementById('modalFooter');
    if (modalFooter) {
        const userRole = localStorage.getItem('user_role');
        let editButtonHtml = '';
        let deleteButtonHtml = '';
        
        // Only show edit and delete buttons for Marketing Clerks
        if (userRole === 'Marketing Clerk' && window.currentTransaction) {
            const transactionId = window.currentTransaction.id;
            
            // Strictly check each map - only check for the specific request type
            const hasPendingDeletion = pendingDeletionRequests.has(transactionId);
            const hasPendingEdit = pendingEditRequests.has(transactionId);
            
            if (hasPendingEdit) {
                // Show "Edit Request Pending" button, hide Delete button
                editButtonHtml = `
                    <button class="btn btn-primary btn-disabled" disabled title="An edit request for this transaction is already pending">
                        <i class="fas fa-clock"></i>
                        Edit Request Pending
                    </button>`;
            } else if (hasPendingDeletion) {
                // Show "Delete Request Pending" button, hide Edit button
                deleteButtonHtml = `
                    <button class="btn btn-danger btn-disabled" disabled title="A deletion request for this transaction is already pending">
                        <i class="fas fa-clock"></i>
                        Delete Request Pending
                    </button>`;
            } else {
                // No pending requests - show both buttons normally
                editButtonHtml = `
                    <button class="btn btn-primary" onclick="startEditMode()">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>`;
                
                deleteButtonHtml = `
                    <button class="btn btn-danger" onclick="deleteTransaction()">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>`;
            }
        }
        
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeTransactionModal()">
                <i class="fas fa-times"></i>
                Close
            </button>
            ${editButtonHtml}
            ${deleteButtonHtml}
        `;
    }
}

// Cancel edit mode
function cancelEdit() {
    // Remove edit mode class from modal
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.classList.remove('edit-mode');
    }
    
    // Reload the modal with original data
    populateTransactionModal(window.currentTransaction);
    
    // Restore original footer
    resetModalFooterToNormal();
}

// Request changes - Send to Finance Officer for approval
async function requestChanges() {
    if (!window.currentTransaction) return;
    
    // Check if button is disabled (no changes made)
    const requestBtn = document.getElementById('requestChangesBtn');
    if (requestBtn && requestBtn.disabled) {
        return; // Do nothing if button is disabled
    }
    
    // Check if there's already a pending change request for this transaction
    try {
        const userBranchId = localStorage.getItem('user_branch_id');
        const response = await apiRequest(`/change-requests?branch_id=${userBranchId}&transaction_id=${window.currentTransaction.id}&status=pending`);
        
        if (response.success && response.data && response.data.length > 0) {
            showError('A pending change request already exists for this transaction. Please wait for it to be processed.');
            return;
        }
    } catch (error) {
        console.error('Error checking for existing change requests:', error);
        // Continue with the request even if check fails
    }
    
    try {
        showLoadingState();
        
        // Collect edited values
        const editedData = collectEditedValues();
        const originalData = {
            payee: window.currentTransaction.payee,
            reference: window.currentTransaction.reference || '',
            cross_reference: window.currentTransaction.cross_reference || '',
            check_number: window.currentTransaction.check_number || '',
            particulars: window.currentTransaction.particulars || '',
            debit_amount: window.currentTransaction.debit_amount || 0,
            credit_amount: window.currentTransaction.credit_amount || 0,
            cash_in_bank: window.currentTransaction.cash_in_bank || 0,
            loan_receivables: window.currentTransaction.loan_receivables || 0,
            savings_deposits: window.currentTransaction.savings_deposits || 0,
            interest_income: window.currentTransaction.interest_income || 0,
            service_charge: window.currentTransaction.service_charge || 0,
            sundries: window.currentTransaction.sundries || 0,
            branch_id: window.currentTransaction.branch_id || parseInt(userBranchId),
            transaction_date: window.currentTransaction.transaction_date,
            transaction_type: window.currentTransaction.transaction_type,
            description: window.currentTransaction.description
        };
        
        // Get user branch and role information
        const userBranchId = localStorage.getItem('user_branch_id');
        const userRole = localStorage.getItem('user_role');
        
        if (userRole !== 'Marketing Clerk') {
            throw new Error('Only Marketing Clerks can request changes');
        }
        
        // Determine the correct transaction table based on branch ID
        let transactionTable = 'ibaan_transactions'; // Default for main branch (ID: 1)
        
        // Map branch IDs to their corresponding transaction tables
        const branchId = parseInt(userBranchId);
        switch (branchId) {
            case 1: // Main Branch
                transactionTable = 'ibaan_transactions';
                break;
            case 2: // Bauan
                transactionTable = 'bauan_transactions';
                break;
            case 3: // San Jose
                transactionTable = 'sanjose_transactions';
                break;
            case 4: // Rosario
                transactionTable = 'rosario_transactions';
                break;
            case 5: // San Juan
                transactionTable = 'sanjuan_transactions';
                break;
            case 6: // Padre Garcia
                transactionTable = 'padregarcia_transactions';
                break;
            case 7: // Lipa City
                transactionTable = 'lipacity_transactions';
                break;
            case 8: // Batangas City
                transactionTable = 'batangascity_transactions';
                break;
            case 9: // Mabini Lipa
                transactionTable = 'mabinilipa_transactions';
                break;
            case 10: // Calamias
                transactionTable = 'calamias_transactions';
                break;
            case 11: // Lemery
                transactionTable = 'lemery_transactions';
                break;
            case 12: // Mataas Na Kahoy
                transactionTable = 'mataasnakahoy_transactions';
                break;
            case 13: // Tanauan
                transactionTable = 'tanauan_transactions';
                break;
            default:
                transactionTable = 'ibaan_transactions'; // Fallback to main branch
                break;
        }
        
        // Create change request
        const changeRequestData = {
            transaction_id: window.currentTransaction.id,
            transaction_table: transactionTable,
            original_data: originalData,
            requested_changes: editedData,
            reason: 'Transaction modification requested by marketing clerk',
            request_type: 'modification'
        };
        
        console.log('Creating change request with data:', {
            transaction_id: changeRequestData.transaction_id,
            transaction_table: changeRequestData.transaction_table,
            branch_id: userBranchId,
            branch_name: localStorage.getItem('user_branch_name')
        });
        
        // Send change request to finance officer
        const response = await apiRequest('/change-requests', {
            method: 'POST',
            body: JSON.stringify(changeRequestData)
        });
        
        if (response.success) {
            // Add to pending edit requests map and remove from deletion requests if present
            if (response.data && response.data.id) {
                pendingDeletionRequests.delete(window.currentTransaction.id); // Remove from deletion map if exists
                pendingEditRequests.set(window.currentTransaction.id, response.data);
            }
            
            showSuccess('Change request sent to Finance Officer for approval');
            closeTransactionModal();
            await loadTransactionsFromDatabase();
            
            // Update pending requests count
            updatePendingRequestsCount();
        } else {
            throw new Error(response.message || 'Failed to send change request');
        }
        
    } catch (error) {
        console.error('Error requesting changes:', error);
        showError('Failed to send change request: ' + error.message);
    } finally {
        hideLoadingState();
    }
}

// Collect edited values from input fields
function collectEditedValues() {
    const userBranchId = localStorage.getItem('user_branch_id');
    
    return {
        reference: document.querySelector('#modalReference input')?.value || '',
        cross_reference: document.querySelector('#modalCrossReference input')?.value || '',
        check_number: document.querySelector('#modalCheckNumber input')?.value || '',
        particulars: document.querySelector('#modalParticulars input')?.value || '',
        debit_amount: parseFloat(document.querySelector('#modalDebit input')?.value) || 0,
        credit_amount: parseFloat(document.querySelector('#modalCredit input')?.value) || 0,
        cash_in_bank: parseFloat(document.querySelector('#modalCashInBank input')?.value) || 0,
        loan_receivables: parseFloat(document.querySelector('#modalLoanReceivables input')?.value) || 0,
        savings_deposits: parseFloat(document.querySelector('#modalSavingsDeposits input')?.value) || 0,
        interest_income: parseFloat(document.querySelector('#modalInterestIncome input')?.value) || 0,
        service_charge: parseFloat(document.querySelector('#modalServiceCharge input')?.value) || 0,
        sundries: parseFloat(document.querySelector('#modalSundries input')?.value) || 0,
        branch_id: parseInt(userBranchId)
    };
}

// Delete transaction
async function deleteTransaction() {
    if (!window.currentTransaction) return;
    
    const userRole = localStorage.getItem('user_role');
    
    // For Marketing Clerks, check if deletion request already exists
    if (userRole === 'Marketing Clerk') {
        if (pendingDeletionRequests.has(window.currentTransaction.id)) {
            const existingRequest = pendingDeletionRequests.get(window.currentTransaction.id);
            showErrorMessage(`A deletion request for this transaction is already pending (Request #${existingRequest.id.substring(0, 8)}). Please wait for the Finance Officer to process it.`);
            return;
        }
    }
    
    // Show minimalist centered confirmation
    showDeleteConfirmation();
}

// Show minimalist centered delete confirmation
function showDeleteConfirmation() {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="delete-icon"><i class="fas fa-trash"></i></div>
            <div class="message-text">Are you sure you want to delete this transaction?</div>
            <div class="confirmation-actions">
                <button class="btn btn-secondary" onclick="closeDeleteConfirmation()">Cancel</button>
                <button class="btn btn-danger" onclick="confirmDelete()">Delete</button>
            </div>
        </div>
    `;
    
    // Add simple styles
    const style = document.createElement('style');
    style.textContent = `
        .simple-message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .simple-message-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        
        .delete-icon {
            color: #EF4444 !important;
            font-size: 20px !important;
            margin: 0 auto 16px auto !important;
            font-family: Arial, sans-serif !important;
        }
        
        .delete-icon i {
            font-size: 20px !important;
            color: #EF4444 !important;
        }
        
        .message-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            line-height: 1.4;
            margin-bottom: 20px;
        }
        
        .confirmation-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-secondary {
            background: #F3F4F6;
            color: #374151;
        }
        
        .btn-danger {
            background: #EF4444;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

// Close delete confirmation
function closeDeleteConfirmation() {
    const modal = document.querySelector('.simple-message-modal');
    if (modal) {
        modal.remove();
    }
}

// Load pending deletion requests for transactions
async function loadPendingDeletionRequests(userBranchId) {
    try {
        // Fetch all pending deletion requests for this branch
        const response = await apiRequest(`/change-requests?branch_id=${userBranchId}&status=pending&request_type=deletion`);
        
        if (response.success && response.data) {
            // Clear existing map
            pendingDeletionRequests.clear();
            
            // Map transaction IDs to their pending deletion requests
            // Only include requests with request_type === 'deletion'
            response.data.forEach(request => {
                if (request.transaction_id && 
                    request.status === 'pending' && 
                    (request.request_type === 'deletion' || request.request_type === 'delete')) {
                    // Ensure this transaction is not in the edit requests map
                    pendingEditRequests.delete(request.transaction_id);
                    pendingDeletionRequests.set(request.transaction_id, request);
                }
            });
            
            console.log('Pending deletion requests loaded:', pendingDeletionRequests.size);
        }
    } catch (error) {
        console.error('Error loading pending deletion requests:', error);
        // Don't throw - this is not critical, just log the error
    }
}

// Load pending edit requests for transactions
async function loadPendingEditRequests(userBranchId) {
    try {
        // Fetch all pending modification/edit requests for this branch
        const response = await apiRequest(`/change-requests?branch_id=${userBranchId}&status=pending&request_type=modification`);
        
        if (response.success && response.data) {
            // Clear existing map
            pendingEditRequests.clear();
            
            // Map transaction IDs to their pending edit requests
            // Only include requests with request_type === 'modification'
            response.data.forEach(request => {
                if (request.transaction_id && 
                    request.status === 'pending' && 
                    (request.request_type === 'modification' || request.request_type === 'edit')) {
                    // Ensure this transaction is not in the deletion requests map
                    pendingDeletionRequests.delete(request.transaction_id);
                    pendingEditRequests.set(request.transaction_id, request);
                }
            });
            
            console.log('Pending edit requests loaded:', pendingEditRequests.size);
        }
    } catch (error) {
        console.error('Error loading pending edit requests:', error);
        // Don't throw - this is not critical, just log the error
    }
}

// Confirm delete action
async function confirmDelete() {
    if (!window.currentTransaction) return;
    
    const userRole = localStorage.getItem('user_role');
    
    // Finance Officers can delete immediately
    if (userRole === 'Finance Officer') {
        await performImmediateDelete();
        return;
    }
    
    // Marketing Clerks must request deletion
    // Check if deletion request already exists for this transaction
    const transaction = window.currentTransaction;
    if (pendingDeletionRequests.has(transaction.id)) {
        const existingRequest = pendingDeletionRequests.get(transaction.id);
        showErrorMessage(`A deletion request for this transaction is already pending (Request #${existingRequest.id.substring(0, 8)}). Please wait for the Finance Officer to process it.`);
        closeDeleteConfirmation();
        return;
    }
    
    try {
        showLoadingState();
        closeDeleteConfirmation();
        
        const userId = localStorage.getItem('user_id');
        const userBranchId = localStorage.getItem('user_branch_id');
        
        // Create delete request
        const requestData = {
            transaction_id: transaction.id,
            transaction_table: transaction.transaction_type || 'transactions',
            original_data: transaction,
            requested_changes: { action: 'delete' }, // Mark as delete action
            reason: `MC requests to delete transaction for ${transaction.payee}`,
            request_type: 'deletion' // New type
        };
        
        const response = await apiRequest('/change-requests', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        if (response.success) {
            // Add to pending deletion requests map and remove from edit requests if present
            if (response.data && response.data.id) {
                pendingEditRequests.delete(transaction.id); // Remove from edit map if exists
                pendingDeletionRequests.set(transaction.id, response.data);
            }
            
            closeTransactionModal();
            await loadTransactionsFromDatabase();
            showDeleteRequestSuccessMessage(transaction.payee);
        } else {
            throw new Error(response.message || 'Failed to create delete request');
        }
    } catch (error) {
        console.error('Error creating delete request:', error);
        showErrorMessage('Failed to create delete request. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// Keep immediate delete for Finance Officers
async function performImmediateDelete() {
    if (!window.currentTransaction) return;
    
    try {
        showLoadingState();
        closeDeleteConfirmation();
        
        const response = await apiRequest(`/transactions/${window.currentTransaction.id}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            const payeeName = window.currentTransaction ? window.currentTransaction.payee : 'Unknown';
            closeTransactionModal();
            await loadTransactionsFromDatabase();
            showDeleteSuccessMessage(payeeName);
        } else {
            throw new Error(response.message || 'Failed to delete transaction');
        }
    } catch (error) {
        showErrorMessage('Error: Failed to delete transaction. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// Add new success message for delete request
function showDeleteRequestSuccessMessage(payeeName) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="success-icon"><i class="fas fa-check-circle"></i></div>
            <div class="message-text">Delete request for "${payeeName}" has been submitted for approval</div>
        </div>
    `;
    
    // Add simple styles
    const style = document.createElement('style');
    style.textContent = `
        .simple-message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .simple-message-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        
        .success-icon {
            color: #10B981 !important;
            font-size: 20px !important;
            margin: 0 auto 16px auto !important;
            font-family: Arial, sans-serif !important;
        }
        
        .success-icon i {
            font-size: 20px !important;
            color: #10B981 !important;
        }
        
        .message-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            line-height: 1.4;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Auto close after 2 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 2000);
}

// Show minimalist delete success message
function showDeleteSuccessMessage(payeeName) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="success-icon"><i class="fas fa-check-circle" style="font-size: 24px;"></i></div>
            <div class="message-text">Transaction for <span class="payee-name">${payeeName}</span> has been deleted successfully</div>
        </div>
    `;
    
    // Add simple styles
    const style = document.createElement('style');
    style.textContent = `
        .simple-message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .simple-message-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        
        .success-icon {
            color: #EF4444;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px auto;
        }
        
        .message-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            line-height: 1.4;
        }
        
        .payee-name {
            font-weight: bold;
            color: #EF4444;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Auto close after 2 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 2000);
}

// Open add transaction form
function openAddTransactionForm() {
    const userRole = localStorage.getItem('user_role');
    
    // Prevent Finance Officers from accessing the add transaction form
    if (userRole === 'Finance Officer') {
        return;
    }

    editingTransactionId = null;
    document.getElementById('transactionFormTitle').textContent = 'Add Transaction';
    document.getElementById('transactionForm').reset();
    setDefaultDate();
    
    // Clear any validation errors
    clearValidationErrors();
    
    document.getElementById('transactionFormDialog').style.display = 'flex';
}

// Open add transaction form without resetting (for preview cancel)
function openAddTransactionFormWithoutReset() {
    const userRole = localStorage.getItem('user_role');
    
    // Prevent Finance Officers from accessing the add transaction form
    if (userRole === 'Finance Officer') {
        return;
    }

    editingTransactionId = null;
    document.getElementById('transactionFormTitle').textContent = 'Add Transaction';
    
    // Clear any validation errors
    clearValidationErrors();
    
    document.getElementById('transactionFormDialog').style.display = 'flex';
}

// Preview transaction
function previewTransaction() {
    const date = document.getElementById('transactionDate').value;
    const payee = document.getElementById('payee').value.trim();
    const reference = document.getElementById('reference').value.trim();
    const crossReference = document.getElementById('crossReference').value.trim();
    const checkNumber = document.getElementById('checkNumber').value.trim();
    const particulars = document.getElementById('particulars').value.trim();
    const debit = parseFloat(document.getElementById('debitAmount').value) || 0;
    const credit = parseFloat(document.getElementById('creditAmount').value) || 0;
    
    // Get account balance values from form
    const cashInBank = parseFloat(document.getElementById('cashInBank').value) || 0;
    const loanReceivables = parseFloat(document.getElementById('loanReceivables').value) || 0;
    const savingsDeposits = parseFloat(document.getElementById('savingsDeposits').value) || 0;
    const interestIncome = parseFloat(document.getElementById('interestIncome').value) || 0;
    const serviceCharge = parseFloat(document.getElementById('serviceCharge').value) || 0;
    const sundries = parseFloat(document.getElementById('sundries').value) || 0;
    
    // Clear previous validation errors
    clearValidationErrors();
    
    // Validate required fields
    let hasErrors = false;
    
    if (!date) {
        showFieldError('transactionDate', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (!payee) {
        showFieldError('payee', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (!particulars) {
        showFieldError('particulars', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (debit === 0 && credit === 0) {
        showFieldError('debitAmount', 'Please enter either a debit or credit amount');
        showFieldError('creditAmount', 'Please enter either a debit or credit amount');
        hasErrors = true;
    }
    
    // Validate all account balance fields
    if (cashInBank === 0) {
        showFieldError('cashInBank', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (loanReceivables === 0) {
        showFieldError('loanReceivables', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (savingsDeposits === 0) {
        showFieldError('savingsDeposits', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (interestIncome === 0) {
        showFieldError('interestIncome', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (serviceCharge === 0) {
        showFieldError('serviceCharge', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (sundries === 0) {
        showFieldError('sundries', 'Please fill out this field');
        hasErrors = true;
    }
    
    if (hasErrors) {
        return;
    }
    
    // Show preview modal
    showTransactionPreview({
        transaction_date: date,
        payee,
        reference,
        cross_reference: crossReference,
        check_number: checkNumber,
        particulars,
        debit_amount: debit,
        credit_amount: credit,
        cash_in_bank: cashInBank,
        loan_receivables: loanReceivables,
        savings_deposits: savingsDeposits,
        interest_income: interestIncome,
        service_charge: serviceCharge,
        sundries: sundries
    });
}

// Save transaction (now only used for updates via edit mode)
async function saveTransaction() {
    // This function is now only used for updating existing transactions
    // New transactions use the preview flow with saveTransactionFromPreview()
    console.log('saveTransaction called - this should only be used for updates');
}


// Close transaction form
function closeTransactionForm() {
    document.getElementById('transactionFormDialog').style.display = 'none';
    editingTransactionId = null;
}

// Initialize Excel-like scroll controls
function initializeScrollControls() {
    const scrollThumb = document.getElementById('scrollThumb');
    const scrollTrack = document.querySelector('.scroll-track');
    const tableContainer = document.getElementById('transactionTableContainer');
    
    if (scrollThumb && scrollTrack && tableContainer) {
        // Make scroll thumb draggable (Excel-like)
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        
        // Mouse events for dragging
        scrollThumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = parseInt(scrollThumb.style.left) || 0;
            document.addEventListener('mousemove', handleScrollDrag);
            document.addEventListener('mouseup', stopScrollDrag);
            e.preventDefault();
        });
        
        // Click on track to jump to position (Excel-like)
        scrollTrack.addEventListener('click', (e) => {
            if (e.target === scrollThumb) return;
            const trackRect = scrollTrack.getBoundingClientRect();
            const clickX = e.clientX - trackRect.left;
            const trackWidth = scrollTrack.offsetWidth;
            const thumbWidth = scrollThumb.offsetWidth;
            const maxLeft = trackWidth - thumbWidth;
            
            const newLeft = Math.max(0, Math.min(maxLeft, clickX - thumbWidth / 2));
            scrollThumb.style.left = newLeft + 'px';
            
            // Update table scroll position
            const scrollRatio = newLeft / maxLeft;
            const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
            tableContainer.scrollLeft = scrollRatio * maxScroll;
        });
        
        function handleScrollDrag(e) {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const trackWidth = scrollTrack.offsetWidth;
            const thumbWidth = scrollThumb.offsetWidth;
            const maxLeft = trackWidth - thumbWidth;
            
            let newLeft = startLeft + deltaX;
            newLeft = Math.max(0, Math.min(maxLeft, newLeft));
            
            scrollThumb.style.left = newLeft + 'px';
            
            // Update table scroll position
            const scrollRatio = newLeft / maxLeft;
            const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
            tableContainer.scrollLeft = scrollRatio * maxScroll;
        }
        
        function stopScrollDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', handleScrollDrag);
            document.removeEventListener('mouseup', stopScrollDrag);
        }
        
        // Update scroll thumb position when table scrolls (Excel-like)
        tableContainer.addEventListener('scroll', () => {
            const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
            if (maxScroll <= 0) return;
            
            const scrollRatio = tableContainer.scrollLeft / maxScroll;
            const trackWidth = scrollTrack.offsetWidth;
            const thumbWidth = scrollThumb.offsetWidth;
            const maxLeft = trackWidth - thumbWidth;
            
            scrollThumb.style.left = (scrollRatio * maxLeft) + 'px';
        });
        
        // Update thumb size based on visible content (Excel-like)
        function updateThumbSize() {
            const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
            const trackWidth = scrollTrack.offsetWidth;
            
            if (maxScroll <= 0) {
                scrollThumb.style.width = '100%';
            } else {
                const thumbWidth = Math.max(20, (tableContainer.clientWidth / tableContainer.scrollWidth) * trackWidth);
                scrollThumb.style.width = thumbWidth + 'px';
            }
        }
        
        // Initial thumb size update
        updateThumbSize();
        
        // Update thumb size on resize
        window.addEventListener('resize', updateThumbSize);
    }
}

// Scroll functions using event listeners
function setupScrollButtons() {
    const leftBtn = document.getElementById('scrollLeftBtn');
    const rightBtn = document.getElementById('scrollRightBtn');
    const tableContainer = document.getElementById('transactionTableContainer');
    
    if (leftBtn && tableContainer) {
        leftBtn.addEventListener('click', function() {
            tableContainer.scrollLeft -= 200;
            updateScrollThumb();
        });
    }
    
    if (rightBtn && tableContainer) {
        rightBtn.addEventListener('click', function() {
            tableContainer.scrollLeft += 200;
            updateScrollThumb();
        });
    }
}

// Keep global functions for compatibility
function scrollLeft() {
    const tableContainer = document.getElementById('transactionTableContainer');
    if (tableContainer) {
        tableContainer.scrollLeft -= 200;
        updateScrollThumb();
    }
}

function scrollRight() {
    const tableContainer = document.getElementById('transactionTableContainer');
    if (tableContainer) {
        tableContainer.scrollLeft += 200;
        updateScrollThumb();
    }
}

// Update scroll thumb position and size based on zoom
function updateScrollThumb() {
    const tableContainer = document.getElementById('transactionTableContainer');
    const scrollThumb = document.getElementById('scrollThumb');
    const scrollTrack = document.querySelector('.scroll-track');
    
    if (tableContainer && scrollThumb && scrollTrack) {
        const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
        const trackWidth = scrollTrack.offsetWidth;
        
        // Calculate thumb size based on zoom level
        // Higher zoom = smaller thumb (more content to scroll)
        // Lower zoom = larger thumb (less content to scroll)
        let thumbWidth;
        
        if (currentZoom <= 50) {
            // At 50% zoom or below, make thumb full width
            thumbWidth = trackWidth;
            scrollThumb.style.left = '0px';
        } else {
            // Above 50% zoom, calculate proportional thumb size
            const zoomRatio = currentZoom / 100;
            const baseThumbWidth = 30; // Base thumb width percentage at 100% zoom
            const thumbWidthPercentage = Math.max(10, Math.min(95, baseThumbWidth / zoomRatio));
            
            thumbWidth = (trackWidth * thumbWidthPercentage) / 100;
            
            // Calculate position
            const scrollRatio = tableContainer.scrollLeft / maxScroll;
            const maxLeft = trackWidth - thumbWidth;
            scrollThumb.style.left = (scrollRatio * maxLeft) + 'px';
        }
        
        // Update thumb width
        scrollThumb.style.width = thumbWidth + 'px';
    }
}

// Zoom functionality
function zoomIn() {
    currentZoom = Math.min(150, currentZoom + 10);
    updateZoom(currentZoom);
}

function zoomOut() {
    currentZoom = Math.max(50, currentZoom - 10);
    updateZoom(currentZoom);
}

function updateZoom(value) {
    currentZoom = parseInt(value);
    const table = document.getElementById('transactionTable');
    const slider = document.getElementById('zoomSlider');
    const percentage = document.getElementById('zoomPercentage');
    const tableContainer = document.getElementById('transactionTableContainer');
    
    if (table && slider && percentage && tableContainer) {
        // Apply zoom with proper scaling
        const scale = currentZoom / 100;
        table.style.transform = `scale(${scale})`;
        table.style.transformOrigin = 'top left';
        
        // Update slider and percentage display
        slider.value = currentZoom;
        percentage.textContent = `${currentZoom}%`;
        
        // Keep container height fixed for consistent scrolling
        tableContainer.style.maxHeight = '60vh';
        
        // Ensure only vertical scrolling in container, horizontal via bottom controls
        tableContainer.style.overflowX = 'hidden';
        tableContainer.style.overflowY = 'auto';
        
        // Update table width to prevent horizontal cutting
        const scaledWidth = 1400 * scale;
        table.style.width = `${scaledWidth}px`;
        table.style.minWidth = `${scaledWidth}px`;
        
        // Ensure container doesn't exceed wrapper bounds
        tableContainer.style.width = '100%';
        tableContainer.style.maxWidth = '100%';
        
        
        // Update scroll thumb size based on new zoom level
        setTimeout(() => {
            updateScrollThumb();
        }, 100); // Small delay to ensure DOM updates are complete
    }
}

// Search function - searches Date, Payee, and Reference columns
// Enhanced to support month name searches (e.g., "January", "Jan", "01")
function searchPayee() {
    const searchInput = document.getElementById('payeeSearch');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const tableRows = document.querySelectorAll('.transaction-table tbody tr');
    
    // If search term is empty, show all rows
    if (!searchTerm) {
        tableRows.forEach(row => {
            row.style.display = '';
        });
        return;
    }
    
    // Month name mapping for search
    const monthMap = {
        'january': '01', 'jan': '01',
        'february': '02', 'feb': '02',
        'march': '03', 'mar': '03',
        'april': '04', 'apr': '04',
        'may': '05',
        'june': '06', 'jun': '06',
        'july': '07', 'jul': '07',
        'august': '08', 'aug': '08',
        'september': '09', 'sep': '09', 'sept': '09',
        'october': '10', 'oct': '10',
        'november': '11', 'nov': '11',
        'december': '12', 'dec': '12'
    };
    
    // Check if search term is a month name
    const monthNumber = monthMap[searchTerm];
    
    tableRows.forEach(row => {
        // Get cells for Date (index 0), Payee (index 1), and Reference (index 2)
        const dateCell = row.cells[0];
        const payeeCell = row.cells[1];
        const referenceCell = row.cells[2];
        
        let matches = false;
        
        // Check Date column
        if (dateCell) {
            const dateText = dateCell.textContent.trim();
            const dateTextLower = dateText.toLowerCase();
            
            // Direct text match (e.g., "01/15/2024" contains "01" or "2024")
            if (dateTextLower.includes(searchTerm)) {
                matches = true;
            }
            // Month name match - check if search term is a month name
            else if (monthNumber) {
                // Parse MM/DD/YYYY format
                const dateParts = dateText.split('/');
                if (dateParts.length === 3) {
                    const month = dateParts[0]; // MM (already padded, e.g., "01")
                    if (month === monthNumber) {
                        matches = true;
                    }
                }
            }
            // Month number match (e.g., "1" matches "01", "01" matches "01")
            else if (/^\d{1,2}$/.test(searchTerm)) {
                const monthNum = parseInt(searchTerm);
                if (monthNum >= 1 && monthNum <= 12) {
                    const dateParts = dateText.split('/');
                    if (dateParts.length === 3) {
                        const month = parseInt(dateParts[0]);
                        if (month === monthNum) {
                            matches = true;
                        }
                    }
                }
            }
        }
        
        // Check Payee column
        if (!matches && payeeCell) {
            const payeeText = payeeCell.textContent.toLowerCase();
            if (payeeText.includes(searchTerm)) {
                matches = true;
            }
        }
        
        // Check Reference column
        if (!matches && referenceCell) {
            const referenceText = referenceCell.textContent.toLowerCase();
            if (referenceText.includes(searchTerm)) {
                matches = true;
            }
        }
        
        // Show or hide row based on match
        row.style.display = matches ? '' : 'none';
    });
    
}


// Export transaction data
function exportTransactionData() {
    const csvContent = generateTransactionCSV();
    downloadCSV(csvContent, 'transaction_ledger.csv');
}

// Generate CSV content for transactions
function generateTransactionCSV() {
    const headers = [
        'Date', 'Payee', 'Reference', 'Cross Reference', 'Check Number',
        'Cash in Bank', 'Loan Receivables', 'Savings Deposits', 'Interest Income',
        'Service Charge', 'Sundries', 'Particulars', 'Debit', 'Credit'
    ];
    const csvRows = [headers.join(',')];
    
    currentTransactions.forEach(transaction => {
        const row = [
            transaction.date,
            transaction.payee,
            transaction.reference || '',
            transaction.crossReference || '',
            transaction.checkNumber || '',
            transaction.cashInBank || 0,
            transaction.loanReceivables || 0,
            transaction.savingsDeposits || 0,
            transaction.interestIncome || 0,
            transaction.serviceCharge || 0,
            transaction.sundries || 0,
            transaction.particulars,
            transaction.debit || 0,
            transaction.credit || 0
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Show loading state
function showLoadingState() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading...</span>
        </div>
    `;
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    document.body.appendChild(loadingOverlay);
}

// Hide loading state
function hideLoadingState() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        document.body.removeChild(loadingOverlay);
    }
}

// Field validation functions
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        // Add error styling
        field.style.borderColor = '#EF4444';
        field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #EF4444;
            font-size: 12px;
            margin-top: 4px;
            font-weight: 500;
        `;
        
        field.parentNode.appendChild(errorDiv);
    }
}

function clearValidationErrors() {
    // Remove all error styling and messages
    const fields = document.querySelectorAll('#transactionForm input, #transactionForm select');
    fields.forEach(field => {
        field.style.borderColor = '';
        field.style.boxShadow = '';
    });
    
    // Remove all error messages
    const errorMessages = document.querySelectorAll('.field-error');
    errorMessages.forEach(error => error.remove());
}


// Show transaction preview modal
function showTransactionPreview(transactionData) {
    // Close the add transaction form first to prevent overlay stacking
    closeTransactionForm();
    
    // Create preview modal if it doesn't exist
    let modal = document.getElementById('transactionPreviewModal');
    if (!modal) {
        modal = createTransactionPreviewModal();
        document.body.appendChild(modal);
    }
    
    // Populate preview modal with transaction data
    populateTransactionPreview(transactionData);
    
    // Show modal
    modal.style.display = 'flex';
}

// Create transaction preview modal
function createTransactionPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'transactionPreviewModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content transaction-preview-modal">
            <div class="modal-header">
                <h3>Transaction Preview</h3>
                <button type="button" class="close-btn" onclick="closeTransactionPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="transaction-preview">
                    <div class="preview-section">
                        <h4 class="section-title">Basic Information</h4>
                        <div class="preview-grid">
                            <div class="preview-item">
                                <label>Date</label>
                                <span id="previewDate"></span>
                            </div>
                            <div class="preview-item">
                                <label>Payee</label>
                                <span id="previewPayee"></span>
                            </div>
                            <div class="preview-item">
                                <label>Reference</label>
                                <span id="previewReference"></span>
                            </div>
                            <div class="preview-item">
                                <label>Cross Reference</label>
                                <span id="previewCrossReference"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="preview-section">
                        <h4 class="section-title">Transaction Details</h4>
                        <div class="preview-grid">
                            <div class="preview-item">
                                <label>Check Number</label>
                                <span id="previewCheckNumber"></span>
                            </div>
                            <div class="preview-item">
                                <label>Particulars</label>
                                <span id="previewParticulars"></span>
                            </div>
                            <div class="preview-item">
                                <label>Debit Amount</label>
                                <span id="previewDebit" class="amount"></span>
                            </div>
                            <div class="preview-item">
                                <label>Credit Amount</label>
                                <span id="previewCredit" class="amount"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="preview-section">
                        <h4 class="section-title">Account Balances</h4>
                        <div class="preview-grid">
                            <div class="preview-item">
                                <label>Cash in Bank</label>
                                <span id="previewCashInBank" class="amount"></span>
                            </div>
                            <div class="preview-item">
                                <label>Loan Receivables</label>
                                <span id="previewLoanReceivables" class="amount"></span>
                            </div>
                            <div class="preview-item">
                                <label>Savings Deposits</label>
                                <span id="previewSavingsDeposits" class="amount"></span>
                            </div>
                            <div class="preview-item">
                                <label>Interest Income</label>
                                <span id="previewInterestIncome" class="amount"></span>
                            </div>
                            <div class="preview-item">
                                <label>Service Charge</label>
                                <span id="previewServiceCharge" class="amount"></span>
                            </div>
                            <div class="preview-item">
                                <label>Sundries</label>
                                <span id="previewSundries" class="amount"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeTransactionPreview()">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
                <button class="btn btn-primary" onclick="saveTransactionFromPreview()">
                    <i class="fas fa-save"></i>
                    Save Transaction
                </button>
            </div>
        </div>
    `;
    
    
    return modal;
}

// Populate transaction preview with data
function populateTransactionPreview(transaction) {
    document.getElementById('previewDate').textContent = formatDate(transaction.transaction_date);
    document.getElementById('previewPayee').textContent = transaction.payee;
    document.getElementById('previewReference').textContent = transaction.reference || '';
    document.getElementById('previewCrossReference').textContent = transaction.cross_reference || '';
    document.getElementById('previewCheckNumber').textContent = transaction.check_number || '';
    document.getElementById('previewParticulars').textContent = transaction.particulars;
    document.getElementById('previewDebit').textContent = formatAmount(transaction.debit_amount);
    document.getElementById('previewCredit').textContent = formatAmount(transaction.credit_amount);
    
    // Populate account balance fields
    document.getElementById('previewCashInBank').textContent = formatAmount(transaction.cash_in_bank);
    document.getElementById('previewLoanReceivables').textContent = formatAmount(transaction.loan_receivables);
    document.getElementById('previewSavingsDeposits').textContent = formatAmount(transaction.savings_deposits);
    document.getElementById('previewInterestIncome').textContent = formatAmount(transaction.interest_income);
    document.getElementById('previewServiceCharge').textContent = formatAmount(transaction.service_charge);
    document.getElementById('previewSundries').textContent = formatAmount(transaction.sundries);
    
    // Store current transaction data for saving
    window.previewTransactionData = transaction;
}


// Close transaction preview
function closeTransactionPreview() {
    const modal = document.getElementById('transactionPreviewModal');
    if (modal) {
        modal.style.display = 'none';
        window.previewTransactionData = null;
    }
    
    // Reopen the add transaction form without resetting
    openAddTransactionFormWithoutReset();
}

// Show simple centered success message
function showCenteredSuccessMessage(payeeName) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="success-icon"><i class="fas fa-check-circle"></i></div>
            <div class="message-text">Transaction for <span class="payee-name">${payeeName}</span> has been saved successfully</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto close after 2 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 2000);
}

// Save transaction from preview
async function saveTransactionFromPreview() {
    if (!window.previewTransactionData) return;
    
    const userBranchId = localStorage.getItem('user_branch_id');
    
    // Add branch_id to transaction data
    const transactionData = {
        ...window.previewTransactionData,
        branch_id: parseInt(userBranchId)
    };
    
    try {
        showLoadingState();
        
        const response = await apiRequest('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
        
        if (response.success) {
            // Get payee name before closing modals
            const payeeName = window.previewTransactionData ? window.previewTransactionData.payee : 'Unknown';
            
            // Close preview modal
            closeTransactionPreview();
            // Close transaction form
            closeTransactionForm();
            // Reload transactions from database
            await loadTransactionsFromDatabase();
            // Show simple success message with payee name
            showCenteredSuccessMessage(payeeName);
        } else {
            throw new Error(response.message || 'Failed to create transaction');
        }
        
    } catch (error) {
        showCenteredSuccessMessage('Error: Failed to save transaction. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// ===========================================
// PENDING REQUESTS SYSTEM
// ===========================================

// Get transaction table name based on branch ID
function getTransactionTableName(branchId) {
    const branchTableMap = {
        1: 'ibaan_transactions',        // Main Branch - IBAAN
        2: 'bauan_transactions',        // Branch 2 - BAUAN
        3: 'sanjose_transactions',      // Branch 3 - SAN JOSE
        4: 'rosario_transactions',      // Branch 4 - ROSARIO
        5: 'sanjuan_transactions',      // Branch 5 - SAN JUAN
        6: 'padregarcia_transactions',  // Branch 6 - PADRE GARCIA
        7: 'lipacity_transactions',     // Branch 7 - LIPA CITY
        8: 'batangascity_transactions', // Branch 8 - BATANGAS CITY
        9: 'mabinilipa_transactions',   // Branch 9 - MABINI LIPA
        10: 'calamias_transactions',    // Branch 10 - CALAMIAS
        11: 'lemery_transactions',      // Branch 11 - LEMERY
        12: 'mataasnakahoy_transactions', // Branch 12 - MATAAS NA KAHOY
        13: 'tanauan_transactions'      // Branch 13 - TANAUAN
    };
    return branchTableMap[branchId] || 'ibaan_transactions';
}

// Update pending requests count
async function updatePendingRequestsCount() {
    try {
        const userBranchId = localStorage.getItem('user_branch_id');
        const response = await apiRequest(`/change-requests/count?branch_id=${userBranchId}&status=pending`);
        
        if (response.success) {
            const count = response.count || 0;
            const requestCountElement = document.getElementById('requestCount');
            const pendingRequestsBtn = document.getElementById('pendingRequestsBtn');
            
            if (count > 0) {
                requestCountElement.textContent = count;
                requestCountElement.style.display = 'inline-flex';
                pendingRequestsBtn.style.background = '#46664B';
            } else {
                requestCountElement.style.display = 'none';
                pendingRequestsBtn.style.background = '#46664B';
            }
        }
    } catch (error) {
        console.error('Failed to update pending requests count:', error);
    }
}

// Show pending requests modal
async function showPendingRequests() {
    const userRole = localStorage.getItem('user_role');
    
    // Finance officers should use the dedicated function with approve/reject functionality
    if (userRole === 'Finance Officer') {
        showFinanceOfficerRequests();
        return;
    }
    
    // Marketing clerks use the generic modal
    try {
        showLoadingState();
        
        const userBranchId = localStorage.getItem('user_branch_id');
        
        // Marketing clerks see their own requests
        const endpoint = `/change-requests?branch_id=${userBranchId}&requested_by=me`;
        
        const response = await apiRequest(endpoint);
        
        if (response.success) {
            const requests = response.data || [];
            createPendingRequestsModal(requests);
        } else {
            throw new Error(response.message || 'Failed to load pending requests');
        }
    } catch (error) {
        showErrorMessage('Failed to load pending requests. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// Create pending requests modal
function createPendingRequestsModal(requests) {
    const modal = document.createElement('div');
    modal.id = 'pendingRequestsModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content pending-requests-modal">
            <div class="modal-header">
                <h3 style="font-size: 18px;">Pending Requests</h3>
                <button type="button" class="close-btn" onclick="closePendingRequestsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="requests-list">
                    ${requests.length === 0 ? 
                        '<div class="empty-requests">No pending requests found</div>' :
                        requests.map(request => createRequestItem(request)).join('')
                    }
                </div>
            </div>
            <div class="modal-footer">
                <div class="filter-buttons">
                    <button class="filter-btn" data-status="pending" onclick="filterRequestsByStatus('pending')">Pending</button>
                    <button class="filter-btn" data-status="approved" onclick="filterRequestsByStatus('approved')">Approved</button>
                    <button class="filter-btn" data-status="rejected" onclick="filterRequestsByStatus('rejected')">Rejected</button>
                </div>
                <button class="btn btn-secondary" onclick="closePendingRequestsModal()">
                    <i class="fas fa-times"></i>
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .pending-requests-modal {
            max-width: 600px;
            width: 90%;
        }
        
        .requests-list {
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .request-item {
            background: var(--gray-50);
            border: 1px solid var(--gray-200);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            transition: all 0.3s ease;
        }
        
        .request-item:hover {
            background: var(--white);
            border-color: var(--orange);
            box-shadow: 0 2px 8px rgba(255, 167, 38, 0.1);
        }
        
        
        .request-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .request-id {
            font-weight: 400;
            color: var(--gray-500);
            font-size: 12px;
        }
        
        .request-date {
            font-size: 12px;
            color: var(--gray-600);
        }
        
        .request-details {
            font-size: 14px;
            color: var(--gray-700);
            margin-bottom: 8px;
        }
        
        .request-reason {
            font-size: 13px;
            color: var(--gray-600);
            font-style: italic;
        }
        
        .empty-requests {
            text-align: center;
            padding: 40px;
            color: var(--gray-600);
            font-style: italic;
        }
        
        .request-status {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--gray-200);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-badge.pending {
            background: #FEF3C7;
            color: #D97706;
        }
        
        .status-badge.approved {
            background: #D1FAE5;
            color: #059669;
        }
        
        .status-badge.rejected {
            background: #FEE2E2;
            color: #DC2626;
        }
        
        
        .finance-notes {
            font-size: 12px;
            color: var(--gray-600);
            font-style: italic;
        }
        
        .change-details {
            margin: 12px 0;
        }
        
        .changes-section {
            margin-bottom: 8px;
        }
        
        .changes-title {
            font-weight: 600;
            color: var(--dark-green);
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .change-item {
            margin-bottom: 8px;
            padding: 8px;
            background: white;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }
        
        .change-field {
            font-weight: 600;
            color: var(--gray-700);
            margin-bottom: 4px;
            font-size: 13px;
        }
        
        .change-values {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }
        
        .change-from {
            color: #dc2626;
            background: #fef2f2;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        .change-arrow {
            color: var(--orange);
            font-weight: bold;
        }
        
        .change-to {
            color: #059669;
            background: #f0fdf4;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        .no-changes {
            text-align: center;
            color: var(--gray-500);
            font-style: italic;
            padding: 8px;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Store the original requests for filtering
    window.allRequests = requests;
}

// Filter requests by status
function filterRequestsByStatus(status) {
    const requestsList = document.querySelector('.requests-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const clickedButton = document.querySelector(`[data-status="${status}"]`);
    
    if (!window.allRequests) return;
    
    // Check if the clicked button is already active
    const isAlreadyActive = clickedButton && clickedButton.classList.contains('active');
    
    // Remove active class from all buttons
    filterButtons.forEach(btn => btn.classList.remove('active'));
    
    let filteredRequests = window.allRequests;
    
    // If the button was already active, show all requests (no filter)
    // If not active, apply the filter and make it active
    if (!isAlreadyActive && status) {
        clickedButton.classList.add('active');
        filteredRequests = window.allRequests.filter(request => 
            request.status.toLowerCase() === status
        );
    }
    
    if (filteredRequests.length === 0) {
        requestsList.innerHTML = '<div class="empty-requests">No requests found for the selected status</div>';
    } else {
        requestsList.innerHTML = filteredRequests.map(request => createRequestItem(request)).join('');
    }
}

// Create request item HTML
function createRequestItem(request) {
    const requestDate = new Date(request.created_at).toLocaleDateString();
    const transactionPayee = request.original_data?.payee || 'Unknown';
    const userRole = localStorage.getItem('user_role');
    
    // Get status badge
    const statusBadge = getStatusBadge(request.status);
    
    // Parse the original data and requested changes
    const originalData = typeof request.original_data === 'string' 
        ? JSON.parse(request.original_data) 
        : request.original_data || {};
    const requestedChanges = typeof request.requested_changes === 'string' 
        ? JSON.parse(request.requested_changes) 
        : request.requested_changes || {};
    
    // Check if this is a deletion request
    const requestType = request.request_type || 'modification';
    const isDeletion = requestType === 'deletion';
    
    // Create change details - handle deletion requests differently
    let changeDetails;
    if (isDeletion) {
        const transactionDate = formatDate(originalData.transaction_date);
        changeDetails = `
            <div class="changes-section">
                <div class="changes-title">Requested Changes:</div>
                <div class="change-item">
                    <div class="change-field">Delete Transaction</div>
                    <div class="change-values">
                        <span class="change-from">${transactionDate}</span>
                        <span class="change-arrow">→</span>
                        <span class="change-to">DELETE</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        changeDetails = createChangeDetails(originalData, requestedChanges);
    }
    
    // For marketing clerks, show status and any notes
    let statusInfo = '';
    if (userRole === 'Marketing Clerk') {
        statusInfo = `
            <div class="request-status">
                <span class="status-badge ${request.status.toLowerCase()}">${statusBadge}</span>
                ${request.finance_officer_notes ? `<div class="finance-notes">${request.finance_officer_notes}</div>` : ''}
            </div>
        `;
    }
    
    // Generate request number
    const requestNumber = 'CR-' + request.id.substring(0, 8).toUpperCase();
    
    return `
        <div class="request-item" data-request-id="${request.id}">
            <div class="request-header">
                <span class="request-id">Request #${requestNumber}</span>
                <span class="request-date">${requestDate}</span>
            </div>
            <div class="request-details">
                <strong>Transaction:</strong> ${transactionPayee}
            </div>
            <div class="change-details">
                ${changeDetails}
            </div>
            ${statusInfo}
        </div>
    `;
}

// Create change details HTML showing only changed fields
function createChangeDetails(originalData, requestedChanges) {
    const fieldLabels = {
        'payee': 'Payee',
        'reference': 'Reference',
        'cross_reference': 'Cross Reference',
        'check_number': 'Check Number',
        'cash_in_bank': 'Cash in Bank',
        'loan_receivables': 'Loan Receivables',
        'savings_deposits': 'Savings Deposits',
        'interest_income': 'Interest Income',
        'service_charge': 'Service Charge',
        'sundries': 'Sundries',
        'particulars': 'Particulars',
        'debit': 'Debit Amount',
        'credit': 'Credit Amount',
        'debit_amount': 'Debit Amount',
        'credit_amount': 'Credit Amount',
        'branch_id': 'Branch Id',
        'transaction_date': 'Transaction Date'
    };
    
    const changes = [];
    
    // Only show fields that have actual changes
    Object.keys(requestedChanges).forEach(field => {
        if (requestedChanges[field] !== undefined && requestedChanges[field] !== null) {
            const originalValue = originalData[field];
            const newValue = requestedChanges[field];
            
            // Convert both values to numbers for comparison if they are numeric
            const originalNum = parseFloat(originalValue);
            const newNum = parseFloat(newValue);
            const isNumeric = !isNaN(originalNum) && !isNaN(newNum);
            
            // Only show if the value is actually different
            // For numeric values, compare the parsed numbers
            // For non-numeric values, do string comparison
            const hasChanged = isNumeric ? 
                (originalNum !== newNum) : 
                (originalValue !== newValue);
            
            if (hasChanged) {
                const fieldLabel = fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const formatValue = (value) => {
                    if (value === null || value === undefined || value === '') return 'N/A';
                    if (typeof value === 'number') {
                        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                    return value.toString();
                };
                
                // Handle the case where original data might not exist (new transactions)
                const displayOriginalValue = (originalValue === null || originalValue === undefined || originalValue === '') 
                    ? 'N/A' 
                    : formatValue(originalValue);
                
                changes.push(`
                    <div class="change-item">
                        <div class="change-field">${fieldLabel}</div>
                        <div class="change-values">
                            <span class="change-from">From: ${displayOriginalValue}</span>
                            <span class="change-arrow">→</span>
                            <span class="change-to">To: ${formatValue(newValue)}</span>
                        </div>
                    </div>
                `);
            }
        }
    });
    
    if (changes.length === 0) {
        return '<div class="no-changes">No specific changes detected</div>';
    }
    
    return `
        <div class="changes-section">
            <div class="changes-title">Requested Changes:</div>
            ${changes.join('')}
        </div>
    `;
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusMap = {
        'pending': '<i class="fas fa-clock"></i> Pending',
        'approved': '<i class="fas fa-check"></i> Approved',
        'rejected': '<i class="fas fa-times"></i> Rejected'
    };
    return statusMap[status] || status;
}

// Close pending requests modal
function closePendingRequestsModal() {
    const modal = document.getElementById('pendingRequestsModal');
    if (modal) {
        modal.remove();
    }
}

// Show request submitted message
function showRequestSubmittedMessage() {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="success-icon"><i class="fas fa-check-circle" style="font-size: 24px;"></i></div>
            <div class="message-text">Change request has been submitted successfully</div>
        </div>
    `;
    
    // Add simple styles
    const style = document.createElement('style');
    style.textContent = `
        .simple-message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .simple-message-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        
        .success-icon {
            color: #0B5E1C;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px auto;
        }
        
        .message-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Auto close after 2 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 2000);
}

// Show error message
function showErrorMessage(message) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="error-icon">✗</div>
            <div class="message-text">${message}</div>
        </div>
    `;
    
    // Add simple styles
    const style = document.createElement('style');
    style.textContent = `
        .simple-message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .simple-message-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        
        .error-icon {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: #EF4444;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            margin: 0 auto 16px auto;
            font-family: Arial, sans-serif;
        }
        
        .message-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Auto close after 3 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 3000);
}

// Show success message
function showSuccess(message) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="success-icon"><i class="fas fa-check-circle" style="font-size: 24px;"></i></div>
            <div class="message-text">${message}</div>
        </div>
    `;
    
    // Add simple styles
    const style = document.createElement('style');
    style.textContent = `
        .simple-message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .simple-message-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        
        .success-icon {
            color: #0B5E1C;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px auto;
        }
        
        .message-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Auto close after 2 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 2000);
}

// Show error message (alias for showErrorMessage)
function showError(message) {
    showErrorMessage(message);
}

// ===========================================
// FINANCE OFFICER NOTIFICATION SYSTEM
// ===========================================

// Update finance officer notifications
async function updateFinanceOfficerNotifications() {
    try {
        console.log('=== UPDATE FINANCE OFFICER NOTIFICATIONS ===');
        const userBranchId = localStorage.getItem('user_branch_id');
        const userRole = localStorage.getItem('user_role');
        console.log('User branch ID:', userBranchId);
        console.log('User role:', userRole);
        
        const response = await apiRequest(`/change-requests/count?branch_id=${userBranchId}&status=pending`);
        console.log('API response:', response);
        
        if (response.success) {
            const count = response.count || 0;
            console.log('Request count:', count);
            
            // Update the Pending Requests button count
            const requestCountElement = document.getElementById('requestCount');
            const pendingRequestsBtn = document.getElementById('pendingRequestsBtn');
            console.log('Request count element found:', !!requestCountElement);
            console.log('Pending requests button found:', !!pendingRequestsBtn);
            
            if (requestCountElement && pendingRequestsBtn) {
                if (count > 0) {
                    requestCountElement.textContent = count;
                    requestCountElement.style.display = 'inline-flex';
                    pendingRequestsBtn.style.background = '#46664B';
                    console.log('Updated button with count:', count);
                } else {
                    requestCountElement.style.display = 'none';
                    pendingRequestsBtn.style.background = '#46664B';
                    console.log('No requests, hiding count');
                }
            } else {
                console.error('Button elements not found! Retrying in 1 second...');
                // Retry after 1 second if elements are not found
                setTimeout(() => {
                    const retryRequestCountElement = document.getElementById('requestCount');
                    const retryPendingRequestsBtn = document.getElementById('pendingRequestsBtn');
                    if (retryRequestCountElement && retryPendingRequestsBtn) {
                        if (count > 0) {
                            retryRequestCountElement.textContent = count;
                            retryRequestCountElement.style.display = 'inline-flex';
                            retryPendingRequestsBtn.style.background = '#46664B';
                            console.log('Retry successful - Updated button with count:', count);
                        } else {
                            retryRequestCountElement.style.display = 'none';
                            retryPendingRequestsBtn.style.background = '#46664B';
                            console.log('Retry successful - No requests, hiding count');
                        }
                    } else {
                        console.error('Retry failed - Button elements still not found!');
                    }
                }, 1000);
            }
            
            // Also show notification banner
            showFinanceOfficerNotification(count);
        } else {
            console.error('API response failed:', response);
        }
    } catch (error) {
        console.error('Failed to update finance officer notifications:', error);
    }
}

// Show finance officer notification
function showFinanceOfficerNotification(count) {
    if (count > 0) {
        // Create or update notification banner
        let notificationBanner = document.getElementById('financeOfficerNotification');
        
        if (!notificationBanner) {
            notificationBanner = document.createElement('div');
            notificationBanner.id = 'financeOfficerNotification';
            notificationBanner.className = 'finance-officer-notification';
            
            // Insert at the top of the content area
            const contentArea = document.querySelector('.member-data-content');
            if (contentArea) {
                contentArea.insertBefore(notificationBanner, contentArea.firstChild);
            }
        }
        
        notificationBanner.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="notification-text">
                    <strong>${count} pending change request${count > 1 ? 's' : ''}</strong> require your attention
                </div>
                <button class="notification-action" onclick="showFinanceOfficerRequests()">
                    <i class="fas fa-eye"></i>
                    View Requests
                </button>
                <button class="notification-close" onclick="closeFinanceOfficerNotification()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .finance-officer-notification {
                background: linear-gradient(135deg, #0B5E1C, #69B41E);
                color: white;
                padding: 16px 20px;
                margin-top: -30px;
                margin-bottom: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(11, 94, 28, 0.3);
                animation: slideDown 0.5s ease;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 20px;
                animation: pulse 2s infinite;
            }
            
            .notification-text {
                flex: 1;
                font-size: 14px;
            }
            
            .notification-action {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .notification-action:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-1px);
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.3s ease;
            }
            
            .notification-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @media (max-width: 768px) {
                .finance-officer-notification {
                    margin-top: -20px;
                    margin-bottom: 25px;
                    padding: 12px 16px;
                }
                
                .notification-content {
                    gap: 8px;
                }
                
                .notification-text {
                    font-size: 12px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .notification-action {
                    padding: 6px 12px;
                    font-size: 11px;
                }
            }
            
            @media (max-width: 480px) {
                .finance-officer-notification {
                    margin-top: -15px;
                    margin-bottom: 20px;
                    padding: 10px 12px;
                }
                
                .notification-icon {
                    font-size: 16px;
                }
                
                .notification-text {
                    font-size: 11px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .notification-action {
                    padding: 4px 8px;
                    font-size: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    } else {
        // Remove notification if count is 0
        const notificationBanner = document.getElementById('financeOfficerNotification');
        if (notificationBanner) {
            notificationBanner.remove();
        }
    }
}

// Show finance officer requests
async function showFinanceOfficerRequests(highlightRequestId = null) {
    try {
        console.log('=== SHOW FINANCE OFFICER REQUESTS ===');
        showLoadingState();
        
        const userBranchId = localStorage.getItem('user_branch_id');
        const userRole = localStorage.getItem('user_role');
        const userId = localStorage.getItem('user_id');
        const accessToken = localStorage.getItem('access_token');
        
        console.log('User branch ID:', userBranchId);
        console.log('User role:', userRole);
        console.log('User ID:', userId);
        console.log('Access token exists:', !!accessToken);
        
        const endpoint = `/change-requests?branch_id=${userBranchId}&status=pending`;
        console.log('API endpoint:', endpoint);
        
        const response = await apiRequest(endpoint);
        console.log('API response:', response);
        console.log('Response success:', response.success);
        console.log('Response data:', response.data);
        console.log('Response data length:', response.data ? response.data.length : 'undefined');
        
        // Debug: Let's also try to get all change requests without filters to see if any exist
        try {
            const allRequestsResponse = await apiRequest(`/change-requests?branch_id=${userBranchId}`);
            console.log('All requests (no status filter):', allRequestsResponse);
            
            // Also try without branch filter to see if there are any requests at all
            const allRequestsNoBranchResponse = await apiRequest(`/change-requests`);
            console.log('All requests (no filters):', allRequestsNoBranchResponse);
        } catch (error) {
            console.log('Error fetching all requests:', error);
        }
        
        if (response.success) {
            const requests = response.data || [];
            console.log('Number of requests:', requests.length);
            console.log('Requests data:', requests);
            
            if (requests.length === 0) {
                console.log('No pending requests found');
            } else {
                console.log('Found requests, creating modal...');
                requests.forEach((request, index) => {
                    console.log(`Request ${index + 1}:`, {
                        id: request.id,
                        request_type: request.request_type,
                        reason: request.reason,
                        original_data: request.original_data,
                        requested_changes: request.requested_changes
                    });
                });
            }
            
            createFinanceOfficerRequestsModal(requests, highlightRequestId);
        } else {
            console.error('API response failed:', response);
            throw new Error(response.message || 'Failed to load change requests');
        }
    } catch (error) {
        console.error('Error in showFinanceOfficerRequests:', error);
        showErrorMessage('Failed to load change requests. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// Create finance officer requests modal
function createFinanceOfficerRequestsModal(requests, highlightRequestId = null) {
    console.log('Creating finance officer requests modal with', requests.length, 'requests');
    
    const modal = document.createElement('div');
    modal.id = 'financeOfficerRequestsModal';
    modal.className = 'modal';
    
    let requestsHTML = '';
    if (requests.length === 0) {
        requestsHTML = `
            <div class="empty-requests">
                <i class="fas fa-check-circle" style="color: var(--dark-green); margin-right: 8px; font-size: 24px;"></i>
                <div>No pending change requests requiring your approval</div>
                <div style="margin-top: 10px; font-size: 12px; color: var(--gray-500);">
                    Change requests will appear here when Marketing Clerks request modifications to transactions.
                </div>
            </div>
        `;
        console.log('No requests found, showing empty state');
    } else {
        console.log('Generating HTML for', requests.length, 'requests');
        requestsHTML = requests.map(request => {
            console.log('Processing request:', request.id);
            return createFinanceOfficerRequestItem(request);
        }).join('');
        console.log('Generated HTML length:', requestsHTML.length);
    }
    
    modal.innerHTML = `
        <div class="modal-content finance-officer-requests-modal">
            <div class="modal-header">
                <h3 style="font-size: 18px;">Pending Change Requests</h3>
                <button type="button" class="close-btn" onclick="closeFinanceOfficerRequestsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="requests-list">
                    ${requestsHTML}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeFinanceOfficerRequestsModal()">
                    <i class="fas fa-times"></i>
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .finance-officer-requests-modal {
            max-width: 600px;
            width: 90%;
        }
        
        .finance-officer-requests-modal .modal-body {
            padding-top: 30px; /* Add space for the "Take Action" banner */
        }
        
        /* Mobile responsive styles for the banner */
        @media (max-width: 768px) {
            .finance-officer-requests-modal .modal-body {
                padding-top: 20px; /* Reduced padding to prevent overlap */
            }
            
            .highlighted-request {
                position: relative;
                margin-top: 20px; /* More space above the highlighted request */
            }
            
            .highlighted-request::before {
                content: '👉 Action';
                position: absolute;
                top: -8px; /* Closer to container to prevent overlap */
                left: 50%;
                transform: translateX(-50%);
                padding: 3px 8px;
                font-size: 9px;
                border-radius: 8px;
                z-index: 20;
            }
        }
        
        @media (max-width: 480px) {
            .finance-officer-requests-modal .modal-body {
                padding-top: 15px; /* Minimal padding on very small screens */
            }
            
            .highlighted-request {
                position: relative;
                margin-top: 18px; /* Adequate space above the highlighted request */
            }
            
            .highlighted-request::before {
                content: '👉';
                position: absolute;
                top: -6px; /* Very close to container */
                left: 50%;
                transform: translateX(-50%);
                padding: 2px 6px;
                font-size: 8px;
                border-radius: 6px;
                z-index: 20;
            }
        }
        
        .finance-officer-request-item {
            background: var(--gray-50);
            border: 1px solid var(--gray-200);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            transition: all 0.3s ease;
        }
        
        .finance-officer-request-item:hover {
            background: var(--white);
            border-color: var(--orange);
            box-shadow: 0 2px 8px rgba(255, 167, 38, 0.1);
        }
        
        .request-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .request-id {
            font-weight: 400;
            color: var(--gray-500);
            font-size: 12px;
        }
        
        .request-date {
            font-size: 12px;
            color: var(--gray-600);
        }
        
        .request-subject {
            font-size: 14px;
            color: var(--dark-green);
            font-weight: 500;
            margin-bottom: 12px;
        }
        
        .request-details {
            font-size: 14px;
            color: var(--gray-700);
            margin-bottom: 8px;
        }
        
        .request-reason {
            font-size: 13px;
            color: var(--gray-600);
            font-style: italic;
            margin-bottom: 12px;
        }
        
        .change-details {
            margin: 12px 0;
        }
        
        .changes-section {
            margin-bottom: 8px;
        }
        
        .changes-title {
            font-weight: 600;
            color: var(--dark-green);
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .change-item {
            margin-bottom: 8px;
            padding: 8px;
            background: white;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }
        
        .change-field {
            font-weight: 600;
            color: var(--gray-700);
            margin-bottom: 4px;
            font-size: 13px;
        }
        
        .change-values {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }
        
        .change-from {
            color: #dc2626;
            background: #fef2f2;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        .change-arrow {
            color: var(--orange);
            font-weight: bold;
        }
        
        .change-to {
            color: #059669;
            background: #f0fdf4;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        .no-changes {
            text-align: center;
            color: var(--gray-500);
            font-style: italic;
            padding: 8px;
        }
        
        .requested-by-info {
            font-size: 13px;
            color: var(--gray-600);
            margin: 8px 0;
        }
        
        .request-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }
        
        .btn-approve {
            background: var(--dark-green);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-approve:hover {
            background: #0A4F18;
            transform: translateY(-1px);
        }
        
        .btn-reject {
            background: var(--red);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-reject:hover {
            background: #DC2626;
            transform: translateY(-1px);
        }
        
        .empty-requests {
            text-align: center;
            padding: 40px;
            color: var(--gray-600);
            font-style: italic;
        }
        
        /* Highlighted request animation */
        .highlighted-request {
            animation: glowPulse 2s ease-in-out infinite;
            border: 2px solid var(--orange) !important;
            box-shadow: 0 0 20px rgba(255, 167, 38, 0.6) !important;
            position: relative;
            z-index: 10;
        }
        
        @keyframes glowPulse {
            0%, 100% {
                box-shadow: 0 0 20px rgba(255, 167, 38, 0.6),
                            0 0 30px rgba(255, 167, 38, 0.4);
            }
            50% {
                box-shadow: 0 0 30px rgba(255, 167, 38, 0.8),
                            0 0 40px rgba(255, 167, 38, 0.6);
            }
        }
        
        /* Add a "focus on this" badge */
        .highlighted-request::before {
            content: '👉 Take Action';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--orange);
            color: white;
            padding: 4px 12px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(255, 167, 38, 0.4);
            z-index: 20;
        }
        
        /* Dimmed non-target requests */
        .dimmed-request {
            opacity: 0.5;
            pointer-events: none; /* Prevent interaction */
        }
        
        /* Deletion request specific styles */
        .deletion-request {
            /* Removed red left border */
        }
        
        .deletion-badge {
            background: #FEE2E2;
            color: #DC2626;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        
        .deletion-warning {
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 6px;
            padding: 10px;
            margin: 12px 0;
            color: #DC2626;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .deletion-warning i {
            font-size: 16px;
        }
        
        .transaction-details {
            font-size: 13px;
            color: var(--gray-700);
            margin-bottom: 12px;
            padding: 8px;
            background: #F9FAFB;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    console.log('Finance officer modal added to DOM, modal element:', modal);
    console.log('Modal innerHTML length:', modal.innerHTML.length);
    
    // After modal is added to DOM, apply highlighting if needed
    if (highlightRequestId) {
        setTimeout(() => {
            highlightAndLockRequest(highlightRequestId);
        }, 100); // Small delay to ensure DOM is ready
    }
}

// Highlight and lock specific request
function highlightAndLockRequest(requestId) {
    console.log('🎯 Highlighting and locking request:', requestId);
    
    // Find all request items
    const allRequestItems = document.querySelectorAll('.finance-officer-request-item');
    
    allRequestItems.forEach(item => {
        const itemRequestId = item.getAttribute('data-request-id');
        
        if (itemRequestId === requestId) {
            // This is the target request - highlight it
            item.classList.add('highlighted-request');
            
            // Scroll into view
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            console.log('✅ Highlighted request:', requestId);
        } else {
            // This is not the target - disable its buttons
            const approveBtn = item.querySelector('.btn-approve');
            const rejectBtn = item.querySelector('.btn-reject');
            
            if (approveBtn) {
                approveBtn.disabled = true;
                approveBtn.style.opacity = '0.5';
                approveBtn.style.cursor = 'not-allowed';
                approveBtn.title = 'Please complete the highlighted request first';
            }
            
            if (rejectBtn) {
                rejectBtn.disabled = true;
                rejectBtn.style.opacity = '0.5';
                rejectBtn.style.cursor = 'not-allowed';
                rejectBtn.title = 'Please complete the highlighted request first';
            }
            
            // Add a dimmed class to the entire item
            item.classList.add('dimmed-request');
        }
    });
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount || 0);
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Create finance officer request item HTML
function createFinanceOfficerRequestItem(request) {
    console.log('Creating request item for:', request);
    
    const requestDate = new Date(request.created_at).toLocaleDateString();
    const transactionPayee = request.original_data?.payee || 'Unknown';
    const requestedBy = `${request.requested_by_first_name || ''} ${request.requested_by_last_name || ''}`.trim() || 'Unknown';
    
    console.log('Request details:', {
        date: requestDate,
        payee: transactionPayee,
        requestedBy: requestedBy,
        requestType: request.request_type,
        reason: request.reason
    });
    
    const requestType = request.request_type || 'modification';
    const isDeletion = requestType === 'deletion';
    
    // Parse the original data and requested changes for detailed display
    const originalData = typeof request.original_data === 'string' 
        ? JSON.parse(request.original_data) 
        : request.original_data;
    const requestedChanges = typeof request.requested_changes === 'string' 
        ? JSON.parse(request.requested_changes) 
        : request.requested_changes;
    
    // For deletion requests, show similar UI to modification but with delete content
    if (isDeletion) {
        return `
            <div class="finance-officer-request-item deletion-request" data-request-id="${request.id}">
                <div class="request-header">
                    <span class="request-id">Request #${request.id.substring(0, 8)}</span>
                    <span class="request-date">${requestDate}</span>
                </div>
                <div class="request-details">
                    <strong>Transaction:</strong> ${transactionPayee}
                </div>
                <div class="change-details">
                    <div class="changes-section">
                        <div class="changes-title">Requested Changes:</div>
                        <div class="change-item">
                            <div class="change-field">Delete Transaction</div>
                            <div class="change-values">
                                <span class="change-from">${formatDate(originalData.transaction_date)}</span>
                                <span class="change-arrow">→</span>
                                <span class="change-to">DELETE</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="requested-by-info">
                    <strong>Requested by:</strong> ${requestedBy}
                </div>
                <div class="request-reason">
                    Transaction modification requested by marketing clerk
                </div>
                <div class="deletion-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    Warning: Approving this request will permanently delete the transaction
                </div>
                <div class="request-actions">
                    <button class="btn-approve" onclick="approveDeleteRequest('${request.id}')">
                        <i class="fas fa-check"></i>
                        Approve
                    </button>
                    <button class="btn-reject" onclick="rejectDeleteRequest('${request.id}')">
                        <i class="fas fa-times"></i>
                        Reject
                    </button>
                </div>
            </div>
        `;
    }
    
    // For modification requests, show existing UI
    const changeDetails = createChangeDetails(originalData, requestedChanges);
    console.log('Change details:', changeDetails);
    
    return `
        <div class="finance-officer-request-item" data-request-id="${request.id}">
            <div class="request-header">
                <span class="request-id">Request #${request.id.substring(0, 8)}</span>
                <span class="request-date">${requestDate}</span>
            </div>
            <div class="request-details">
                <strong>Transaction:</strong> ${transactionPayee}
            </div>
            <div class="change-details">
                ${changeDetails}
            </div>
            <div class="requested-by-info">
                <strong>Requested by:</strong> ${requestedBy}
            </div>
            <div class="request-reason">
                ${request.reason || 'No reason provided'}
            </div>
            <div class="request-actions">
                <button class="btn-approve" onclick="approveChangeRequest('${request.id}')">
                    <i class="fas fa-check"></i>
                    Approve
                </button>
                <button class="btn-reject" onclick="rejectChangeRequest('${request.id}')">
                    <i class="fas fa-times"></i>
                    Reject
                </button>
            </div>
        </div>
    `;
}

// Approve change request
async function approveChangeRequest(requestId) {
    try {
        console.log('Approving change request:', requestId);
        showLoadingState();
        
        const response = await apiRequest(`/change-requests/${requestId}/process`, {
            method: 'POST'
        });
        
        console.log('Approval response:', response);
        
        if (response.success) {
            // Clear URL parameter if present
            window.history.replaceState({}, document.title, 'memberdata.html');
            
            closeFinanceOfficerRequestsModal();
            await updateFinanceOfficerNotifications();
            showRequestProcessedMessage('approved');
        } else {
            throw new Error(response.message || 'Failed to approve change request');
        }
    } catch (error) {
        console.error('Error approving change request:', error);
        showErrorMessage('Failed to approve change request. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// Reject change request
async function rejectChangeRequest(requestId) {
    try {
        showLoadingState();
        
        const response = await apiRequest(`/change-requests/${requestId}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'rejected',
                finance_officer_notes: 'Change request rejected by finance officer'
            })
        });
        
        if (response.success) {
            // Clear URL parameter if present
            window.history.replaceState({}, document.title, 'memberdata.html');
            
            closeFinanceOfficerRequestsModal();
            await updateFinanceOfficerNotifications();
            showRequestProcessedMessage('rejected');
        } else {
            throw new Error(response.message || 'Failed to reject change request');
        }
    } catch (error) {
        showErrorMessage('Failed to reject change request. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// Close finance officer requests modal
function closeFinanceOfficerRequestsModal() {
    const modal = document.getElementById('financeOfficerRequestsModal');
    if (modal) {
        modal.remove();
    }
}

// Close finance officer notification
function closeFinanceOfficerNotification() {
    const notification = document.getElementById('financeOfficerNotification');
    if (notification) {
        notification.remove();
    }
}

// Approve delete request
async function approveDeleteRequest(requestId) {
    try {
        showLoadingState();
        
        // First, get the delete request to find transaction ID
        const requestResponse = await apiRequest(`/change-requests/${requestId}`);
        
        if (requestResponse.success && requestResponse.data) {
            const request = requestResponse.data;
            const transactionId = request.transaction_id;
            
            // Delete the actual transaction
            const deleteResponse = await apiRequest(`/transactions/${transactionId}`, {
                method: 'DELETE'
            });
            
            if (deleteResponse.success) {
                // Update the change request status to approved
                const updateResponse = await apiRequest(`/change-requests/${requestId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        status: 'approved',
                        finance_officer_notes: 'Delete request approved - transaction deleted'
                    })
                });
                
                if (updateResponse.success) {
                    window.history.replaceState({}, document.title, 'memberdata.html');
                    closeFinanceOfficerRequestsModal();
                    await updateFinanceOfficerNotifications();
                    showRequestProcessedMessage('approved and transaction deleted');
                }
            }
        }
    } catch (error) {
        console.error('Error approving delete request:', error);
        showErrorMessage('Failed to approve delete request. Please try again.');
    } finally {
        hideLoadingState();
    }
}

// Reject delete request
async function rejectDeleteRequest(requestId) {
    try {
        showLoadingState();
        
        const response = await apiRequest(`/change-requests/${requestId}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'rejected',
                finance_officer_notes: 'Delete request rejected - transaction preserved'
            })
        });
        
        if (response.success) {
            window.history.replaceState({}, document.title, 'memberdata.html');
            closeFinanceOfficerRequestsModal();
            await updateFinanceOfficerNotifications();
            showRequestProcessedMessage('rejected - transaction preserved');
        }
    } catch (error) {
        console.error('Error rejecting delete request:', error);
        showErrorMessage('Failed to reject delete request. Please try again.');
    } finally {
        hideLoadingState();
    }
}


// Show request processed message
function showRequestProcessedMessage(action) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="success-icon"><i class="fas fa-check-circle" style="font-size: 24px;"></i></div>
            <div class="message-text">Change request has been ${action} successfully</div>
        </div>
    `;
    
    // Add simple styles
    const style = document.createElement('style');
    style.textContent = `
        .simple-message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .simple-message-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        
        .success-icon {
            color: #0B5E1C;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px auto;
        }
        
        .message-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Auto close after 2 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 2000);
}

