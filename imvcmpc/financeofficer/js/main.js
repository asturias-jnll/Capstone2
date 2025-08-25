// Finance Officer Dashboard Main JavaScript

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
        
        // Verify user has finance officer role
        if (currentUser.role !== 'finance_officer') {
            console.error('Access denied: User is not a Finance Officer');
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
        document.getElementById('userRole').textContent = currentUser.role_display_name || 'Finance Officer';
        
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
    }
}

// Get screen display name
function getScreenDisplayName(screenName) {
    const displayNames = {
        'dashboard': 'Dashboard',
        'financial-data': 'Financial Data',
        'reports': 'Reports',
        'mcda-analysis': 'MCDA Analysis',
        'budget': 'Budget',
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
            gap: 12px;
            justify-content: center;
        ">
            <button id="cancelLogout" style="
                padding: 12px 24px;
                border: 1px solid #D1D5DB;
                border-radius: 10px;
                background: white;
                color: #4B5563;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 100px;
            ">Cancel</button>
            <button id="confirmLogout" style="
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                background: #187C19;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 100px;
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
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
    `;

    // Create loading content
    const loadingContent = document.createElement('div');
    loadingContent.style.cssText = `
        background: #E9EEF3;
        border-radius: 24px;
        padding: 24px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    loadingContent.innerHTML = `
        <div class="loading-spinner">
            <img src="../../assets/logo.png" alt="IMVCMPC Logo" class="spinning-logo">
        </div>
        <p id="logoutLoadingText">Logging out as Finance Officer...</p>
    `;

    // Add CSS classes to match login spinner exactly
    const spinStyle = document.createElement('style');
    spinStyle.textContent = `
        .loading-spinner {
            margin-bottom: 18px;
        }
        
        .spinning-logo {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            object-fit: cover;
            animation: spin 1s linear infinite;
        }
        
        #logoutLoadingText {
            color: #4B5563;
            margin: 0;
            margin-bottom: 18px;
            font-weight: 500;
            font-size: 18px;
            text-align: center;
            display: block;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(spinStyle);
    
    // Immediately update text with actual user role
    const loadingText = document.getElementById('logoutLoadingText');
    if (loadingText) {
        // Try multiple sources for user role
        let userRole = localStorage.getItem('user_role');
        
        if (!userRole) {
            // Try to get from user object
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    userRole = user.role_display_name || user.role || 'Finance Officer';
                } catch (e) {
                    userRole = 'Finance Officer';
                }
            } else {
                userRole = 'Finance Officer';
            }
        }
        
        // Ensure we have a valid role
        if (!userRole || userRole === 'null' || userRole === 'undefined') {
            userRole = 'Finance Officer';
        }
        
        loadingText.textContent = `Logging out as ${userRole}...`;
        console.log('Logout loading text set:', `Logging out as ${userRole}...`);
    }

    loadingOverlay.appendChild(loadingContent);
    document.body.appendChild(loadingOverlay);
}

// Utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

// Utility function to format numbers
function formatNumber(number) {
    return new Intl.NumberFormat('en-PH').format(number);
}

// Utility function to format percentages
function formatPercentage(value, total) {
    if (total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(2)}%`;
}

// Export functions for use in other modules
window.showScreen = showScreen;
window.logout = logout;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
window.formatPercentage = formatPercentage;
