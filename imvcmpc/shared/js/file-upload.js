// ==================== FILE UPLOAD FUNCTIONALITY ====================

// Global variables for file upload
let uploadedFileData = null;
let validTransactions = [];
let invalidTransactions = [];
let uploadValidationErrors = [];
let currentUploadFileName = '';
let currentUploadTotalRows = 0;

// Show upload button for Marketing Clerks only
document.addEventListener('DOMContentLoaded', function() {
    const userRole = localStorage.getItem('user_role');
    const uploadBtn = document.getElementById('uploadTransactionsBtn');
    
    if (uploadBtn && userRole === 'Marketing Clerk') {
        uploadBtn.style.display = 'flex';
    }
    
    // Setup drag and drop
    setupDragAndDrop();
});

// Open upload modal
function openUploadModal() {
    const modal = document.getElementById('uploadTransactionsModal');
    if (modal) {
        modal.style.display = 'flex';
        resetUploadModal();
    }
}

// Close upload modal
function closeUploadModal() {
    const modal = document.getElementById('uploadTransactionsModal');
    if (modal) {
        modal.style.display = 'none';
        resetUploadModal();
    }
}

// Reset upload modal to initial state
function resetUploadModal() {
    uploadedFileData = null;
    validTransactions = [];
    invalidTransactions = [];
    uploadValidationErrors = [];
    currentUploadFileName = '';
    currentUploadTotalRows = 0;
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    const previewSection = document.getElementById('filePreviewSection');
    if (previewSection) previewSection.style.display = 'none';
    
    const submitBtn = document.getElementById('uploadSubmitBtn');
    if (submitBtn) submitBtn.style.display = 'none';
    
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) uploadArea.style.display = 'block';
    
    const errorMessages = document.getElementById('errorMessages');
    if (errorMessages) errorMessages.style.display = 'none';
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Setup drag and drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    });
}

// Process uploaded file
async function processFile(file) {
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // Validate file type
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
        showError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
        return;
    }
    
    showLoadingState();
    
    try {
        let data;
        
        if (fileExtension === 'csv') {
            data = await parseCSV(file);
        } else {
            data = await parseExcel(file);
        }
        
        uploadedFileData = data;
        await validateAndPreviewData(data, fileName);
        
    } catch (error) {
        console.error('Error processing file:', error);
        showError('Error processing file: ' + error.message);
    } finally {
        hideLoadingState();
    }
}

// Parse CSV file
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    reject(new Error('CSV file is empty or has no data rows'));
                    return;
                }
                
                console.log('Total CSV lines:', lines.length);
                
                // Find the header row by looking for key column names
                let headerRowIndex = -1;
                const requiredColumns = ['date', 'payee', 'particulars'];
                
                for (let i = 0; i < lines.length; i++) {
                    const lineLower = lines[i].toLowerCase();
                    
                    // Check if this row contains required column headers
                    const hasRequiredColumns = requiredColumns.every(col => 
                        lineLower.includes(col)
                    );
                    
                    if (hasRequiredColumns) {
                        headerRowIndex = i;
                        console.log('Found CSV header row at index:', headerRowIndex);
                        break;
                    }
                }
                
                if (headerRowIndex === -1) {
                    reject(new Error('Could not find header row with columns: Date, Payee, Particulars'));
                    return;
                }
                
                // Parse header
                const headers = parseCSVLine(lines[headerRowIndex]).map(h => h.trim().replace(/^"|"$/g, ''));
                
                // Parse data rows (skip header and any rows before it)
                const data = [];
                for (let i = headerRowIndex + 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    
                    // Skip completely empty rows
                    if (values.every(val => !val || val.trim() === '')) {
                        continue;
                    }
                    
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    
                    // Filter out placeholder rows with no meaningful data
                    // Check if row has data in key columns (date, payee, or particulars)
                    const date = String(row.DATE || row.Date || row.date || '').trim();
                    const payee = String(row.PAYEE || row.Payee || row.payee || '').trim();
                    const particulars = String(row.PARTICULARS || row.Particulars || row.particulars || '').trim();
                    
                    // Only add row if it has meaningful data in key columns
                    if (date !== '' || payee !== '' || particulars !== '') {
                        // Skip rows with "null" placeholders
                        if (date.toLowerCase() !== 'null' && payee.toLowerCase() !== 'null') {
                            data.push(row);
                        }
                    }
                }
                
                console.log('CSV data rows after filtering:', data.length);
                
                if (data.length === 0) {
                    reject(new Error('CSV file has no data rows after the header'));
                    return;
                }
                
                resolve(data);
            } catch (error) {
                console.error('Error parsing CSV:', error);
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read CSV file'));
        };
        
        reader.readAsText(file);
    });
}

// Parse CSV line (handles quoted values)
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    values.push(currentValue.trim());
    return values;
}

// Parse Excel file using SheetJS
function parseExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Check if XLSX library is loaded
                if (typeof XLSX === 'undefined') {
                    // Load XLSX library dynamically
                    loadXLSXLibrary().then(() => {
                        parseExcelData(e.target.result, resolve, reject);
                    }).catch(reject);
                } else {
                    parseExcelData(e.target.result, resolve, reject);
                }
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read Excel file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Load XLSX library dynamically
function loadXLSXLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load XLSX library'));
        document.head.appendChild(script);
    });
}

// Parse Excel data
function parseExcelData(arrayBuffer, resolve, reject) {
    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Get all rows as array of arrays first to find the header row
        const allRows = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, // Get as array of arrays
            raw: false,
            defval: ''
        });
        
        console.log('Total rows in Excel:', allRows.length);
        
        // Find the header row by looking for key column names
        let headerRowIndex = -1;
        const requiredColumns = ['date', 'payee', 'particulars'];
        
        for (let i = 0; i < allRows.length; i++) {
            const row = allRows[i];
            if (!row || row.length === 0) continue;
            
            // Convert row to lowercase for comparison
            const rowLower = row.map(cell => String(cell).toLowerCase().trim());
            
            // Check if this row contains required column headers
            const hasRequiredColumns = requiredColumns.every(col => 
                rowLower.some(cell => cell.includes(col))
            );
            
            if (hasRequiredColumns) {
                headerRowIndex = i;
                console.log('Found header row at index:', headerRowIndex);
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            reject(new Error('Could not find header row with columns: Date, Payee, Particulars'));
            return;
        }
        
        // Parse data starting from the row after the header
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        range.s.r = headerRowIndex; // Start from header row
        
        const rangeStr = XLSX.utils.encode_range(range);
        const data = XLSX.utils.sheet_to_json(worksheet, { 
            range: rangeStr,
            raw: false, 
            defval: '',
            dateNF: 'yyyy-mm-dd'
        });
        
        // Filter out empty/placeholder rows
        // A valid data row must have at least date, payee, OR particulars filled
        const filteredData = data.filter(row => {
            // Check if row has meaningful data in key columns
            const date = String(row.DATE || row.Date || row.date || '').trim();
            const payee = String(row.PAYEE || row.Payee || row.payee || '').trim();
            const particulars = String(row.PARTICULARS || row.Particulars || row.particulars || '').trim();
            
            // Row must have at least date, payee, or particulars to be considered valid data
            // This filters out rows with only numeric zeros or empty strings
            const hasKeyData = date !== '' || payee !== '' || particulars !== '';
            
            // Additional check: if date is just "null" string, skip it
            if (date.toLowerCase() === 'null' || payee.toLowerCase() === 'null') {
                return false;
            }
            
            return hasKeyData;
        });
        
        console.log('Data rows after filtering:', filteredData.length);
        
        if (filteredData.length === 0) {
            reject(new Error('Excel file has no data rows after the header'));
            return;
        }
        
        resolve(filteredData);
    } catch (error) {
        console.error('Error parsing Excel:', error);
        reject(error);
    }
}

// Validate and preview data
async function validateAndPreviewData(data, fileName) {
    validTransactions = [];
    invalidTransactions = [];
    const errors = [];
    uploadValidationErrors = errors;
    currentUploadFileName = fileName;
    currentUploadTotalRows = data.length;
    
    // Map column names (case-insensitive and flexible)
    const columnMap = {
        date: ['date', 'transaction date', 'transaction_date', 'transactiondate'],
        payee: ['payee', 'name', 'member name', 'member_name'],
        particulars: ['particulars', 'description', 'details', 'notes'],
        debit: ['debit', 'debit amount', 'debit_amount', 'debitamount'],
        credit: ['credit', 'credit amount', 'credit_amount', 'creditamount'],
        reference: ['reference', 'ref', 'reference number', 'reference_number'],
        cross_reference: ['cross reference', 'cross_reference', 'crossreference', 'cross ref'],
        check_number: ['check number', 'check_number', 'checknumber', 'check no', 'check_no'],
        cash_in_bank: ['cash in bank', 'cash_in_bank', 'cashinbank', 'cash'],
        loan_receivables: ['loan receivables', 'loan_receivables', 'loanreceivables', 'loans'],
        savings_deposits: ['savings deposits', 'savings_deposits', 'savingsdeposits', 'savings'],
        interest_income: ['interest income', 'interest_income', 'interestincome', 'interest'],
        service_charge: ['service charge', 'service_charge', 'servicecharge', 'service fee'],
        sundries: ['sundries', 'miscellaneous', 'misc', 'other']
    };
    
    // Find actual column names in the data
    const actualColumns = {};
    const firstRow = data[0];
    
    for (const [key, possibleNames] of Object.entries(columnMap)) {
        const foundColumn = Object.keys(firstRow).find(col => 
            possibleNames.includes(col.toLowerCase().trim())
        );
        if (foundColumn) {
            actualColumns[key] = foundColumn;
        }
    }
    
    // Validate each row
    data.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because: +1 for 0-index, +1 for header row
        const rowErrors = [];
        
        // Get values using mapped column names
        const date = actualColumns.date ? row[actualColumns.date] : '';
        const payee = actualColumns.payee ? row[actualColumns.payee] : '';
        const particulars = actualColumns.particulars ? row[actualColumns.particulars] : '';
        const debit = actualColumns.debit ? parseAmount(row[actualColumns.debit]) : 0;
        const credit = actualColumns.credit ? parseAmount(row[actualColumns.credit]) : 0;
        
        // Validate required fields
        if (!date || String(date).trim() === '') {
            rowErrors.push(`Row ${rowNumber}: Date is required`);
        } else if (!isValidDate(date)) {
            rowErrors.push(`Row ${rowNumber}: Invalid date format (use MM/DD/YYYY or YYYY-MM-DD)`);
        }
        
        if (!payee || payee.trim() === '') {
            rowErrors.push(`Row ${rowNumber}: Payee is required`);
        }
        
        if (!particulars || particulars.trim() === '') {
            rowErrors.push(`Row ${rowNumber}: Particulars is required`);
        }
        
        if (debit === 0 && credit === 0) {
            rowErrors.push(`Row ${rowNumber}: Either debit or credit amount must be greater than 0`);
        }
        
        if (debit < 0 || credit < 0) {
            rowErrors.push(`Row ${rowNumber}: Debit and credit amounts cannot be negative`);
        }
        
        // Format date - add validation check
        const formattedDate = formatDateForDB(date);
        if (date && !formattedDate) {
            rowErrors.push(`Row ${rowNumber}: Failed to parse date format`);
        }
        
        // Create transaction object
        const transaction = {
            transaction_date: formattedDate,
            payee: payee.trim(),
            reference: actualColumns.reference ? row[actualColumns.reference] : '',
            cross_reference: actualColumns.cross_reference ? row[actualColumns.cross_reference] : '',
            check_number: actualColumns.check_number ? row[actualColumns.check_number] : '',
            particulars: particulars.trim(),
            debit_amount: debit,
            credit_amount: credit,
            cash_in_bank: actualColumns.cash_in_bank ? parseAmount(row[actualColumns.cash_in_bank]) : 0,
            loan_receivables: actualColumns.loan_receivables ? parseAmount(row[actualColumns.loan_receivables]) : 0,
            savings_deposits: actualColumns.savings_deposits ? parseAmount(row[actualColumns.savings_deposits]) : 0,
            interest_income: actualColumns.interest_income ? parseAmount(row[actualColumns.interest_income]) : 0,
            service_charge: actualColumns.service_charge ? parseAmount(row[actualColumns.service_charge]) : 0,
            sundries: actualColumns.sundries ? parseAmount(row[actualColumns.sundries]) : 0,
            rowNumber: rowNumber
        };
        
        if (rowErrors.length === 0) {
            validTransactions.push(transaction);
        } else {
            invalidTransactions.push({ ...transaction, errors: rowErrors });
            errors.push(...rowErrors);
        }
    });
    
    // Check for duplicate references within the file
    const referenceCounts = {};
    validTransactions.forEach(trans => {
        const ref = trans.reference ? String(trans.reference).trim() : '';
        if (ref && ref !== '' && ref.toLowerCase() !== 'null') {
            if (!referenceCounts[ref]) {
                referenceCounts[ref] = [];
            }
            referenceCounts[ref].push(trans);
        }
    });
    
    // Mark duplicates within file as invalid
    Object.keys(referenceCounts).forEach(ref => {
        if (referenceCounts[ref].length > 1) {
            // Multiple transactions with same reference in the file
            referenceCounts[ref].forEach((trans, index) => {
                const transIndex = validTransactions.indexOf(trans);
                if (transIndex > -1) {
                    validTransactions.splice(transIndex, 1);
                    const errorMsg = `Row ${trans.rowNumber}: Duplicate reference "${ref}" found in file (appears ${referenceCounts[ref].length} times)`;
                    trans.errors = [errorMsg];
                    invalidTransactions.push(trans);
                    errors.push(errorMsg);
                }
            });
        }
    });
    
    refreshUploadPreview();
    await checkDatabaseDuplicates();
    refreshUploadPreview();
}

// Validate date format
function isValidDate(dateString) {
    if (!dateString) return false;
    
    // Try parsing the date
    const date = parseDateString(dateString);
    return date !== null && !isNaN(date.getTime());
}

// Parse date string with multiple format support
function parseDateString(dateString) {
    if (!dateString) return null;
    
    // Remove any whitespace
    const cleanDate = String(dateString).trim();
    
    console.log('Parsing date:', cleanDate); // Debug log
    
    // Try to parse as-is first (handles YYYY-MM-DD, ISO formats)
    let date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
        console.log('Parsed as standard date:', date);
        return date;
    }
    
    // Handle MM/DD/YYYY format (common in Excel and US format)
    const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const slashMatch = cleanDate.match(slashPattern);
    if (slashMatch) {
        const month = parseInt(slashMatch[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(slashMatch[2], 10);
        const year = parseInt(slashMatch[3], 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            console.log('Parsed as MM/DD/YYYY:', date);
            return date;
        }
    }
    
    // Handle DD-MM-YYYY or DD/MM/YYYY format
    const ddmmPattern = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
    const ddmmMatch = cleanDate.match(ddmmPattern);
    if (ddmmMatch) {
        const day = parseInt(ddmmMatch[1], 10);
        const month = parseInt(ddmmMatch[2], 10) - 1;
        const year = parseInt(ddmmMatch[3], 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            console.log('Parsed as DD-MM-YYYY:', date);
            return date;
        }
    }
    
    // Handle YYYY-MM-DD or YYYY/MM/DD format
    const yyyymmddPattern = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/;
    const yyyymmddMatch = cleanDate.match(yyyymmddPattern);
    if (yyyymmddMatch) {
        const year = parseInt(yyyymmddMatch[1], 10);
        const month = parseInt(yyyymmddMatch[2], 10) - 1;
        const day = parseInt(yyyymmddMatch[3], 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            console.log('Parsed as YYYY-MM-DD:', date);
            return date;
        }
    }
    
    // Handle Excel serial date numbers (days since 1900-01-01)
    const excelSerialNumber = parseFloat(cleanDate);
    if (!isNaN(excelSerialNumber) && excelSerialNumber > 0 && excelSerialNumber < 100000) {
        // Excel epoch starts at 1900-01-01 (with a known bug for leap year)
        const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
        date = new Date(excelEpoch.getTime() + excelSerialNumber * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime())) {
            console.log('Parsed as Excel serial number:', date);
            return date;
        }
    }
    
    console.error('Failed to parse date:', cleanDate);
    return null;
}

// Format date for database
function formatDateForDB(dateString) {
    // Don't log error for empty/null dates - those are caught by validation
    if (!dateString || String(dateString).trim() === '') {
        return null;
    }
    
    const date = parseDateString(dateString);
    
    if (!date || isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return null;
    }
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Parse amount - handle commas and various formats
function parseAmount(value) {
    if (!value || value === null || value === undefined) {
        return 0;
    }
    
    // If it's already a number, return it
    if (typeof value === 'number') {
        return value;
    }
    
    // Convert to string and clean it
    let cleanValue = String(value).trim();
    
    // Remove any currency symbols (₱, $, etc.)
    cleanValue = cleanValue.replace(/[₱$€£¥]/g, '');
    
    // Remove any whitespace
    cleanValue = cleanValue.replace(/\s/g, '');
    
    // Remove commas (thousands separators)
    cleanValue = cleanValue.replace(/,/g, '');
    
    // Parse the cleaned value
    const parsed = parseFloat(cleanValue);
    
    // Return 0 if parsing failed
    return isNaN(parsed) ? 0 : parsed;
}

// Display file preview
function displayFilePreview(fileName, totalRows, validRows, invalidRows) {
    const uploadArea = document.getElementById('uploadArea');
    const previewSection = document.getElementById('filePreviewSection');
    
    if (uploadArea) uploadArea.style.display = 'none';
    if (previewSection) previewSection.style.display = 'block';
    
    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) fileNameEl.textContent = fileName;
    
    const totalRowsEl = document.getElementById('totalRows');
    if (totalRowsEl) totalRowsEl.textContent = totalRows;
    
    const validRowsEl = document.getElementById('validRows');
    if (validRowsEl) validRowsEl.textContent = validRows;
    
    const invalidRowsEl = document.getElementById('invalidRows');
    if (invalidRowsEl) invalidRowsEl.textContent = invalidRows;
}

// Display preview table
function displayPreviewTable(validData, invalidData) {
    const thead = document.getElementById('previewTableHead');
    const tbody = document.getElementById('previewTableBody');
    
    if (!thead || !tbody) return;
    
    // Create table headers
    thead.innerHTML = `
        <tr>
            <th>Row</th>
            <th>Date</th>
            <th>Payee</th>
            <th>Reference</th>
            <th>Loan Receivables</th>
            <th>Savings Deposits</th>
            <th>Status</th>
        </tr>
    `;
    
    const formatAmount = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };
    
    // Combine valid and invalid data for preview (show first 10)
    const allData = [...validData, ...invalidData].slice(0, 10);
    
    tbody.innerHTML = allData.map(transaction => {
        const isInvalid = invalidData.includes(transaction);
        const rowClass = isInvalid ? 'invalid-row' : '';
        const status = isInvalid ? '<span style="color: #DC2626;">Invalid</span>' : '<span style="color: #16A34A;">Valid</span>';
        const reference = transaction.reference ? transaction.reference : '—';
        const loanReceivables = formatAmount(transaction.loan_receivables || 0);
        const savingsDeposits = formatAmount(transaction.savings_deposits || 0);
        
        return `
            <tr class="${rowClass}">
                <td>${transaction.rowNumber}</td>
                <td>${transaction.transaction_date}</td>
                <td>${transaction.payee}</td>
                <td>${reference}</td>
                <td>${loanReceivables}</td>
                <td>${savingsDeposits}</td>
                <td>${status}</td>
            </tr>
        `;
    }).join('');
}

// Display validation errors
function displayErrors(errors) {
    const errorContainer = document.getElementById('errorMessages');
    if (!errorContainer) return;
    
    errorContainer.style.display = 'block';
    
    errorContainer.innerHTML = `
        <h4><i class="fas fa-exclamation-circle"></i> Validation Errors:</h4>
        <ul>
            ${errors.slice(0, 20).map(error => `<li>${error}</li>`).join('')}
            ${errors.length > 20 ? `<li>... and ${errors.length - 20} more errors</li>` : ''}
        </ul>
    `;
}

function hideErrors() {
    const errorContainer = document.getElementById('errorMessages');
    if (!errorContainer) return;
    
    errorContainer.style.display = 'none';
    errorContainer.innerHTML = '';
}

function refreshUploadPreview() {
    const totalRows = currentUploadTotalRows || (validTransactions.length + invalidTransactions.length);
    const fileNameElement = document.getElementById('fileName');
    const fileName = currentUploadFileName || (fileNameElement ? fileNameElement.textContent : 'file');
    
    displayFilePreview(
        fileName,
        totalRows,
        validTransactions.length,
        invalidTransactions.length
    );
    
    displayPreviewTable(validTransactions, invalidTransactions);
    
    if (uploadValidationErrors && uploadValidationErrors.length > 0) {
        displayErrors(uploadValidationErrors);
    } else {
        hideErrors();
    }
    
    const submitBtn = document.getElementById('uploadSubmitBtn');
    if (submitBtn) {
        submitBtn.style.display = validTransactions.length > 0 ? 'block' : 'none';
    }
}

async function checkDatabaseDuplicates() {
    const userBranchId = localStorage.getItem('user_branch_id');
    if (!userBranchId) return;
    
    const references = validTransactions
        .map(t => t.reference ? String(t.reference).trim() : '')
        .filter(ref => ref && ref !== '' && ref.toLowerCase() !== 'null');
    
    if (references.length === 0) {
        return;
    }
    
    const uniqueReferences = Array.from(new Set(references));
    
    try {
        const response = await apiRequest('/transactions/check-duplicates', {
            method: 'POST',
            body: JSON.stringify({
                references: uniqueReferences,
                branch_id: parseInt(userBranchId)
            })
        });
        
        if (response.success && response.data.duplicates.length > 0) {
            const affectedRefs = moveDatabaseDuplicatesToInvalid(response.data.duplicates, uploadValidationErrors);
            
            if (affectedRefs.length > 0) {
                uploadValidationErrors.push(`Found ${affectedRefs.length} duplicate reference(s) already in the database.`);
                affectedRefs.forEach(ref => {
                    uploadValidationErrors.push(`Reference "${ref}" already exists in the database.`);
                });
                showError('Duplicate references found in the database. Please review the invalid rows before uploading.');
            }
        }
    } catch (error) {
        console.error('Error checking duplicate references:', error);
        // Do not block upload if duplicate check fails; just log the error.
    }
}

function moveDatabaseDuplicatesToInvalid(duplicateRefs, errorsTarget = []) {
    if (!duplicateRefs || duplicateRefs.length === 0) {
        return [];
    }
    
    const normalizedRefs = Array.from(new Set(
        duplicateRefs
            .map(ref => ref ? String(ref).trim() : '')
            .filter(ref => ref && ref !== '' && ref.toLowerCase() !== 'null')
    ));
    
    const affectedRefs = new Set();
    
    normalizedRefs.forEach(ref => {
        for (let i = validTransactions.length - 1; i >= 0; i--) {
            const transaction = validTransactions[i];
            const transactionRef = transaction.reference ? String(transaction.reference).trim() : '';
            
            if (transactionRef && transactionRef === ref) {
                validTransactions.splice(i, 1);
                const errorMsg = `Row ${transaction.rowNumber}: Reference "${ref}" already exists in the database`;
                transaction.errors = transaction.errors && transaction.errors.length ? [...transaction.errors, errorMsg] : [errorMsg];
                invalidTransactions.push(transaction);
                if (Array.isArray(errorsTarget)) {
                    errorsTarget.push(errorMsg);
                }
                affectedRefs.add(ref);
            }
        }
    });
    
    return Array.from(affectedRefs);
}

// Remove uploaded file
function removeFile() {
    resetUploadModal();
}

// Submit upload
async function submitUpload() {
    if (validTransactions.length === 0) {
        showError('No valid transactions to upload');
        return;
    }
    
    // Show custom confirmation dialog
    showUploadConfirmation(validTransactions.length);
}

// Show upload confirmation dialog
function showUploadConfirmation(count) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.id = 'uploadConfirmModal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="message-text">You are about to upload <span class="payee-name">${count}</span> transaction(s)</div>
            <div class="confirmation-actions">
                <button class="btn-cancel" onclick="closeUploadConfirmation()">Cancel</button>
                <button class="btn-confirm" onclick="proceedWithUpload()">Continue</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Close upload confirmation
function closeUploadConfirmation() {
    const modal = document.getElementById('uploadConfirmModal');
    if (modal) {
        modal.remove();
    }
}

// Proceed with upload after confirmation
async function proceedWithUpload() {
    closeUploadConfirmation();
    showLoadingState();
    
    try {
        const userBranchId = localStorage.getItem('user_branch_id');
        
        uploadValidationErrors = uploadValidationErrors || [];
        
        // Prepare transaction data
        const transactionsData = validTransactions.map(t => ({
            transaction_date: t.transaction_date,
            payee: t.payee,
            reference: t.reference,
            cross_reference: t.cross_reference,
            check_number: t.check_number,
            particulars: t.particulars,
            debit_amount: t.debit_amount,
            credit_amount: t.credit_amount,
            cash_in_bank: t.cash_in_bank,
            loan_receivables: t.loan_receivables,
            savings_deposits: t.savings_deposits,
            interest_income: t.interest_income,
            service_charge: t.service_charge,
            sundries: t.sundries
        }));
        
        // Check for duplicate references before uploading
        const references = Array.from(new Set(
            validTransactions
                .map(t => t.reference ? String(t.reference).trim() : '')
                .filter(ref => ref && ref !== '' && ref.toLowerCase() !== 'null')
        ));
        
        if (references.length > 0) {
            try {
                const duplicateCheckResponse = await apiRequest('/transactions/check-duplicates', {
                    method: 'POST',
                    body: JSON.stringify({
                        references: references,
                        branch_id: parseInt(userBranchId)
                    })
                });
                
                if (duplicateCheckResponse.success && duplicateCheckResponse.data.duplicates.length > 0) {
                    const affectedRefs = moveDatabaseDuplicatesToInvalid(duplicateCheckResponse.data.duplicates, uploadValidationErrors);
                    
                    if (affectedRefs.length > 0) {
                        uploadValidationErrors.push(`Found ${affectedRefs.length} duplicate reference(s) already in the database before upload.`);
                        affectedRefs.forEach(ref => {
                            uploadValidationErrors.push(`Reference "${ref}" already exists in the database.`);
                        });
                        
                        refreshUploadPreview();
                        hideLoadingState();
                        showError(`Cannot upload: ${affectedRefs.length} transaction(s) have duplicate references. Please review and remove duplicates before uploading.`);
                        return;
                    }
                }
            } catch (duplicateError) {
                console.error('Error checking duplicates:', duplicateError);
                // Continue with upload if duplicate check fails (don't block upload)
                console.warn('Duplicate check failed, proceeding with upload anyway');
            }
        }
        
        // If no duplicates or duplicate check passed, proceed with upload
        if (validTransactions.length === 0) {
            hideLoadingState();
            showError('No valid transactions to upload after duplicate check');
            return;
        }
        
        // Prepare final transaction data (only valid ones)
        const finalTransactionsData = validTransactions.map(t => ({
            transaction_date: t.transaction_date,
            payee: t.payee,
            reference: t.reference,
            cross_reference: t.cross_reference,
            check_number: t.check_number,
            particulars: t.particulars,
            debit_amount: t.debit_amount,
            credit_amount: t.credit_amount,
            cash_in_bank: t.cash_in_bank,
            loan_receivables: t.loan_receivables,
            savings_deposits: t.savings_deposits,
            interest_income: t.interest_income,
            service_charge: t.service_charge,
            sundries: t.sundries
        }));
        
        // Send bulk upload request
        const response = await apiRequest('/transactions/bulk', {
            method: 'POST',
            body: JSON.stringify({
                transactions: finalTransactionsData,
                branch_id: parseInt(userBranchId)
            })
        });
        
        if (response.success) {
            hideLoadingState();
            closeUploadModal();
            showUploadSuccess(response.data.created);
            
            // Reload transactions
            await loadTransactionsFromDatabase();
        } else {
            throw new Error(response.message || 'Failed to upload transactions');
        }
        
    } catch (error) {
        hideLoadingState();
        console.error('Error uploading transactions:', error);
        showError('Failed to upload transactions: ' + error.message);
    }
}

// Show upload success message
function showUploadSuccess(count) {
    const modal = document.createElement('div');
    modal.className = 'simple-message-modal';
    modal.innerHTML = `
        <div class="simple-message-content">
            <div class="success-icon"><i class="fas fa-check-circle"></i></div>
            <div class="message-text">Successfully uploaded <span class="payee-name">${count}</span> transaction(s)</div>
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
