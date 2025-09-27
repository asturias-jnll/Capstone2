// Transaction Ledger System
document.addEventListener('DOMContentLoaded', function() {
    initializeTransactionLedger();
    initializeDynamicUserHeader();
    setupEventListeners();
    
    // Test scroll functions
    setTimeout(() => {
        console.log('Testing scroll functions...');
        console.log('scrollLeft function:', typeof window.scrollLeft);
        console.log('scrollRight function:', typeof window.scrollRight);
    }, 500);
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

// Initialize transaction ledger
function initializeTransactionLedger() {
    // Ensure DOM is ready
    setTimeout(() => {
        // Check user access and hide/show transaction controls accordingly
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        const userRole = localStorage.getItem('user_role');
        
        // Hide Add Transaction button for Finance Officer role
        const addTransactionBtn = document.querySelector('.add-transaction-btn');
        if (addTransactionBtn) {
            if (userRole === 'Finance Officer') {
                addTransactionBtn.style.display = 'none';
            } else {
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
        console.log('Scroll functions initialized');
    }, 100);
}

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api/auth';

// Get authentication token
function getAuthToken() {
    return localStorage.getItem('access_token');
}

// Automatic login function for member data page
async function autoLogin() {
    try {
        console.log('🔐 Attempting automatic login for member data...');
        
        // Try to login with the test analytics user
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'test.analytics',
                password: 'Test12345!'
            })
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.tokens && result.tokens.access_token) {
            // Store the token in localStorage
            localStorage.setItem('access_token', result.tokens.access_token);
            console.log('✅ Automatic login successful!');
            return result.tokens.access_token;
        } else {
            throw new Error('Invalid login response');
        }
    } catch (error) {
        console.error('❌ Automatic login failed:', error.message);
        return null;
    }
}

// Ensure authentication token is available
async function ensureAuthToken() {
    let token = getAuthToken();
    
    if (!token) {
        console.log('🔑 No auth token found, attempting automatic login...');
        token = await autoLogin();
    }
    
    if (!token) {
        throw new Error('Unable to authenticate. Please check your login credentials.');
    }
    
    return token;
}

// API Helper function
async function apiRequest(endpoint, options = {}) {
    try {
        const token = await ensureAuthToken();
        const url = `${API_BASE_URL}${endpoint}`;
        
        console.log(`🌐 Making API request to: ${url}`);
        console.log(`🔑 Using token: ${token ? 'Present' : 'Missing'}`);
        console.log(`📋 Request options:`, options);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const config = { ...defaultOptions, ...options };
        console.log(`🔧 Final config:`, config);
        
        const response = await fetch(url, config);
        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.log(`📄 Non-JSON response:`, text);
            throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`📊 Response data:`, data);
        
        if (!response.ok) {
            throw new Error(data.message || data.error || `API request failed with status ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error Details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

// Load transactions from database
async function loadTransactionsFromDatabase() {
    try {
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        const userRole = localStorage.getItem('user_role');
        const userBranchId = localStorage.getItem('user_branch_id');
        const userBranchName = localStorage.getItem('user_branch_name');
        
        console.log('🔍 Branch information:', {
            userBranchId,
            userBranchName,
            isMainBranchUser,
            userRole
        });
        
        // Validate that we have branch information
        if (!userBranchId) {
            throw new Error('Branch information not found. Please log in again.');
        }

        showLoadingState();
        
        // Test server connection first
        console.log('🔍 Testing server connection...');
        try {
            const healthResponse = await fetch('http://localhost:3001/health');
            const healthData = await healthResponse.json();
            console.log('✅ Server health check:', healthData);
        } catch (healthError) {
            console.error('❌ Server health check failed:', healthError);
            throw new Error('Server is not running. Please start the server on port 3001.');
        }
        
        // Always include branch_id in the request for proper data isolation
        console.log(`📡 Fetching transactions for branch_id: ${userBranchId}`);
        const response = await apiRequest(`/transactions?branch_id=${userBranchId}`);
        
        console.log('📊 API Response:', response);
        
        if (response.success) {
            transactions = response.data || [];
            currentTransactions = [...transactions];
            renderTransactionTable();
            
            // Show branch-specific success message
            const branchInfo = isMainBranchUser ? 'Main Branch' : userBranchName;
            showNotification(`Transactions loaded successfully for ${branchInfo}`, 'success');
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
        
        showNotification(`Failed to load transactions: ${errorMessage}`, 'error');
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
    // Transaction form submission
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveTransaction();
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
    
    // Check user role to determine if edit button should be shown
    const userRole = localStorage.getItem('user_role');
    const isFinanceOfficer = userRole === 'Finance Officer';
    
    // Create edit button HTML conditionally
    const editButtonHtml = isFinanceOfficer ? '' : `
                <button class="btn btn-warning" onclick="editTransaction()">
                    <i class="fas fa-edit"></i>
                    Edit
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
                                <span id="modalDate"></span>
                            </div>
                            <div class="detail-item">
                                <label>Payee</label>
                                <span id="modalPayee"></span>
                            </div>
                            <div class="detail-item">
                                <label>Reference</label>
                                <span id="modalReference"></span>
                            </div>
                            <div class="detail-item">
                                <label>Cross Reference</label>
                                <span id="modalCrossReference"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4 class="section-title">Transaction Details</h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <label>Check Number</label>
                                <span id="modalCheckNumber"></span>
                            </div>
                            <div class="detail-item">
                                <label>Particulars</label>
                                <span id="modalParticulars"></span>
                            </div>
                            <div class="detail-item">
                                <label>Debit Amount</label>
                                <span id="modalDebit" class="amount"></span>
                            </div>
                            <div class="detail-item">
                                <label>Credit Amount</label>
                                <span id="modalCredit" class="amount"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4 class="section-title">Account Balances</h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <label>Cash in Bank</label>
                                <span id="modalCashInBank" class="amount"></span>
                            </div>
                            <div class="detail-item">
                                <label>Loan Receivables</label>
                                <span id="modalLoanReceivables" class="amount"></span>
                            </div>
                            <div class="detail-item">
                                <label>Savings Deposits</label>
                                <span id="modalSavingsDeposits" class="amount"></span>
                            </div>
                            <div class="detail-item">
                                <label>Interest Income</label>
                                <span id="modalInterestIncome" class="amount"></span>
                            </div>
                            <div class="detail-item">
                                <label>Service Charge</label>
                                <span id="modalServiceCharge" class="amount"></span>
                            </div>
                            <div class="detail-item">
                                <label>Sundries</label>
                                <span id="modalSundries" class="amount"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeTransactionModal()">
                    <i class="fas fa-times"></i>
                    Close
                </button>
                ${editButtonHtml}
                <button class="btn btn-danger" onclick="deleteTransaction()">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .transaction-details-modal {
            max-width: 800px;
            width: 90%;
            background: var(--white);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            border: 1px solid var(--gray-100);
            overflow: hidden;
        }
        
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
            color: var(--gray-600);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
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
        
        @media (max-width: 768px) {
            .transaction-details-modal {
                max-width: 95%;
                margin: 20px;
            }
            
            .details-grid {
                grid-template-columns: 1fr;
            }
            
            .modal-footer {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
    
    return modal;
}

// Populate transaction modal with data
function populateTransactionModal(transaction) {
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
}

// Close transaction modal
function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.style.display = 'none';
        window.currentTransaction = null;
    }
}

// Edit transaction
function editTransaction() {
    if (!window.currentTransaction) return;
    
    // Check user role and prevent Finance Officers from editing
    const userRole = localStorage.getItem('user_role');
    if (userRole === 'Finance Officer') {
        showNotification('Finance Officers cannot edit transactions', 'error');
        return;
    }
    
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    closeTransactionModal();
    
    // Populate the form with current transaction data
    const transaction = window.currentTransaction;
    
    document.getElementById('transactionDate').value = transaction.transaction_date || transaction.date;
    document.getElementById('payee').value = transaction.payee;
    document.getElementById('reference').value = transaction.reference || '';
    document.getElementById('crossReference').value = transaction.cross_reference || transaction.crossReference || '';
    document.getElementById('checkNumber').value = transaction.check_number || transaction.checkNumber || '';
    document.getElementById('particulars').value = transaction.particulars;
    document.getElementById('debitAmount').value = transaction.debit_amount || transaction.debit || '';
    document.getElementById('creditAmount').value = transaction.credit_amount || transaction.credit || '';
    
    // Populate account balance fields
    document.getElementById('cashInBank').value = transaction.cash_in_bank || transaction.cashInBank || '';
    document.getElementById('loanReceivables').value = transaction.loan_receivables || transaction.loanReceivables || '';
    document.getElementById('savingsDeposits').value = transaction.savings_deposits || transaction.savingsDeposits || '';
    document.getElementById('interestIncome').value = transaction.interest_income || transaction.interestIncome || '';
    document.getElementById('serviceCharge').value = transaction.service_charge || transaction.serviceCharge || '';
    document.getElementById('sundries').value = transaction.sundries || '';
    
    // Set editing mode
    editingTransactionId = transaction.id;
    
    // Show form if hidden
    const form = document.getElementById('transactionForm');
    if (form) {
        form.style.display = 'block';
    }
    
    showNotification('Transaction loaded for editing', 'info');
}

// Delete transaction
async function deleteTransaction() {
    if (!window.currentTransaction) return;
    
    // Allow all users to delete transactions (main branch, non-main branch, admin, finance officer)
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    const userRole = localStorage.getItem('user_role');
    
    // Removed access restriction - all users can now delete transactions
    
    const confirmed = confirm('Are you sure you want to delete this transaction? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
        showLoadingState();
        const response = await apiRequest(`/transactions/${window.currentTransaction.id}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification('Transaction deleted successfully', 'success');
            closeTransactionModal();
            await loadTransactionsFromDatabase(); // Reload data
        } else {
            throw new Error(response.message || 'Failed to delete transaction');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotification('Failed to delete transaction', 'error');
    } finally {
        hideLoadingState();
    }
}

// Open add transaction form
function openAddTransactionForm() {
    const userRole = localStorage.getItem('user_role');
    
    // Prevent Finance Officers from accessing the add transaction form
    if (userRole === 'Finance Officer') {
        showNotification('Finance Officers cannot add transactions', 'error');
        return;
    }

    editingTransactionId = null;
    document.getElementById('transactionFormTitle').textContent = 'Add Transaction';
    document.getElementById('transactionForm').reset();
    setDefaultDate();
    document.getElementById('transactionFormDialog').style.display = 'flex';
}

// Save transaction
async function saveTransaction() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    const userRole = localStorage.getItem('user_role');
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    
    // Validate branch information
    if (!userBranchId) {
        showNotification('Branch information not found. Please log in again.', 'error');
        return;
    }

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
    
    if (!date || !payee || !particulars) {
        alert('Please fill in all required fields (Date, Payee, Particulars).');
        return;
    }
    
    if (debit === 0 && credit === 0) {
        alert('Please enter either a debit or credit amount.');
        return;
    }
    
    const transactionData = {
        transaction_date: date,
        payee,
        reference,
        cross_reference: crossReference,
        check_number: checkNumber,
        particulars,
        debit_amount: debit,
        credit_amount: credit,
        // Use form values for account balances
        cash_in_bank: cashInBank,
        loan_receivables: loanReceivables,
        savings_deposits: savingsDeposits,
        interest_income: interestIncome,
        service_charge: serviceCharge,
        sundries: sundries,
        // Include branch_id for proper data isolation
        branch_id: parseInt(userBranchId)
    };
    
    try {
        showLoadingState();
        
        if (editingTransactionId) {
            // Update existing transaction
            const response = await apiRequest(`/transactions/${editingTransactionId}`, {
                method: 'PUT',
                body: JSON.stringify(transactionData)
            });
            
            if (response.success) {
                const branchInfo = isMainBranchUser ? 'Main Branch' : userBranchName;
                showNotification(`Transaction updated successfully for ${branchInfo}!`, 'success');
            } else {
                throw new Error(response.message || 'Failed to update transaction');
            }
        } else {
            // Add new transaction
            const response = await apiRequest('/transactions', {
                method: 'POST',
                body: JSON.stringify(transactionData)
            });
            
            if (response.success) {
                const branchInfo = isMainBranchUser ? 'Main Branch' : userBranchName;
                showNotification(`Transaction added successfully for ${branchInfo}!`, 'success');
            } else {
                throw new Error(response.message || 'Failed to create transaction');
            }
        }
        
        // Reload transactions from database
        await loadTransactionsFromDatabase();
        closeTransactionForm();
        
    } catch (error) {
        console.error('Error saving transaction:', error);
        showNotification('Failed to save transaction', 'error');
    } finally {
        hideLoadingState();
    }
}

// Calculate account balances based on transaction type
function calculateCashInBank(debit, credit, particulars) {
    const particularsLower = particulars.toLowerCase();
    if (particularsLower.includes('deposit') || particularsLower.includes('savings')) {
        return credit;
    } else if (particularsLower.includes('loan') || particularsLower.includes('disbursement')) {
        return -debit;
    }
    return 0;
}

function calculateLoanReceivables(debit, credit, particulars) {
    const particularsLower = particulars.toLowerCase();
    if (particularsLower.includes('loan') || particularsLower.includes('disbursement')) {
        return debit;
    } else if (particularsLower.includes('repayment') || particularsLower.includes('payment')) {
        return -credit;
    }
    return 0;
}

function calculateSavingsDeposits(debit, credit, particulars) {
    const particularsLower = particulars.toLowerCase();
    if (particularsLower.includes('savings') || particularsLower.includes('deposit')) {
        return credit;
    }
    return 0;
}

function calculateInterestIncome(debit, credit, particulars) {
    const particularsLower = particulars.toLowerCase();
    if (particularsLower.includes('interest')) {
        return credit;
    }
    return 0;
}

function calculateServiceCharge(debit, credit, particulars) {
    const particularsLower = particulars.toLowerCase();
    if (particularsLower.includes('service') || particularsLower.includes('fee')) {
        return credit;
    }
    return 0;
}

function calculateSundries(debit, credit, particulars) {
    const particularsLower = particulars.toLowerCase();
    if (particularsLower.includes('misc') || particularsLower.includes('other')) {
        return credit;
    }
    return 0;
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
            console.log('LEFT ARROW CLICKED!');
            console.log('Before scroll:', tableContainer.scrollLeft);
            tableContainer.scrollLeft -= 200;
            console.log('After scroll:', tableContainer.scrollLeft);
            updateScrollThumb();
        });
        console.log('Left button event listener added');
    }
    
    if (rightBtn && tableContainer) {
        rightBtn.addEventListener('click', function() {
            console.log('RIGHT ARROW CLICKED!');
            console.log('Before scroll:', tableContainer.scrollLeft);
            tableContainer.scrollLeft += 200;
            console.log('After scroll:', tableContainer.scrollLeft);
            updateScrollThumb();
        });
        console.log('Right button event listener added');
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
            console.log(`Zoom ${currentZoom}% - full green bar (50% or below)`);
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
            
            console.log(`Zoom: ${currentZoom}%, Thumb: ${thumbWidthPercentage.toFixed(1)}%, Width: ${thumbWidth.toFixed(1)}px`);
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

// Search payee function
function searchPayee() {
    const searchInput = document.getElementById('payeeSearch');
    const searchTerm = searchInput.value.toLowerCase();
    const tableRows = document.querySelectorAll('.transaction-table tbody tr');
    
    tableRows.forEach(row => {
        const payeeCell = row.cells[1]; // Payee is the second column (index 1)
        if (payeeCell) {
            const payeeText = payeeCell.textContent.toLowerCase();
            if (payeeText.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    console.log(`Searching for: "${searchTerm}"`);
}

// Show success message
function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
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

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
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
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Get notification icon
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
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