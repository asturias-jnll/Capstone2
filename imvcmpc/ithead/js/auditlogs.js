// Audit Logs Management for IT Head
let currentPage = 1;
let logsPerPage = 50;
let totalLogs = 0;
let currentFilters = {};
let timestampUpdateInterval = null;
let autoRefreshInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is IT Head
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'IT Head') {
        alert('Access denied. Only IT Head can access audit logs.');
        window.location.href = '../../logpage/login.html';
        return;
    }

    // Set default date range (last 7 days)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    document.getElementById('dateFrom').valueAsDate = lastWeek;
    document.getElementById('dateTo').valueAsDate = today;

    // Load initial logs
    loadAuditLogs();

    // Start real-time timestamp updates (every 5 seconds)
    startTimestampUpdates();

    // Auto-refresh logs every 30 seconds to show new entries
    startAutoRefresh();
});

// Start real-time timestamp updates
function startTimestampUpdates() {
    // Clear any existing interval
    if (timestampUpdateInterval) {
        clearInterval(timestampUpdateInterval);
    }
    
    // Update timestamps every 5 seconds
    timestampUpdateInterval = setInterval(() => {
        updateAllTimestamps();
    }, 5000);
    
    // Initial update after 1 second
    setTimeout(() => {
        updateAllTimestamps();
    }, 1000);
}

// Start auto-refresh for new logs
function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Refresh logs every 30 seconds
    autoRefreshInterval = setInterval(() => {
        // Only refresh if we're on the first page (to avoid disrupting user's pagination)
        if (currentPage === 1) {
            loadAuditLogs();
        }
    }, 30000);
}

// Stop all intervals (cleanup)
function stopIntervals() {
    if (timestampUpdateInterval) {
        clearInterval(timestampUpdateInterval);
        timestampUpdateInterval = null;
    }
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Load audit logs from API
async function loadAuditLogs() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            alert('Authentication required. Please login again.');
            window.location.href = '../../logpage/login.html';
            return;
        }

        // Show loading state
        document.getElementById('logsTableBody').innerHTML = '<tr><td colspan="8" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading audit logs...</td></tr>';
        document.getElementById('logsCount').textContent = 'Loading logs...';

        // Build query parameters
        const params = new URLSearchParams({
            limit: logsPerPage,
            offset: (currentPage - 1) * logsPerPage
        });

        // Add filters
        if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
        if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
        if (currentFilters.user) params.append('user', currentFilters.user);
        if (currentFilters.eventType) params.append('eventType', currentFilters.eventType);
        if (currentFilters.status) params.append('status', currentFilters.status);

        const response = await fetch(`/api/auth/audit-logs?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch audit logs');
        }

        const data = await response.json();
        
        if (data.success) {
            totalLogs = data.pagination.total;
            displayAuditLogs(data.logs);
            updatePaginationUI(data.pagination);
            
            // Restart timestamp updates after displaying new logs
            startTimestampUpdates();
        } else {
            throw new Error('Failed to load audit logs');
        }

    } catch (error) {
        console.error('Error loading audit logs:', error);
        document.getElementById('logsTableBody').innerHTML = '<tr><td colspan="8" class="error-cell"><i class="fas fa-exclamation-triangle"></i> Failed to load audit logs. Please try again.</td></tr>';
        document.getElementById('logsCount').textContent = 'Error loading logs';
    }
}

// Display audit logs in table
function displayAuditLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell"><i class="fas fa-inbox"></i> No audit logs found for the selected filters.</td></tr>';
        document.getElementById('logsCount').textContent = 'No logs found';
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const timestamp = getTimeAgo(log.timestamp);
        const statusClass = log.status === 'success' ? 'status-success' : 'status-failed';
        const actionDisplay = formatAction(log.action);
        
        return `
            <tr data-timestamp="${log.timestamp}">
                <td class="timestamp-cell">
                    <span class="timestamp-text">${timestamp}</span>
                </td>
                <td class="username-cell">${log.username || 'N/A'}</td>
                <td class="action-cell">${actionDisplay}</td>
                <td class="resource-cell">${log.resource || 'N/A'}</td>
                <td class="branch-cell">${log.branch_name || 'N/A'}</td>
                <td class="ip-cell">${log.ip_address || 'N/A'}</td>
                <td class="status-cell">
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${log.status === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${log.status || 'N/A'}
                    </span>
                </td>
                <td class="details-cell">
                    <button class="btn-view-details" onclick="showLogDetails(${log.id})" title="View details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('logsCount').textContent = `Showing ${logs.length} of ${totalLogs} logs`;
}

// Get time ago string (same format as notifications)
function getTimeAgo(timestamp) {
    if (!timestamp) {
        return 'Just now';
    }
    
    const now = new Date();
    const logTime = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(logTime.getTime())) {
        console.error('Invalid timestamp:', timestamp);
        return 'Just now';
    }
    
    let diffInMs = now - logTime;
    let diffInSeconds = Math.floor(diffInMs / 1000);
    
    // Handle timezone issue: if timestamp appears to be in the future (negative diff),
    // it's likely the database is storing Philippine time (UTC+8) as UTC
    // Adjust by subtracting 8 hours (28800 seconds) from the log time
    if (diffInSeconds < 0) {
        // Adjust for Philippine timezone (UTC+8 = 8 hours = 28800 seconds)
        const adjustedTime = new Date(logTime.getTime() - (8 * 60 * 60 * 1000));
        diffInMs = now - adjustedTime;
        diffInSeconds = Math.floor(diffInMs / 1000);
        
        // If still negative after adjustment, just show "Just now"
        if (diffInSeconds < 0) {
            return 'Just now';
        }
    }
    
    if (diffInSeconds < 10) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} min ago`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

// Update all timestamps in real-time
function updateAllTimestamps() {
    const logRows = document.querySelectorAll('#logsTableBody tr[data-timestamp]');
    
    if (logRows.length === 0) {
        return; // No logs to update
    }
    
    logRows.forEach((row) => {
        const timestamp = row.getAttribute('data-timestamp');
        
        if (timestamp) {
            const timeElement = row.querySelector('.timestamp-text');
            if (timeElement) {
                const newTimeText = getTimeAgo(timestamp);
                timeElement.textContent = newTimeText;
            }
        }
    });
}

// Format action name for display
function formatAction(action) {
    if (!action) return 'N/A';
    
    // Convert snake_case to Title Case
    return action
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Apply filters
function applyFilters() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const user = document.getElementById('userFilter').value.trim();
    const action = document.getElementById('actionFilter').value;
    const resource = document.getElementById('resourceFilter').value;
    const status = document.getElementById('statusFilter').value;

    currentFilters = {
        dateFrom,
        dateTo,
        user: user || undefined,
        eventType: action || undefined,
        resource: resource || undefined,
        status: status || undefined
    };

    // Reset to first page when applying filters
    currentPage = 1;
    
    loadAuditLogs();
}

// Reset filters
function resetFilters() {
    // Reset date to last 7 days
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    document.getElementById('dateFrom').valueAsDate = lastWeek;
    document.getElementById('dateTo').valueAsDate = today;
    document.getElementById('userFilter').value = '';
    document.getElementById('actionFilter').value = '';
    document.getElementById('resourceFilter').value = '';
    document.getElementById('statusFilter').value = '';

    currentFilters = {};
    currentPage = 1;
    
    loadAuditLogs();
}

// Show log details in modal
async function showLogDetails(logId) {
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`/api/auth/audit-logs/${logId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch log details');
        }

        const data = await response.json();
        
        if (data.success && data.log) {
            displayLogDetails(data.log);
        } else {
            throw new Error('Log not found');
        }

    } catch (error) {
        console.error('Error loading log details:', error);
        alert('Failed to load log details. Please try again.');
    }
}

// Display log details in modal
function displayLogDetails(log) {
    const detailsContent = document.getElementById('detailsContent');
    
    let detailsHTML = `
        <div class="details-grid">
            <div class="detail-item">
                <label>Log ID:</label>
                <span>${log.id}</span>
            </div>
            <div class="detail-item">
                <label>Timestamp:</label>
                <span>${new Date(log.timestamp).toLocaleString()}</span>
            </div>
            <div class="detail-item">
                <label>Username:</label>
                <span>${log.username || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Action:</label>
                <span>${formatAction(log.action)}</span>
            </div>
            <div class="detail-item">
                <label>Resource:</label>
                <span>${log.resource || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Branch:</label>
                <span>${log.branch_name || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>IP Address:</label>
                <span>${log.ip_address || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge ${log.status === 'success' ? 'status-success' : 'status-failed'}">
                    ${log.status || 'N/A'}
                </span>
            </div>
        </div>
    `;
    
    detailsContent.innerHTML = detailsHTML;
    document.getElementById('detailsModal').style.display = 'flex';
}


// Close details modal
function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

// Export to CSV
async function exportToCSV() {
    try {
        const token = localStorage.getItem('access_token');
        
        // Build query parameters for export
        const params = new URLSearchParams();
        if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
        if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
        if (currentFilters.eventType) params.append('eventType', currentFilters.eventType);

        const response = await fetch(`/api/auth/audit-logs/export/csv?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to export logs');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exporting logs:', error);
        alert('Failed to export logs. Please try again.');
    }
}

// Pagination functions
function updatePaginationUI(pagination) {
    const { total, limit, offset } = pagination;
    const totalPages = Math.ceil(total / limit);
    const currentPageNum = Math.floor(offset / limit) + 1;

    // Update info text
    const start = offset + 1;
    const end = Math.min(offset + limit, total);
    document.getElementById('paginationInfo').textContent = `Showing ${start} - ${end} of ${total} logs`;

    // Update button states
    document.getElementById('firstPageBtn').disabled = currentPageNum === 1;
    document.getElementById('prevPageBtn').disabled = currentPageNum === 1;
    document.getElementById('nextPageBtn').disabled = currentPageNum === totalPages;
    document.getElementById('lastPageBtn').disabled = currentPageNum === totalPages;

    // Generate page numbers
    generatePageNumbers(currentPageNum, totalPages);
}

function generatePageNumbers(currentPageNum, totalPages) {
    const pageNumbersContainer = document.getElementById('pageNumbers');
    pageNumbersContainer.innerHTML = '';

    if (totalPages <= 7) {
        // Show all pages
        for (let i = 1; i <= totalPages; i++) {
            pageNumbersContainer.appendChild(createPageButton(i, currentPageNum));
        }
    } else {
        // Show first, last, current, and nearby pages
        pageNumbersContainer.appendChild(createPageButton(1, currentPageNum));

        if (currentPageNum > 3) {
            pageNumbersContainer.appendChild(createEllipsis());
        }

        for (let i = Math.max(2, currentPageNum - 1); i <= Math.min(totalPages - 1, currentPageNum + 1); i++) {
            pageNumbersContainer.appendChild(createPageButton(i, currentPageNum));
        }

        if (currentPageNum < totalPages - 2) {
            pageNumbersContainer.appendChild(createEllipsis());
        }

        pageNumbersContainer.appendChild(createPageButton(totalPages, currentPageNum));
    }
}

function createPageButton(pageNum, currentPageNum) {
    const button = document.createElement('button');
    button.className = `page-number ${pageNum === currentPageNum ? 'active' : ''}`;
    button.textContent = pageNum;
    button.onclick = () => goToPage(pageNum);
    return button;
}

function createEllipsis() {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '...';
    return span;
}

function goToPage(page) {
    currentPage = page;
    loadAuditLogs();
}

function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadAuditLogs();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(totalLogs / logsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        loadAuditLogs();
    }
}

function goToLastPage() {
    const totalPages = Math.ceil(totalLogs / logsPerPage);
    currentPage = totalPages;
    loadAuditLogs();
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('detailsModal');
    if (event.target === modal) {
        closeDetailsModal();
    }
});

// Cleanup intervals when page is unloaded
window.addEventListener('beforeunload', function() {
    stopIntervals();
});

