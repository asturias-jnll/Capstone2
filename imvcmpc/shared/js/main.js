// Main navigation and common functionality
document.addEventListener('DOMContentLoaded', function() {
    // Before doing anything else, ensure there is a valid session.
    // This protects against using the browser Back button to return
    // to a protected page after logout (when tokens are already cleared).
    if (!ensureAuthenticatedSession()) {
        return;
    }
    
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
    
    // Ensure notification badge is created for Marketing Clerk and Finance Officer
    const userRole = localStorage.getItem('user_role');
    if (userRole === 'Marketing Clerk' || userRole === 'Finance Officer') {
        // Wait a bit for navigation to be created, then ensure badge exists
        setTimeout(() => {
            ensureNotificationBadgeExists();
        }, 500);
    }
});

// Handle pages restored from the back/forward cache (bfcache).
// On some browsers, navigating back does not reload the page, so
// DOMContentLoaded will not fire again. We still need to enforce
// the logged-out state in that scenario.
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        ensureAuthenticatedSession();
    }
});

// Ensure there is an authenticated session for any shared main page
// (Finance Officer dashboard, Marketing Clerk member data, IT Head pages, etc.).
// If the access token or user data are missing, force a redirect to /login
// and clear any stale session data.
function ensureAuthenticatedSession() {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        if (typeof clearUserSession === 'function') {
            try {
                clearUserSession();
            } catch (e) {
                console.warn('Error clearing session during auth check:', e);
            }
        } else {
            // Minimal fallback if clearUserSession is not available for some reason
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('user_role');
        }
        
        // Use replace so the user cannot go "back" into the protected page
        window.location.replace('/login');
        return false;
    }
    
    return true;
}

// Ensure notification badge exists in navigation
function ensureNotificationBadgeExists() {
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'Marketing Clerk' && userRole !== 'Finance Officer') {
        return; // Only for Marketing Clerk and Finance Officer
    }
    
    // Check if badge already exists
    let badge = document.getElementById('navNotificationBadge');
    if (badge) {
        return; // Badge already exists
    }
    
    // Find notifications nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && (href.includes('notifications') || href === 'notifications.html')) {
            // Check if badge already exists in this item
            let existingBadge = item.querySelector('.notification-badge');
            if (!existingBadge) {
                // Create badge
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'notification-badge';
                badgeSpan.id = 'navNotificationBadge';
                badgeSpan.style.display = 'none';
                badgeSpan.textContent = '0';
                item.appendChild(badgeSpan);
                console.log('✅ Created notification badge element');
            }
        }
    });
}

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
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    // Check if we're on an account page
    const isAccountPage = currentPath.includes('/account');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        
        // Check if this nav item corresponds to current page
        const href = item.getAttribute('href');
        
        // Special handling for Account link (has href="#" and uses onclick)
        if (isAccountPage && (href === '#' || item.textContent.trim().toLowerCase() === 'account')) {
            item.classList.add('active');
            return;
        }
        
        if (!href || href === '#') return;
        
        // First, check for exact path match (for clean URLs like /ithead/analytics)
        // Normalize paths by removing trailing slashes for comparison
        const normalizedHref = href.replace(/\/$/, '');
        const normalizedCurrentPath = currentPath.replace(/\/$/, '');
        
        if (normalizedHref === normalizedCurrentPath) {
            item.classList.add('active');
            return;
        }
        
        // Extract last segment from href (handle both relative and absolute paths)
        const cleanHref = href.replace(/^\.\//, '').split('/').pop();
        const cleanCurrent = currentPage.replace(/^\.\//, '');
        
        // Match by last segment (works for any path structure)
        if (cleanHref === cleanCurrent && cleanCurrent !== '') {
            item.classList.add('active');
        } 
        // Also check if href ends with the current page filename (for absolute paths like /ithead/html/analytics.html)
        else if (cleanCurrent !== '' && (href.endsWith(cleanCurrent) || href.endsWith('/' + cleanCurrent))) {
            item.classList.add('active');
        }
        // Check if current path starts with the href (for nested paths, but avoid false positives)
        else if (normalizedCurrentPath.startsWith(normalizedHref + '/') && normalizedHref !== '') {
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
        // Finance Officer: Include Dashboard
        navItems = [
            { href: '/financeofficer/dashboard', icon: 'fas fa-home', text: 'Dashboard' },
            { href: '/financeofficer/memberdata', icon: 'fas fa-users', text: 'Member Data' },
            { href: '/financeofficer/analytics', icon: 'fas fa-chart-bar', text: 'Analytics' },
            { href: '/financeofficer/reports', icon: 'fas fa-file-alt', text: 'Reports' },
            { href: '/financeofficer/notifications', icon: 'fas fa-bell', text: 'Notifications' }
        ];
    } else if (userRole === 'IT Head') {
        // IT Head: User Management, Analytics, Reports, Audit Logs (no notifications, no member data)
        navItems = [
            { href: '/ithead/usermanagement', icon: 'fas fa-users-cog', text: 'User Management' },
            { href: '/ithead/analytics', icon: 'fas fa-chart-bar', text: 'Analytics' },
            { href: '/ithead/reports', icon: 'fas fa-file-alt', text: 'Reports' },
            { href: '/ithead/auditlogs', icon: 'fas fa-history', text: 'Audit Logs' }
        ];
    } else {
        // Marketing Clerk and other roles: No Dashboard, No Analytics, starts with Member Data
        navItems = [
            { href: '/marketingclerk/memberdata', icon: 'fas fa-users', text: 'Member Data' },
            { href: '/marketingclerk/reports', icon: 'fas fa-file-alt', text: 'Reports' },
            { href: '/marketingclerk/notifications', icon: 'fas fa-bell', text: 'Notifications' }
        ];
    }
    
    // Generate navigation HTML
    navItems.forEach(item => {
        const navItem = document.createElement('a');
        navItem.href = item.href;
        navItem.className = 'nav-item';
        
        // Add notification badge for both Marketing Clerk and Finance Officer (not IT Head)
        // Check if href includes 'notifications' (works for both old 'notifications.html' and new clean URLs)
        if ((item.href.includes('notifications') || item.href === 'notifications.html') && (userRole === 'Marketing Clerk' || userRole === 'Finance Officer')) {
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
    
    // Also call it after a short delay to ensure it runs after all scripts are loaded
    setTimeout(() => {
        setActiveNavigation();
    }, 100);
    
    // Initialize notification count for both Marketing Clerk and Finance Officer (not IT Head)
    if (userRole === 'Marketing Clerk' || userRole === 'Finance Officer') {
        console.log('🔄 Initializing notification count for', userRole);
        
        // Initial update
        updateNotificationCount();
        
        // Also try after a delay to ensure navigation is fully loaded
        setTimeout(() => {
            updateNotificationCount();
        }, 1000);
        
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
            let notifications = data.data || [];
            console.log('📬 Total notifications received from API:', notifications.length);
            
            // Apply completed status from localStorage (for notifications marked as completed client-side)
            const COMPLETED_KEY = 'completed_notifications';
            const completedIds = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
            if (completedIds.length > 0) {
                console.log('📋 Found', completedIds.length, 'completed notifications in localStorage');
                notifications = notifications.map(notification => {
                    if (completedIds.includes(notification.id)) {
                        return { ...notification, status: 'completed', is_highlighted: false };
                    }
                    return notification;
                });
            }
            
            console.log('📬 Total notifications after applying localStorage status:', notifications.length);
            
            // Log all notifications for debugging
            notifications.forEach((n, index) => {
                console.log(`  [${index}] Title: "${n.title}" | Type: ${n.reference_type} | Read: ${n.isRead} | Status: ${n.status}`);
            });
            
            // Count notifications that require action (always count until completed, regardless of read status)
            // These include: generated_report, report_request, change_request (pending)
            const actionRequiredCount = notifications.filter(n => {
                // Exclude completed notifications
                if (n.status === 'completed') return false;
                
                // Exclude system notifications (these don't require action, counted separately)
                if (n.category === 'system') return false;
                
                // Exclude change request approved/rejected (these don't require action)
                if (n.reference_type === 'change_request' && 
                    (n.title.includes('Approved') || n.title.includes('Rejected'))) {
                    return false;
                }
                
                // Include notifications that require action: generated_report, report_request, change_request (pending)
                // These should be counted regardless of read status until completed
                if (n.reference_type === 'generated_report' || 
                    n.reference_type === 'report_request' || 
                    (n.reference_type === 'change_request' && n.status !== 'completed')) {
                    return true;
                }
                
                // For other important notifications, count them if they're not completed
                if (n.category === 'important' && n.status !== 'completed') {
                    return true;
                }
                
                return false;
            }).length;
            
            // Count unread notifications that don't require action (system notifications, informational)
            // These should only be counted if unread
            const unreadNoActionCount = notifications.filter(n => {
                // System notifications (reactivation, password reset) - only count if unread
                if (n.category === 'system' && !n.isRead) {
                    return true;
                }
                
                // Change request approved/rejected - only count if unread
                if (n.reference_type === 'change_request' && 
                    (n.title.includes('Approved') || n.title.includes('Rejected')) && 
                    !n.isRead) {
                    return true;
                }
                
                return false;
            }).length;
            
            // Navbar badge should show: notifications requiring action + unread notifications without action
            const navbarBadgeCount = actionRequiredCount + unreadNoActionCount;
            
            // Debug logging for Marketing Clerk
            if (userRole === 'Marketing Clerk') {
                console.log('📊 Marketing Clerk Notification Breakdown:');
                console.log('  Total notifications:', notifications.length);
                console.log('  By status:', {
                    completed: notifications.filter(n => n.status === 'completed').length,
                    pending: notifications.filter(n => n.status === 'pending').length,
                    null_undefined: notifications.filter(n => !n.status || n.status === null).length,
                    other: notifications.filter(n => n.status && n.status !== 'completed' && n.status !== 'pending').length
                });
                console.log('  By category:', {
                    system: notifications.filter(n => n.category === 'system').length,
                    important: notifications.filter(n => n.category === 'important').length,
                    other: notifications.filter(n => n.category && n.category !== 'system' && n.category !== 'important').length
                });
                console.log('  By reference_type:', {
                    report_request: notifications.filter(n => n.reference_type === 'report_request').length,
                    generated_report: notifications.filter(n => n.reference_type === 'generated_report').length,
                    change_request: notifications.filter(n => n.reference_type === 'change_request').length,
                    other: notifications.filter(n => n.reference_type && !['report_request', 'generated_report', 'change_request'].includes(n.reference_type)).length,
                    null: notifications.filter(n => !n.reference_type).length
                });
                console.log('  Unread count:', notifications.filter(n => !n.isRead).length);
                console.log('  Action required count:', actionRequiredCount);
                console.log('  Unread no-action count:', unreadNoActionCount);
                console.log('  Final badge count:', navbarBadgeCount);
                
                // Detailed breakdown by type
                console.log('  Action required breakdown:', {
                    generated_report: notifications.filter(n => n.reference_type === 'generated_report' && n.status !== 'completed').length,
                    report_request: notifications.filter(n => n.reference_type === 'report_request' && n.status !== 'completed').length,
                    change_request_pending: notifications.filter(n => n.reference_type === 'change_request' && n.status !== 'completed' && !n.title.includes('Approved') && !n.title.includes('Rejected')).length,
                    other_important: notifications.filter(n => n.category === 'important' && !['generated_report', 'report_request', 'change_request'].includes(n.reference_type) && n.status !== 'completed').length
                });
                console.log('  Unread no-action breakdown:', {
                    system_unread: notifications.filter(n => n.category === 'system' && !n.isRead).length,
                    change_request_approved_rejected_unread: notifications.filter(n => n.reference_type === 'change_request' && (n.title.includes('Approved') || n.title.includes('Rejected')) && !n.isRead).length
                });
            }
            
            console.log('🔢 Notifications requiring action:', actionRequiredCount);
            console.log('🔢 Unread notifications without action:', unreadNoActionCount);
            console.log('🎯 Updating badge with count:', navbarBadgeCount);
            
            updateNotificationBadge(navbarBadgeCount);
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
    // Try to find the badge element - check multiple possible locations
    let badge = document.getElementById('navNotificationBadge');
    
    // If not found, try to find it by class in the notifications nav item
    if (!badge) {
        const userRole = localStorage.getItem('user_role');
        if (userRole === 'Marketing Clerk' || userRole === 'Finance Officer') {
            // Find the notifications nav item
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const href = item.getAttribute('href');
                if (href && (href.includes('notifications') || href === 'notifications.html')) {
                    // Check if badge already exists
                    let existingBadge = item.querySelector('.notification-badge');
                    if (existingBadge) {
                        badge = existingBadge;
                    } else {
                        // Create badge if it doesn't exist
                        const badgeSpan = document.createElement('span');
                        badgeSpan.className = 'notification-badge';
                        badgeSpan.id = 'navNotificationBadge';
                        badgeSpan.style.display = 'none';
                        badgeSpan.textContent = '0';
                        item.appendChild(badgeSpan);
                        badge = badgeSpan;
                    }
                }
            });
        }
    }
    
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
        // Retry after a short delay in case navigation hasn't loaded yet
        setTimeout(() => {
            updateNotificationBadge(count);
        }, 500);
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
async function performLogout() {
    // Show logout loading with spinning logo
    showLogoutLoading();
    
    try {
        // Call backend logout API to log the action
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (token && refreshToken) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        refresh_token: refreshToken
                    })
                });
            } catch (error) {
                console.warn('Logout API call failed, but continuing with logout:', error);
            }
        }
    } catch (error) {
        console.warn('Error during logout API call:', error);
    }
    
    // Redirect to login page after showing loading
    setTimeout(() => {
        // Clear user session data before redirect
        clearUserSession();
        window.location.href = '/login';
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
    // Clear account status data
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('lastLogin');
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('sessionHiddenTime');
    localStorage.removeItem('lastActiveTime');
}

// Handle account deactivation - automatically log out user
function handleAccountDeactivation(message) {
    // Clear session
    clearUserSession();
    
    // Store deactivation message in sessionStorage to show on login page
    const deactivationMessage = message || 'Your account has been deactivated by the IT Head. You have been logged out.';
    sessionStorage.setItem('deactivationMessage', deactivationMessage);
    
    // Redirect to login page
    window.location.href = '/login?deactivated=true';
}

// Global fetch interceptor to catch deactivated account errors
(function() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            // Check if response is JSON and has error code for deactivated account
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    // Clone response to read it without consuming the original
                    const clonedResponse = response.clone();
                    try {
                        const data = await clonedResponse.json();
                        
                        // Check for account deactivation error code
                        if (data.code === 'ACCOUNT_DEACTIVATED' || 
                            (data.error && data.error.includes('deactivated by the IT Head'))) {
                            handleAccountDeactivation(data.error || 'Your account has been deactivated by the IT Head.');
                            // Return a rejected promise to prevent further processing
                            return Promise.reject(new Error('Account deactivated'));
                        }
                    } catch (e) {
                        // If JSON parsing fails, continue with original response
                        console.error('Error parsing error response:', e);
                    }
                }
            }
            
            return response;
        } catch (error) {
            // Re-throw original error
            throw error;
        }
    };
})();

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
    
    // If role not found in localStorage, try to get from user data
    if (!userRole || userRole === 'null' || userRole === 'undefined') {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                // Check role_display_name first, then role, and map database roles to display names
                const roleFromUser = user.role_display_name || user.role;
                if (roleFromUser) {
                    // Map database role names to display names
                    if (roleFromUser.toLowerCase() === 'it_head' || roleFromUser === 'IT Head') {
                        userRole = 'IT Head';
                    } else if (roleFromUser.toLowerCase() === 'finance_officer' || roleFromUser === 'Finance Officer') {
                        userRole = 'Finance Officer';
                    } else if (roleFromUser.toLowerCase() === 'marketing_clerk' || roleFromUser === 'Marketing Clerk') {
                        userRole = 'Marketing Clerk';
                    } else {
                        userRole = roleFromUser;
                    }
                }
            } catch (e) {
                console.warn('Error parsing user data:', e);
            }
        }
    }
    
    // Fallback: try to determine role from current URL path
    if (!userRole || userRole === 'null' || userRole === 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.includes('ithead')) {
            userRole = 'IT Head';
        } else if (currentPath.includes('financeofficer')) {
            userRole = 'Finance Officer';
        } else if (currentPath.includes('marketingclerk')) {
            userRole = 'Marketing Clerk';
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
        <p class="logout-loading-text">Logging out as ${userRole}</p>
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
}

// Update last activity timestamp
function updateLastActivity() {
    localStorage.setItem('lastActivityTime', Date.now().toString());
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
    const navItemsContainer = document.getElementById('nav-items-container');
    
    if (navToggle && navigation) {
        // Load saved state from localStorage immediately
        const isExpanded = localStorage.getItem('navExpanded') === 'true';
        if (isExpanded) {
            navigation.classList.add('expanded');
            navToggle.setAttribute('aria-expanded', 'true');
        } else {
            navigation.classList.remove('expanded');
            navToggle.setAttribute('aria-expanded', 'false');
        }
        
        // Add click event listener
        navToggle.addEventListener('click', function() {
            toggleNavigation();
        });
        
        // Add keyboard support (Enter and Space)
        navToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleNavigation();
            }
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
    const navToggle = document.getElementById('navToggle');
    const isExpanded = navigation.classList.contains('expanded');
    
    if (isExpanded) {
        navigation.classList.remove('expanded');
        document.documentElement.classList.remove('nav-expanded');
        localStorage.setItem('navExpanded', 'false');
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'false');
        }
    } else {
        navigation.classList.add('expanded');
        document.documentElement.classList.add('nav-expanded');
        localStorage.setItem('navExpanded', 'true');
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'true');
        }
    }
}
