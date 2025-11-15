// IT Head Main JavaScript

// Ensure global currentUser is available (initialize from window scope if not exists)
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    
    // Initialize IT Head navigation immediately without delay
    requestAnimationFrame(() => {
        initializeITHeadNavigation();
        initializeDynamicUserHeader();
    });
    
    // Initialize mobile dropdown for top bar (hides user info on small screens)
    if (typeof initializeMobileDropdown === 'function') {
        initializeMobileDropdown();
    }
});

// Initialize IT Head specific navigation
function initializeITHeadNavigation() {
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navMenu) return;
    
    // Check if already populated to prevent multiple runs
    if (navMenu.dataset.populated === 'true') {
        setActiveNavigation();
        return;
    }
    
    // Clear existing navigation items
    navMenu.innerHTML = '';
    
    // IT Head navigation items
    const navItems = [
        { href: '/ithead/usermanagement', icon: 'fas fa-users-cog', text: 'User Management' },
        { href: '/ithead/analytics', icon: 'fas fa-chart-bar', text: 'Analytics' },
        { href: '/ithead/reports', icon: 'fas fa-file-alt', text: 'Reports' },
        { href: '/ithead/auditlogs', icon: 'fas fa-history', text: 'Audit Logs' }
    ];
    
    // Generate navigation HTML (no count badges)
    navItems.forEach(item => {
        const navItem = document.createElement('a');
        navItem.href = item.href;
        navItem.className = 'nav-item';
        navItem.innerHTML = `
            <i class="${item.icon}"></i>
            <span>${item.text}</span>
        `;
        navMenu.appendChild(navItem);
    });
    
    // Mark as populated to prevent re-running
    navMenu.dataset.populated = 'true';
    
    // Set active navigation after generating items
    setActiveNavigation();
    
    // Show navigation immediately after populating
    navMenu.style.display = '';
    
    // No badge checks needed
}

// Initialize dynamic user header
function initializeDynamicUserHeader() {
    const userRole = localStorage.getItem('user_role') || 'IT Head';
    const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
    const userBranchLocation = localStorage.getItem('user_branch_location') || 'IBAAN';
    
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
    
    // Update dropdown
    const dropdownUserName = document.getElementById('dropdownUserName');
    if (dropdownUserName) {
        dropdownUserName.textContent = userRole;
    }
    
    const dropdownUserRole = document.getElementById('dropdownUserRole');
    if (dropdownUserRole) {
        if (userBranchLocation) {
            dropdownUserRole.textContent = `IMVCMPC - ${userBranchName} ${userBranchLocation}`;
        } else {
            dropdownUserRole.textContent = `IMVCMPC - ${userBranchName}`;
        }
    }
}

// Set active navigation item
function setActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if (!href) return;
        
        // Extract filename from href (handle both relative and absolute paths)
        const cleanHref = href.replace(/^\.\//, '').split('/').pop();
        const cleanCurrent = currentPage.replace(/^\.\//, '');
        
        // Match by filename (works for any path structure)
        if (cleanHref === cleanCurrent) {
            item.classList.add('active');
        }
        // Also check if href ends with the current page filename (for absolute paths like /ithead/html/analytics.html)
        else if (cleanCurrent !== '' && (href.endsWith(cleanCurrent) || href.endsWith('/' + cleanCurrent))) {
            item.classList.add('active');
        }
    });
    
    // Also handle the Account link separately
    const accountLink = document.querySelector('a[href="account.html"]');
    if (accountLink) {
        if (currentPage === 'account.html') {
            accountLink.classList.add('active');
        } else {
            accountLink.classList.remove('active');
        }
    }
}

// Check and update reactivation badge in navigation
async function checkNavReactivationBadge() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            return;
        }

        const response = await fetch('/api/auth/reactivation-requests', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById('navReactivationBadge');
            
            if (badge) {
                if (data.success && data.requests && data.requests.length > 0) {
                    badge.textContent = data.requests.length;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error checking reactivation badge:', error);
    }
}

// Export function for use in other pages
window.checkNavReactivationBadge = checkNavReactivationBadge;

// Initialize dashboard
function initializeDashboard() {
    checkAuthentication();
}

// Check authentication and redirect
function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
        window.location.href = '/login';
        return;
    }
    
    try {
        window.currentUser = JSON.parse(user);
        
        // Verify user has IT Head role
        if (window.currentUser.role !== 'it_head') {
            console.error('Access denied: User is not an IT Head');
            logout();
            return;
        }
        
        // Redirect to user management page if on main page
        const currentPath = window.location.pathname;
        if (currentPath === '/ithead/main' || currentPath.endsWith('/ithead/main.html')) {
            window.location.href = '/ithead/usermanagement';
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
        return;
    }
}
