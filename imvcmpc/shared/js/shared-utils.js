// Shared utilities for all roles
class SharedUtils {
    constructor() {
        this.roleConfigs = {
            'marketing-clerk': {
                name: 'Marketing Clerk',
                navItems: [
                    // Dashboard and Analytics removed for Marketing Clerk
                    { href: '/marketingclerk/memberdata', icon: 'fas fa-users', text: 'Member Data' },
                    { href: '/marketingclerk/reports', icon: 'fas fa-file-alt', text: 'Reports' },
                    { href: '/marketingclerk/notifications', icon: 'fas fa-bell', text: 'Notifications' }
                ]
            },
            'finance-officer': {
                name: 'Finance Officer',
                navItems: [
                    // Dashboard is now available for Finance Officer
                    { href: '/financeofficer/dashboard', icon: 'fas fa-home', text: 'Dashboard' },
                    { href: '/financeofficer/memberdata', icon: 'fas fa-users', text: 'Member Data' },
                    { href: '/financeofficer/analytics', icon: 'fas fa-chart-bar', text: 'Analytics' },
                    { href: '/financeofficer/reports', icon: 'fas fa-file-alt', text: 'Reports' },
                    { href: '/financeofficer/notifications', icon: 'fas fa-bell', text: 'Notifications' }
                ]
            },
            'it-head': {
                name: 'IT Head',
                navItems: [
                    { href: '/ithead/usermanagement', icon: 'fas fa-users-cog', text: 'User Management' },
                    { href: '/ithead/analytics', icon: 'fas fa-chart-bar', text: 'Analytics' },
                    { href: '/ithead/reports', icon: 'fas fa-file-alt', text: 'Reports' },
                    { href: '/ithead/auditlogs', icon: 'fas fa-history', text: 'Audit Logs' }
                ]
            }
        };
    }

    // Initialize shared components
    init() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        this.initializeSessionManagement();
        this.initializeBranchDisplay();
        this.initializeDynamicUserHeader();
        this.loadNavigation();
        this.hideDashboardForFinanceOfficer();
        
        // Set active navigation after navigation is loaded
        setTimeout(() => {
            this.setActiveNavigation();
        }, 50);

        // Initialize proportional filter button stretch on load and resize
        this.initializeProportionalFilterStretch();
    }

    // Update date and time display
    updateDateTime() {
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

    // Proportionally stretch filter buttons based on text length
    initializeProportionalFilterStretch() {
        const apply = () => {
            const containers = document.querySelectorAll('.section-controls .report-filters');
            containers.forEach(container => {
                const buttons = Array.from(container.querySelectorAll('.filter-btn'));
                if (!buttons.length) return;

                // Calculate flex-grow based on text length
                buttons.forEach(btn => {
                    const text = (btn.textContent || '').trim();
                    const len = Math.max(1, text.length);
                    // Use length as flex-grow so longer labels get proportionally more space
                    btn.style.flexGrow = String(len);
                });
            });
        };

        // Run once after DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', apply);
        } else {
            apply();
        }

        // Re-apply on resize (debounced)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(apply, 120);
        });
    }

    // Load navigation based on current role
    loadNavigation() {
        const currentRole = this.getCurrentRole();
        const config = this.roleConfigs[currentRole];
        
        if (!config) return;

        const navContainer = document.getElementById('nav-items-container');
        if (!navContainer) return;

        navContainer.innerHTML = '';
        
        config.navItems.forEach(item => {
            const navItem = document.createElement('a');
            navItem.href = item.href;
            navItem.className = 'nav-item';
            navItem.innerHTML = `
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            `;
            navContainer.appendChild(navItem);
        });
    }

    // Hide dashboard navigation for Marketing Clerk (dashboard is now for Finance Officer only)
    hideDashboardForFinanceOfficer() {
        const userRole = localStorage.getItem('user_role');
        const dashboardNavItems = document.querySelectorAll('a[href="dashboard.html"], a[href="main.html"]');
        
        // Hide dashboard for Marketing Clerk (not Finance Officer)
        if (userRole === 'Marketing Clerk' && dashboardNavItems.length > 0) {
            dashboardNavItems.forEach(item => {
                item.style.display = 'none';
            });
            console.log('Dashboard hidden for Marketing Clerk');
        }
    }

    // Get current role from localStorage or URL
    getCurrentRole() {
        // Try to get from localStorage first
        const userRole = localStorage.getItem('user_role');
        if (userRole) {
            const roleLower = userRole.toLowerCase();
            if (roleLower.includes('marketing')) return 'marketing-clerk';
            if (roleLower.includes('finance')) return 'finance-officer';
            if (roleLower.includes('it') || roleLower.includes('head')) return 'it-head';
        }

        // Fallback to URL path
        const currentPath = window.location.pathname;
        if (currentPath.includes('marketingclerk')) return 'marketing-clerk';
        if (currentPath.includes('financeofficer')) return 'finance-officer';
        if (currentPath.includes('ithead')) return 'it-head';
        
        // Final fallback: try to get from user data
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const roleFromUser = (user.role_display_name || user.role || '').toLowerCase();
                if (roleFromUser.includes('marketing')) return 'marketing-clerk';
                if (roleFromUser.includes('finance')) return 'finance-officer';
                if (roleFromUser.includes('it') || roleFromUser.includes('head')) return 'it-head';
            } catch (e) {
                console.warn('Error parsing user data:', e);
            }
        }
        
        return 'marketing-clerk'; // default
    }

    // Set active navigation item based on current page
    setActiveNavigation() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop();
        const navItems = document.querySelectorAll('.nav-item');
        
        console.log('Setting active navigation:', {
            currentPath,
            currentPage,
            navItemsCount: navItems.length
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            
            // Check if this nav item corresponds to current page
            const href = item.getAttribute('href');
            
            console.log('Checking nav item:', {
                href,
                text: item.textContent.trim(),
                currentPage,
                currentPath
            });
            
            // Check for exact match first
            if (href === currentPage) {
                console.log('Exact match found:', href);
                item.classList.add('active');
            }
            // Check for full path match (for reports pages)
            else if (href === currentPath) {
                console.log('Full path match found:', href);
                item.classList.add('active');
            }
            // Check if current path contains the href (for reports pages with full paths)
            else if (href.includes('reports.html') && currentPath.includes('reports.html')) {
                console.log('Reports page match found:', href);
                item.classList.add('active');
            }
        });
    }

    // Initialize branch-specific display
    initializeBranchDisplay() {
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
            const currentRole = this.getCurrentRole();
            const roleName = this.roleConfigs[currentRole].name;
            
            if (isMainBranchUser) {
                userRoleElement.textContent = `${roleName} (Main Branch)`;
            } else {
                userRoleElement.textContent = `${roleName} (${userBranchName})`;
            }
        }
    }

    // Initialize dynamic user header
    initializeDynamicUserHeader() {
        // Get user data from localStorage
        const userRole = localStorage.getItem('user_role') || this.getCurrentRole();
        const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
        const userBranchLocation = localStorage.getItem('user_branch_location') || '';
        
        // Update user name (role) in header
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            const currentRole = this.getCurrentRole();
            userNameElement.textContent = this.roleConfigs[currentRole].name;
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

    // Session Management
    initializeSessionManagement() {
        // Set login time if not already set
        if (!localStorage.getItem('lastLoginTime')) {
            localStorage.setItem('lastLoginTime', Date.now().toString());
        }
        
        // Set last activity time
        this.updateLastActivity();
        
        // Add activity listeners
        document.addEventListener('mousedown', () => this.updateLastActivity());
        document.addEventListener('keydown', () => this.updateLastActivity());
        document.addEventListener('scroll', () => this.updateLastActivity());
        document.addEventListener('click', () => this.updateLastActivity());
    }

    // Update last activity timestamp
    updateLastActivity() {
        localStorage.setItem('lastActivityTime', Date.now().toString());
    }

    // Logout function - shows confirmation and spinning logo before redirecting
    logout() {
        // Show logout confirmation modal
        this.showLogoutConfirmation();
    }

    // Show logout confirmation modal
    showLogoutConfirmation() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'logout-modal-overlay';

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'logout-modal-content';

        modalContent.innerHTML = `
            <h2 class="logout-modal-title">Confirm Logout</h2>
            <p class="logout-modal-text">Are you sure you want to logout?</p>
            <div class="logout-modal-buttons">
                <button id="cancelLogout" class="logout-modal-cancel">Cancel</button>
                <button id="confirmLogout" class="logout-modal-confirm">Logout</button>
            </div>
        `;

        // CSS animations are now handled by the main CSS file

        // Add modal to page
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Add event listeners
        document.getElementById('cancelLogout').addEventListener('click', () => {
            this.closeLogoutModal();
        });

        document.getElementById('confirmLogout').addEventListener('click', () => {
            this.closeLogoutModal();
            this.performLogout();
        });

        // Close modal on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeLogoutModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeLogoutModal();
            }
        });
    }

    // Close logout modal
    closeLogoutModal() {
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
    async performLogout() {
        // Show logout loading with spinning logo
        this.showLogoutLoading();
        
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
        
        // Clear user session data
        this.clearUserSession();
        
        // Redirect to login page after showing loading
        setTimeout(() => {
            window.location.href = '/login';
        }, 3000);
    }

    // Clear user session data
    clearUserSession() {
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

    // Show logout loading with spinning logo
    showLogoutLoading() {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'logout-loading-overlay';

        // Create loading content
        const loadingContent = document.createElement('div');
        loadingContent.className = 'logout-loading-content';

        // Get role name with fallback logic
        let roleName = 'User';
        const currentRole = this.getCurrentRole();
        
        if (currentRole && this.roleConfigs[currentRole]) {
            roleName = this.roleConfigs[currentRole].name;
        } else {
            // Fallback: try to get role directly from localStorage
            const userRole = localStorage.getItem('user_role');
            if (userRole && userRole !== 'null' && userRole !== 'undefined') {
                roleName = userRole;
            } else {
                // Try to get from user data
                const userData = localStorage.getItem('user');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        const roleFromUser = user.role_display_name || user.role;
                        if (roleFromUser) {
                            // Map database role names to display names
                            const roleLower = roleFromUser.toLowerCase();
                            if (roleLower === 'it_head' || roleFromUser === 'IT Head') {
                                roleName = 'IT Head';
                            } else if (roleLower === 'finance_officer' || roleFromUser === 'Finance Officer') {
                                roleName = 'Finance Officer';
                            } else if (roleLower === 'marketing_clerk' || roleFromUser === 'Marketing Clerk') {
                                roleName = 'Marketing Clerk';
                            } else {
                                roleName = roleFromUser;
                            }
                        }
                    } catch (e) {
                        console.warn('Error parsing user data:', e);
                    }
                }
            }
        }

        loadingContent.innerHTML = `
            <div class="logout-loading-spinner">
                <img src="../../assets/logo.png" alt="IMVCMPC Logo" class="logout-spinning-logo">
            </div>
            <p class="logout-loading-text">Logging out as ${roleName}</p>
        `;

        loadingOverlay.appendChild(loadingContent);
        document.body.appendChild(loadingOverlay);
    }
}

// Add CSS animations for warnings
if (!document.getElementById('warning-styles')) {
    const warningStyles = document.createElement('style');
    warningStyles.id = 'warning-styles';
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
}

// Initialize shared utilities
const sharedUtils = new SharedUtils();

// Make logout function globally accessible
window.logout = () => sharedUtils.logout();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    sharedUtils.init();
});
