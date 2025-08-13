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

// Logout function
function logout() {
    // Clear user session
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastLoginTime');
    
    // Redirect to logout page
    window.location.href = '../../logpage/logout.html';
}

// Show logout confirmation
function showLogoutConfirmation() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
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
