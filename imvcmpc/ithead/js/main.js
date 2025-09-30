// IT Head Dashboard Main JavaScript

// Global variables
let currentUser = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Initialize dashboard
function initializeDashboard() {
    // Check if user is logged in
    checkAuthentication();
    
    // Load user data
    loadUserData();
    
    // Set up event listeners
    setupEventListeners();
}

// Check authentication
function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
        // Redirect to login if not authenticated
        window.location.href = '../../logpage/login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(user);
        
        // Verify user has IT Head role
        if (currentUser.role !== 'it_head') {
            console.error('Access denied: User is not an IT Head');
            logout();
            return;
        }
        
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
        return;
    }
}

// Load user data
function loadUserData() {
    if (currentUser) {
        // Update user display
        document.getElementById('userName').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
        document.getElementById('userRole').textContent = currentUser.role_display_name || 'IT Head';
        
        // Update breadcrumb
        document.getElementById('currentScreen').textContent = 'Dashboard';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add any additional event listeners here
}

// Show different screens
function showScreen(screenName) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    const selectedScreen = document.getElementById(screenName);
    if (selectedScreen) {
        selectedScreen.classList.add('active');
        
        // Update breadcrumb
        document.getElementById('currentScreen').textContent = getScreenDisplayName(screenName);
        
        // Update navigation active state
        updateNavigationActiveState(screenName);
        
        // Load screen-specific content
        loadScreenContent(screenName);
    }
}

// Get screen display name
function getScreenDisplayName(screenName) {
    const displayNames = {
        'dashboard': 'Dashboard',
        'user-management': 'User Management',
        'system-config': 'System Configuration',
        'security': 'Security Management',
        'logs': 'System Logs',
        'backup': 'Backup & Restore',
        'account': 'Account'
    };
    
    return displayNames[screenName] || screenName;
}

// Update navigation active state
function updateNavigationActiveState(activeScreen) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the corresponding nav item
    const activeNavItem = document.querySelector(`[onclick="showScreen('${activeScreen}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

// Load screen-specific content
function loadScreenContent(screenName) {
    switch(screenName) {
        case 'user-management':
            loadUserManagementContent();
            break;
        case 'system-config':
            loadSystemConfigContent();
            break;
        case 'security':
            loadSecurityContent();
            break;
        case 'logs':
            loadSystemLogsContent();
            break;
        case 'backup':
            loadBackupContent();
            break;
        default:
            break;
    }
}

// Load user management content
function loadUserManagementContent() {
    const screen = document.getElementById('user-management');
    if (screen) {
        screen.innerHTML = `
            <div class="screen-header">
                <h2>User Management</h2>
                <button class="add-user-btn" onclick="showAddUserForm()">
                    <i class="fas fa-plus"></i>
                    Add New User
                </button>
            </div>
            <div class="user-management-content">
                <div class="filters">
                    <input type="text" placeholder="Search users..." id="userSearch">
                    <select id="roleFilter">
                        <option value="">All Roles</option>
                        <option value="marketing_clerk">Marketing Clerk</option>
                        <option value="finance_officer">Finance Officer</option>
                        <option value="it_head">IT Head</option>
                    </select>
                    <select id="branchFilter">
                        <option value="">All Branches</option>
                        <option value="1">Main Branch</option>
                        <option value="2">Branch 2</option>
                        <option value="3">Branch 3</option>
                    </select>
                </div>
                <div class="users-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Branch</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <!-- Users will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Load users data
        loadUsersData();
    }
}

// Load system configuration content
function loadSystemConfigContent() {
    const screen = document.getElementById('system-config');
    if (screen) {
        screen.innerHTML = `
            <div class="screen-header">
                <h2>System Configuration</h2>
            </div>
            <div class="config-content">
                <div class="config-section">
                    <h3>General Settings</h3>
                    <div class="config-item">
                        <label>System Name</label>
                        <input type="text" value="IMVCMPC Financial Management System" readonly>
                    </div>
                    <div class="config-item">
                        <label>Version</label>
                        <input type="text" value="1.0.0" readonly>
                    </div>
                </div>
                <div class="config-section">
                    <h3>Security Settings</h3>
                    <div class="config-item">
                        <label>Session Timeout (minutes)</label>
                        <input type="number" value="30" min="5" max="120">
                    </div>
                    <div class="config-item">
                        <label>Max Login Attempts</label>
                        <input type="number" value="5" min="3" max="10">
                    </div>
                </div>
            </div>
        `;
    }
}

// Load security content
function loadSecurityContent() {
    const screen = document.getElementById('security');
    if (screen) {
        screen.innerHTML = `
            <div class="screen-header">
                <h2>Security Management</h2>
            </div>
            <div class="security-content">
                <div class="security-overview">
                    <div class="security-card">
                        <h3>Active Sessions</h3>
                        <p class="security-number">12</p>
                        <span>Current active users</span>
                    </div>
                    <div class="security-card">
                        <h3>Failed Logins</h3>
                        <p class="security-number">3</p>
                        <span>Last 24 hours</span>
                    </div>
                    <div class="security-card">
                        <h3>Security Alerts</h3>
                        <p class="security-number">0</p>
                        <span>No critical issues</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Load system logs content
function loadSystemLogsContent() {
    const screen = document.getElementById('logs');
    if (screen) {
        screen.innerHTML = `
            <div class="screen-header">
                <h2>System Logs</h2>
                <div class="log-controls">
                    <button onclick="refreshLogs()">Refresh</button>
                    <button onclick="exportLogs()">Export</button>
                </div>
            </div>
            <div class="logs-content">
                <div class="log-filters">
                    <select id="logLevel">
                        <option value="">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                    <input type="date" id="logDate">
                </div>
                <div class="logs-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Level</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody id="logsTableBody">
                            <!-- Logs will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Load logs data
        loadLogsData();
    }
}

// Load backup content
function loadBackupContent() {
    const screen = document.getElementById('backup');
    if (screen) {
        screen.innerHTML = `
            <div class="screen-header">
                <h2>Backup & Restore</h2>
            </div>
            <div class="backup-content">
                <div class="backup-actions">
                    <button onclick="createBackup()" class="backup-btn">
                        <i class="fas fa-download"></i>
                        Create Backup
                    </button>
                    <button onclick="restoreBackup()" class="restore-btn">
                        <i class="fas fa-upload"></i>
                        Restore Backup
                    </button>
                </div>
                <div class="backup-history">
                    <h3>Backup History</h3>
                    <div class="backup-list">
                        <!-- Backup history will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }
}

// Load users data
async function loadUsersData() {
    try {
        const response = await fetch('http://localhost:3001/api/auth/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users);
        } else {
            console.error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.username}</td>
            <td>${user.role_display_name || user.role}</td>
            <td>${user.branch_name || 'N/A'}</td>
            <td>
                <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button onclick="editUser('${user.id}')" class="action-btn edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteUser('${user.id}')" class="action-btn delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load logs data
async function loadLogsData() {
    // This would typically call an API endpoint for logs
    console.log('Loading system logs...');
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', dateOptions);
    
    // Update time
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    };
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// Logout function - shows confirmation and spinning logo before redirecting
function logout() {
    // Show logout confirmation modal
    showLogoutConfirmation();
}

// Show logout confirmation modal
function showLogoutConfirmation() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'logout-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'logout-modal';
    modalContent.style.cssText = `
        background: #E9EEF3;
        border-radius: 24px;
        padding: 24px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    `;

    modalContent.innerHTML = `
        <h2 style="
            font-size: 18px;
            font-weight: 600;
            color: #0B5E1C;
            margin-bottom: 8px;
        ">Confirm Logout</h2>
        <p style="
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 18px;
            line-height: 1.4;
        ">Are you sure you want to logout?</p>
        <div style="
            display: flex;
            gap: 10px;
            justify-content: center;
        ">
            <button id="cancelLogout" style="
                padding: 10px 20px;
                border: 1px solid var(--gray-300);
                border-radius: 6px;
                background: white;
                color: var(--gray-600);
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Cancel</button>
            <button id="confirmLogout" style="
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                background: var(--green);
                color: white;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Logout</button>
        </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        
        @keyframes modalSlideOut {
            from {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
            to {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
        }
        
        #cancelLogout:hover {
            border-color: #9CA3AF;
            background: #F9FAFB;
            transform: translateY(-1px);
        }
        
        #confirmLogout:hover {
            background: #0B5E1C;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(11, 94, 28, 0.3);
        }
    `;
    document.head.appendChild(style);

    // Add modal to page
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Add event listeners
    document.getElementById('cancelLogout').addEventListener('click', () => {
        closeLogoutModal();
    });

    document.getElementById('confirmLogout').addEventListener('click', () => {
        closeLogoutModal();
        performLogout();
    });

    // Close modal on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeLogoutModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLogoutModal();
        }
    });
}

// Close logout modal
function closeLogoutModal() {
    const modal = document.querySelector('.logout-modal-overlay');
    if (modal) {
        modal.style.animation = 'modalSlideOut 0.2s ease-in';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 200);
    }
}

// Perform actual logout with spinning logo
function performLogout() {
    // Show logout loading with spinning logo
    showLogoutLoading();
    
    // Clear user session data
    clearUserSession();
    
    // Redirect to login page after showing loading
    setTimeout(() => {
        window.location.href = '../../logpage/login.html';
    }, 3000);
}

// Clear user session data
function clearUserSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastLoginTime');
    localStorage.removeItem('lastActivityTime');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_branch_id');
    localStorage.removeItem('user_branch_name');
    localStorage.removeItem('user_branch_location');
    localStorage.removeItem('is_main_branch_user');
}

// Show logout loading with spinning logo
function showLogoutLoading() {
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'logout-loading-overlay';

    // Create loading content
    const loadingContent = document.createElement('div');
    loadingContent.className = 'logout-loading-content';

    loadingContent.innerHTML = `
        <div class="logout-loading-spinner">
            <img src="../../assets/logo.png" alt="IMVCMPC Logo" class="logout-spinning-logo">
        </div>
        <p class="logout-loading-text">Logging out as IT Head...</p>
    `;
    
    // Immediately update text with actual user role
    const loadingText = document.querySelector('.logout-loading-text');
    if (loadingText) {
        // Try multiple sources for user role
        let userRole = localStorage.getItem('user_role');
        
        if (!userRole) {
            // Try to get from user object
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    userRole = user.role_display_name || user.role || 'IT Head';
                } catch (e) {
                    userRole = 'IT Head';
                }
            } else {
                userRole = 'IT Head';
            }
        }
        
        // Ensure we have a valid role
        if (!userRole || userRole === 'null' || userRole === 'undefined') {
            userRole = 'IT Head';
        }
        
        loadingText.textContent = `Logging out as ${userRole}...`;
        console.log('Logout loading text set:', `Logging out as ${userRole}...`);
    }

    loadingOverlay.appendChild(loadingContent);
    document.body.appendChild(loadingOverlay);
}

// Export functions for use in other modules
window.showScreen = showScreen;
window.logout = logout;
window.loadUsersData = loadUsersData;
window.loadLogsData = loadLogsData;
