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
        { href: 'usermanagement.html', icon: 'fas fa-users-cog', text: 'User Management' },
        { href: 'analytics.html', icon: 'fas fa-chart-line', text: 'Analytics' },
        { href: 'reports.html', icon: 'fas fa-file-alt', text: 'Reports' }
    ];
    
    // Generate navigation HTML
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
        
        // Remove leading ./ or current directory
        const cleanHref = href.replace(/^\.\//, '').split('/').pop();
        const cleanCurrent = currentPage.replace(/^\.\//, '');
        
        if (cleanHref === cleanCurrent) {
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

// Initialize dashboard
function initializeDashboard() {
    checkAuthentication();
}

// Check authentication and redirect
function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
        window.location.href = '../../logpage/login.html';
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
        
        // Redirect to user management page if on main.html
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'main.html') {
            window.location.href = 'usermanagement.html';
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
        return;
    }
}
