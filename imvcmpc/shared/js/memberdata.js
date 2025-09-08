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
        const userBranch = localStorage.getItem('user_branch_name') || 'Main Branch';
        userNameElement.textContent = 'Marketing Clerk';
        userRoleElement.textContent = `IMVCMPC - ${userBranch}`;
    }
}

// Sample transaction data (empty for now as requested)
let transactions = [
    // Add a few sample transactions to demonstrate scroll functionality
    {
        id: 1,
        date: '2024-01-15',
        payee: 'Sample Member 1',
        reference: 'REF001',
        crossReference: 'CR001',
        checkNumber: 'CHK001',
        particulars: 'Initial savings deposit',
        debit: 0,
        credit: 5000,
        cashInBank: 5000,
        loanReceivables: 0,
        savingsDeposits: 5000,
        interestIncome: 0,
        serviceCharge: 0,
        sundries: 0
    },
    {
        id: 2,
        date: '2024-01-16',
        payee: 'Sample Member 2',
        reference: 'REF002',
        crossReference: 'CR002',
        checkNumber: 'CHK002',
        particulars: 'Loan disbursement',
        debit: 10000,
        credit: 0,
        cashInBank: -10000,
        loanReceivables: 10000,
        savingsDeposits: 0,
        interestIncome: 0,
        serviceCharge: 0,
        sundries: 0
    }
];

let currentTransactions = [...transactions];
let editingTransactionId = null;
let currentZoom = 90;

// Initialize transaction ledger
function initializeTransactionLedger() {
    // Ensure DOM is ready
    setTimeout(() => {
        renderTransactionTable();
        setDefaultDate();
        initializeScrollControls();
        setupScrollButtons(); // Setup scroll button event listeners
        // Make sure scroll functions are available
        window.scrollLeft = scrollLeft;
        window.scrollRight = scrollRight;
        console.log('Scroll functions initialized');
    }, 100);
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
        <tr>
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.payee}</td>
            <td>${transaction.reference || ''}</td>
            <td>${transaction.crossReference || ''}</td>
            <td>${transaction.checkNumber || ''}</td>
            <td>${formatAmount(transaction.cashInBank)}</td>
            <td>${formatAmount(transaction.loanReceivables)}</td>
            <td>${formatAmount(transaction.savingsDeposits)}</td>
            <td>${formatAmount(transaction.interestIncome)}</td>
            <td>${formatAmount(transaction.serviceCharge)}</td>
            <td>${formatAmount(transaction.sundries)}</td>
            <td>${transaction.particulars}</td>
            <td>${formatAmount(transaction.debit)}</td>
            <td>${formatAmount(transaction.credit)}</td>
        </tr>
    `).join('');
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

// Open add transaction form
function openAddTransactionForm() {
    editingTransactionId = null;
    document.getElementById('transactionFormTitle').textContent = 'Add Transaction';
    document.getElementById('transactionForm').reset();
    setDefaultDate();
    document.getElementById('transactionFormDialog').style.display = 'flex';
}

// Save transaction
function saveTransaction() {
    const date = document.getElementById('transactionDate').value;
    const payee = document.getElementById('transactionPayee').value.trim();
    const reference = document.getElementById('transactionReference').value.trim();
    const crossReference = document.getElementById('transactionCrossRef').value.trim();
    const checkNumber = document.getElementById('transactionCheck').value.trim();
    const particulars = document.getElementById('transactionParticulars').value.trim();
    const debit = parseFloat(document.getElementById('transactionDebit').value) || 0;
    const credit = parseFloat(document.getElementById('transactionCredit').value) || 0;
    
    if (!date || !payee || !particulars) {
        alert('Please fill in all required fields (Date, Payee, Particulars).');
        return;
    }
    
    if (debit === 0 && credit === 0) {
        alert('Please enter either a debit or credit amount.');
        return;
    }
    
    const newTransaction = {
        id: Date.now(),
        date,
        payee,
        reference,
        crossReference,
        checkNumber,
        particulars,
        debit,
        credit,
        // Calculate account balances based on transaction type
        cashInBank: calculateCashInBank(debit, credit, particulars),
        loanReceivables: calculateLoanReceivables(debit, credit, particulars),
        savingsDeposits: calculateSavingsDeposits(debit, credit, particulars),
        interestIncome: calculateInterestIncome(debit, credit, particulars),
        serviceCharge: calculateServiceCharge(debit, credit, particulars),
        sundries: calculateSundries(debit, credit, particulars)
    };
    
    if (editingTransactionId) {
        // Update existing transaction
        const transactionIndex = transactions.findIndex(t => t.id === editingTransactionId);
        if (transactionIndex !== -1) {
            transactions[transactionIndex] = newTransaction;
        }
    } else {
        // Add new transaction
        transactions.push(newTransaction);
    }
    
    currentTransactions = [...transactions];
    renderTransactionTable();
    closeTransactionForm();
    
    showSuccessMessage(editingTransactionId ? 'Transaction updated successfully!' : 'Transaction added successfully!');
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
        
        // Adjust container to accommodate scaled table
        const baseHeight = 60; // 60vh base height
        const newHeight = baseHeight * scale;
        tableContainer.style.maxHeight = `${newHeight}vh`;
        
        // Ensure proper spacing and prevent cutting
        tableContainer.style.overflow = 'hidden';
        
        // Maintain consistent padding regardless of zoom
        tableContainer.style.padding = '16px';
        
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