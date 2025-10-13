// Main navigation and common functionality
document.addEventListener('DOMContentLoaded', function() {
    // Don't override user role - let it come from login process
    
    // Initialize date and time display
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Set active navigation item based on current page
    setActiveNavigation();
    
    // Initialize session management
    initializeSessionManagement();
    
    // Initialize branch-specific display
    initializeBranchDisplay();
    
    // Initialize dynamic user header
    initializeDynamicUserHeader();
    
    // Initialize navigation toggle
    initializeNavigationToggle();
    
    // Initialize role-based navigation
    initializeRoleBasedNavigation();
});

// Update date and time display
function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    
    // Update time
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    };
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }
}

// Initialize branch-specific display
function initializeBranchDisplay() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Update breadcrumb to show branch information
    const breadcrumbElement = document.getElementById('currentScreen');
    if (breadcrumbElement && userBranchName) {
        if (isMainBranchUser) {
            breadcrumbElement.textContent = 'Dashboard - All Branches';
        } else {
            breadcrumbElement.textContent = `Dashboard - ${userBranchName}`;
        }
    }
    
    // Update user role display to show branch
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement && userBranchName) {
        const userRole = localStorage.getItem('user_role') || 'User';
        if (isMainBranchUser) {
            userRoleElement.textContent = `${userRole} (Main Branch)`;
        } else {
            userRoleElement.textContent = `${userRole} (${userBranchName})`;
        }
    }
    
    // Branch indicator removed - no longer showing branch location in center of header
}



// Set active navigation item based on current page
function setActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        
        // Check if this nav item corresponds to current page
        if (currentPage === 'dashboard.html' && item.getAttribute('href') === 'dashboard.html') {
            item.classList.add('active');
        } else if (currentPage === 'memberdata.html' && item.getAttribute('href') === 'memberdata.html') {
            item.classList.add('active');
        } else if (currentPage === 'analytics.html' && item.getAttribute('href') === 'analytics.html') {
            item.classList.add('active');
        } else if (currentPage === 'reports.html' && item.getAttribute('href') === 'reports.html') {
            item.classList.add('active');
        } else if (currentPage === 'notifications.html' && item.getAttribute('href') === 'notifications.html') {
            item.classList.add('active');
        } else if (currentPage === 'account.html' && item.getAttribute('href') === 'account.html') {
            item.classList.add('active');
        }
    });
}

// Initialize role-based navigation
function initializeRoleBasedNavigation() {
    const userRole = localStorage.getItem('user_role');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navMenu) return;
    
    // Clear existing navigation items
    navMenu.innerHTML = '';
    
    // Define navigation items based on role
    let navItems = [];
    
    if (userRole === 'Finance Officer') {
        // Finance Officer: No Dashboard, starts with Member Data
        navItems = [
            { href: 'memberdata.html', icon: 'fas fa-users', text: 'Member Data' },
            { href: 'analytics.html', icon: 'fas fa-chart-bar', text: 'Analytics' },
            { href: '/financeofficer/html/reports.html', icon: 'fas fa-file-alt', text: 'Reports' },
            { href: 'notifications.html', icon: 'fas fa-bell', text: 'Notifications' }
        ];
    } else {
        // Marketing Clerk and other roles: Include Dashboard
        navItems = [
            { href: 'dashboard.html', icon: 'fas fa-home', text: 'Dashboard' },
            { href: 'memberdata.html', icon: 'fas fa-users', text: 'Member Data' },
            { href: 'analytics.html', icon: 'fas fa-chart-bar', text: 'Analytics' },
            { href: '/marketingclerk/html/reports.html', icon: 'fas fa-file-alt', text: 'Reports' },
            { href: 'notifications.html', icon: 'fas fa-bell', text: 'Notifications' }
        ];
    }
    
    // Generate navigation HTML
    navItems.forEach(item => {
        const navItem = document.createElement('a');
        navItem.href = item.href;
        navItem.className = 'nav-item';
        
        // Add notification badge for both Marketing Clerk and Finance Officer
        if (item.href === 'notifications.html' && (userRole === 'Marketing Clerk' || userRole === 'Finance Officer')) {
            navItem.innerHTML = `
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
                <span class="notification-badge" id="navNotificationBadge" style="display: none;">0</span>
            `;
        } else {
            navItem.innerHTML = `
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            `;
        }
        
        navMenu.appendChild(navItem);
    });
    
    // Set active navigation after generating items
    setActiveNavigation();
    
    // Initialize notification count for both Marketing Clerk and Finance Officer
    if (userRole === 'Marketing Clerk' || userRole === 'Finance Officer') {
        console.log('🔄 Initializing notification count for', userRole);
        updateNotificationCount();
        
        // Refresh notification count every 10 seconds
        setInterval(() => {
            console.log('🔄 Periodic notification count refresh...');
            updateNotificationCount();
        }, 10000);
    }
}

// Update notification count for both Marketing Clerk and Finance Officer
async function updateNotificationCount() {
    try {
        console.log('🔔 === UPDATE NOTIFICATION COUNT ===');
        const userRole = localStorage.getItem('user_role');
        console.log('👤 User role:', userRole);
        
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('❌ No access token found');
            return;
        }

        console.log('📡 Fetching notifications from API...');
        const response = await fetch('/api/auth/notifications', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();
        console.log('📋 Full API response:', data);
        
        if (data.success) {
            const notifications = data.data || [];
            console.log('📬 Total notifications received:', notifications.length);
            
            // Log all notifications for debugging
            notifications.forEach((n, index) => {
                console.log(`  [${index}] Title: "${n.title}" | Type: ${n.reference_type} | Read: ${n.isRead} | Status: ${n.status}`);
            });
            
            // Count unread notifications for both roles (include report_request)
            const unreadCount = notifications.filter(n => !n.isRead && (
                n.reference_type === 'change_request' || n.reference_type === 'report_request'
            )).length;
            
            console.log('🔢 Unread important notifications (CR + RR):', unreadCount);
            console.log('🎯 Updating badge with count:', unreadCount);
            
            updateNotificationBadge(unreadCount);
        }
    } catch (error) {
        console.error('❌ Error updating notification count:', error);
    }
}

// Legacy function name for backward compatibility
async function updateMarketingClerkNotificationCount() {
    return updateNotificationCount();
}

// Update the notification badge display
function updateNotificationBadge(count) {
    const badge = document.getElementById('navNotificationBadge');
    
    console.log('🏷️ Updating badge element...');
    console.log('  Badge element found:', !!badge);
    console.log('  Count to display:', count);
    
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.setProperty('display', 'flex', 'important');
            badge.style.visibility = 'visible';
            badge.style.opacity = '1';
            console.log('  ✅ Badge displayed with count:', count);
            console.log('  📍 Badge styles:', {
                display: badge.style.display,
                visibility: badge.style.visibility,
                opacity: badge.style.opacity
            });
        } else {
            badge.style.setProperty('display', 'none', 'important');
            console.log('  ℹ️ Badge hidden (count is 0)');
        }
    } else {
        console.error('  ❌ Badge element not found in DOM!');
    }
}

// Mark notification as read (called when Marketing Clerk views a notification)
async function markMarketingClerkNotificationAsRead(notificationId) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            return;
        }

        const response = await fetch(`/api/auth/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to mark notification as read');
        }

        // Update the notification count after marking as read
        await updateMarketingClerkNotificationCount();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
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
    
    // Redirect to login page after showing loading
    setTimeout(() => {
        // Clear user session data before redirect
        clearUserSession();
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

    // Get user role before creating the content
    let userRole = localStorage.getItem('user_role');
    if (!userRole) {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                userRole = user.role_display_name || user.role || 'User';
            } catch (e) {
                userRole = 'User';
            }
        } else {
            userRole = 'User';
        }
    }
    
    // Ensure we have a valid role
    if (!userRole || userRole === 'null' || userRole === 'undefined') {
        userRole = 'User';
    }

    loadingContent.innerHTML = `
        <div class="logout-loading-spinner">
            <img src="../../assets/logo.png" alt="IMVCMPC Logo" class="logout-spinning-logo">
        </div>
        <p class="logout-loading-text">Logging out as ${userRole}...</p>
    `;

    loadingOverlay.appendChild(loadingContent);
    document.body.appendChild(loadingOverlay);
}

// Session Management
function initializeSessionManagement() {
    // Set login time if not already set
    if (!localStorage.getItem('lastLoginTime')) {
        localStorage.setItem('lastLoginTime', Date.now().toString());
    }
    
    // Set last activity time
    updateLastActivity();
    
    // Add activity listeners
    document.addEventListener('mousedown', updateLastActivity);
    document.addEventListener('keydown', updateLastActivity);
    document.addEventListener('scroll', updateLastActivity);
    document.addEventListener('click', updateLastActivity);
    
    // Check session timeout every minute
    setInterval(checkSessionTimeout, 60000);
    
    // Check for idle timeout every 30 seconds
    setInterval(checkIdleTimeout, 30000);
}

// Update last activity timestamp
function updateLastActivity() {
    localStorage.setItem('lastActivityTime', Date.now().toString());
}

// Check if session has timed out
function checkSessionTimeout() {
    const lastActivity = localStorage.getItem('lastActivityTime');
    const sessionTimeout = localStorage.getItem('sessionTimeout') || '1800000'; // 30 minutes default
    
    if (lastActivity && (Date.now() - parseInt(lastActivity)) > parseInt(sessionTimeout)) {
        showSessionTimeoutWarning();
    }
}

// Check for idle timeout
function checkIdleTimeout() {
    const lastActivity = localStorage.getItem('lastActivityTime');
    const idleTimeout = localStorage.getItem('idleTimeout') || '900000'; // 15 minutes default
    
    if (lastActivity && (Date.now() - parseInt(lastActivity)) > parseInt(idleTimeout)) {
        showIdleWarning();
    }
}

// Show session timeout warning
function showSessionTimeoutWarning() {
    const warning = document.createElement('div');
    warning.className = 'session-warning';
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--red);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    warning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>Session Timeout Warning</strong><br>
                Your session will expire soon due to inactivity.
            </div>
        </div>
        <button onclick="extendSession()" style="
            margin-top: 12px;
            padding: 8px 16px;
            background: white;
            color: var(--red);
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        ">Extend Session</button>
    `;
    
    document.body.appendChild(warning);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (warning.parentNode) {
            warning.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, 300);
        }
    }, 10000);
}

// Show idle warning
function showIdleWarning() {
    const warning = document.createElement('div');
    warning.className = 'idle-warning';
    warning.style.cssText = `
        position: fixed;
 top: 20px;
        right: 20px;
        background: var(--orange);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    warning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-clock"></i>
            <div>
                <strong>Idle Warning</strong><br>
                You've been inactive for a while.
            </div>
        </div>
        <button onclick="updateLastActivity()" style="
            margin-top: 12px;
            padding: 8px 16px;
            background: white;
            color: var(--orange);
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        ">Stay Active</button>
    `;
    
    document.body.appendChild(warning);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (warning.parentNode) {
            warning.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, 300);
        }
    }, 8000);
}

// Extend session
function extendSession() {
    updateLastActivity();
    
    // Show success message
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--green);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    message.innerHTML = '<i class="fas fa-check"></i> Session extended successfully!';
    
    document.body.appendChild(message);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }
    }, 3000);
    
    // Remove any existing warnings
    const warnings = document.querySelectorAll('.session-warning, .idle-warning');
    warnings.forEach(w => {
        if (w.parentNode) {
            w.parentNode.removeChild(w);
        }
    });
}

// Add CSS animations for warnings
const warningStyles = document.createElement('style');
warningStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(warningStyles);

// Initialize dynamic user header - Make it globally accessible
window.initializeDynamicUserHeader = function() {
    // Get user data from localStorage
    const userRole = localStorage.getItem('user_role') || 'User';
    const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
    const userBranchLocation = localStorage.getItem('user_branch_location') || '';
    
    // Update user name (role) in header
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userRole;
    }
    
    // Update user role (branch) in header
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        if (userBranchLocation) {
            userRoleElement.textContent = `IMVCMPC - ${userBranchName} ${userBranchLocation}`;
        } else {
            userRoleElement.textContent = `IMVCMPC - ${userBranchName}`;
        }
    }
}

// Initialize navigation toggle functionality
function initializeNavigationToggle() {
    const navToggle = document.getElementById('navToggle');
    const navigation = document.querySelector('.navigation');
    
    if (navToggle && navigation) {
        // Load saved state from localStorage immediately
        const isExpanded = localStorage.getItem('navExpanded') === 'true';
        if (isExpanded) {
            navigation.classList.add('expanded');
        } else {
            navigation.classList.remove('expanded');
        }
        
        // Add click event listener
        navToggle.addEventListener('click', function() {
            toggleNavigation();
        });
        
        // Auto-collapse on smaller screens for better UX
        function handleResize() {
            if (window.innerWidth <= 1024) {
                // Auto-collapse on tablet and mobile screens
                if (navigation.classList.contains('expanded')) {
                    navigation.classList.remove('expanded');
                    document.documentElement.classList.remove('nav-expanded');
                    localStorage.setItem('navExpanded', 'false');
                }
            }
        }
        
        // Listen for window resize
        window.addEventListener('resize', handleResize);
        
        // Check initial screen size
        handleResize();
    }
}

// Toggle navigation collapse state
function toggleNavigation() {
    const navigation = document.querySelector('.navigation');
    const isExpanded = navigation.classList.contains('expanded');
    
    if (isExpanded) {
        navigation.classList.remove('expanded');
        document.documentElement.classList.remove('nav-expanded');
        localStorage.setItem('navExpanded', 'false');
    } else {
        navigation.classList.add('expanded');
        document.documentElement.classList.add('nav-expanded');
        localStorage.setItem('navExpanded', 'true');
    }
}
