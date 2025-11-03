// IT Head System Configuration JavaScript

let currentUser = null;
let branches = [];
let roles = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeSystemConfig();
});

function initializeSystemConfig() {
    checkAuthentication();
    initializeITHeadNavigation();
    initializeDynamicUserHeader();
    if (typeof initializeMobileDropdown === 'function') {
        initializeMobileDropdown();
    }
    loadBranches();
    loadRoles();
}

function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
        window.location.href = '../../logpage/login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(user);
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

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.config-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.closest('.tab-btn').classList.add('active');
}

// Branches Management
async function loadBranches() {
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/branches', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            branches = data.branches || [];
        } else {
            branches = generateMockBranches();
        }
        
        displayBranches();
    } catch (error) {
        console.error('Error loading branches:', error);
        branches = generateMockBranches();
        displayBranches();
    }
}

function generateMockBranches() {
    return [
        { id: 1, name: 'Main Branch', location: 'IBAAN', is_main_branch: true, address: 'Main St', contact_number: '123-456-7890', email: 'main@imvcmpc.org', manager_name: 'Juan Dela Cruz' },
        { id: 2, name: 'Branch 2', location: 'BAUAN', is_main_branch: false, address: 'Branch St', contact_number: '123-456-7891', email: 'branch2@imvcmpc.org', manager_name: 'Maria Santos' },
        { id: 3, name: 'Branch 3', location: 'SAN JOSE', is_main_branch: false, address: 'Branch Ave', contact_number: '123-456-7892', email: 'branch3@imvcmpc.org', manager_name: 'Pedro Garcia' }
    ];
}

function displayBranches() {
    const branchesList = document.getElementById('branchesList');
    
    if (branches.length === 0) {
        branchesList.innerHTML = '<p class="empty-message">No branches found</p>';
        return;
    }
    
    let html = '<div class="branches-grid">';
    branches.forEach(branch => {
        const mainBadge = branch.is_main_branch ? '<span class="badge badge-main">Main</span>' : '';
        html += `
            <div class="branch-card">
                <div class="branch-header">
                    <h3>${escapeHtml(branch.name)} ${mainBadge}</h3>
                    <div class="branch-actions">
                        <button class="action-btn" onclick="editBranch(${branch.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="deleteBranch(${branch.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="branch-details">
                    <p><strong>Location:</strong> ${escapeHtml(branch.location)}</p>
                    <p><strong>Address:</strong> ${escapeHtml(branch.address)}</p>
                    <p><strong>Manager:</strong> ${escapeHtml(branch.manager_name)}</p>
                    <p><strong>Contact:</strong> ${escapeHtml(branch.contact_number)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(branch.email)}</p>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    branchesList.innerHTML = html;
}

function showAddBranchModal() {
    document.getElementById('addBranchModal').style.display = 'flex';
}

async function saveBranch(event) {
    event.preventDefault();
    
    const branchData = {
        name: document.getElementById('branchName').value,
        location: document.getElementById('branchLocation').value,
        address: document.getElementById('branchAddress').value,
        manager_name: document.getElementById('branchManager').value,
        contact_number: document.getElementById('branchContact').value
    };
    
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/branches', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(branchData)
        });
        
        if (response.ok) {
            alert('Branch added successfully');
            closeModal(null, 'addBranchModal');
            loadBranches();
        } else {
            alert('Error adding branch');
        }
    } catch (error) {
        console.error('Error saving branch:', error);
        alert('Error adding branch: ' + error.message);
    }
}

function editBranch(id) {
    alert('Edit functionality not yet implemented for branch ' + id);
}

function deleteBranch(id) {
    if (confirm('Are you sure you want to delete this branch?')) {
        alert('Delete functionality not yet implemented for branch ' + id);
    }
}

// Roles Management
async function loadRoles() {
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/roles', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            roles = data.roles || [];
        } else {
            roles = generateMockRoles();
        }
        
        displayRoles();
    } catch (error) {
        console.error('Error loading roles:', error);
        roles = generateMockRoles();
        displayRoles();
    }
}

function generateMockRoles() {
    return [
        { id: 1, name: 'finance_officer', display_name: 'Finance Officer', description: 'Manages financial transactions and reports' },
        { id: 2, name: 'marketing_clerk', display_name: 'Marketing Clerk', description: 'Manages marketing data and analytics' },
        { id: 3, name: 'it_head', display_name: 'IT Head', description: 'System administrator and IT operations' }
    ];
}

function displayRoles() {
    const rolesList = document.getElementById('rolesList');
    
    if (roles.length === 0) {
        rolesList.innerHTML = '<p class="empty-message">No roles found</p>';
        return;
    }
    
    let html = '<div class="roles-grid">';
    roles.forEach(role => {
        html += `
            <div class="role-card">
                <div class="role-header">
                    <h3>${escapeHtml(role.display_name)}</h3>
                    <div class="role-actions">
                        <button class="action-btn" onclick="editRole(${role.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="deleteRole(${role.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="role-details">
                    <p><strong>System Name:</strong> ${escapeHtml(role.name)}</p>
                    <p><strong>Description:</strong> ${escapeHtml(role.description)}</p>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    rolesList.innerHTML = html;
}

function showAddRoleModal() {
    document.getElementById('addRoleModal').style.display = 'flex';
}

async function saveRole(event) {
    event.preventDefault();
    
    const roleData = {
        name: document.getElementById('roleName').value,
        display_name: document.getElementById('roleDisplayName').value,
        description: document.getElementById('roleDescription').value
    };
    
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/roles', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roleData)
        });
        
        if (response.ok) {
            alert('Role added successfully');
            closeModal(null, 'addRoleModal');
            loadRoles();
        } else {
            alert('Error adding role');
        }
    } catch (error) {
        console.error('Error saving role:', error);
        alert('Error adding role: ' + error.message);
    }
}

function editRole(id) {
    alert('Edit functionality not yet implemented for role ' + id);
}

function deleteRole(id) {
    if (confirm('Are you sure you want to delete this role?')) {
        alert('Delete functionality not yet implemented for role ' + id);
    }
}

// Settings Management
function saveSettings() {
    const settings = {
        minPasswordLength: document.getElementById('minPasswordLength').value,
        requireUppercase: document.getElementById('requireUppercase').checked,
        requireNumbers: document.getElementById('requireNumbers').checked,
        requireSpecialChars: document.getElementById('requireSpecialChars').checked,
        sessionTimeout: document.getElementById('sessionTimeout').value,
        maxSessions: document.getElementById('maxSessions').value,
        maintenanceMode: document.getElementById('maintenanceMode').checked,
        enable2FA: document.getElementById('enable2FA').checked,
        enableAuditLog: document.getElementById('enableAuditLog').checked
    };
    
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    alert('Settings saved successfully');
}

function resetSettings() {
    document.getElementById('minPasswordLength').value = '8';
    document.getElementById('requireUppercase').checked = true;
    document.getElementById('requireNumbers').checked = true;
    document.getElementById('requireSpecialChars').checked = false;
    document.getElementById('sessionTimeout').value = '30';
    document.getElementById('maxSessions').value = '3';
    document.getElementById('maintenanceMode').checked = false;
    document.getElementById('enable2FA').checked = false;
    document.getElementById('enableAuditLog').checked = true;
}

function closeModal(event, modalId) {
    if (event) event.stopPropagation();
    document.getElementById(modalId).style.display = 'none';
}

// Common functions
function initializeITHeadNavigation() {
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navMenu) return;
    
    if (navMenu.dataset.populated === 'true') {
        setActiveNavigation();
        return;
    }
    
    navMenu.innerHTML = '';
    
    const navItems = [
        { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
        { href: 'usermanagement.html', icon: 'fas fa-users-cog', text: 'User Management' },
        { href: 'auditlogs.html', icon: 'fas fa-history', text: 'Audit Logs' },
        { href: 'systemconfig.html', icon: 'fas fa-sliders-h', text: 'System Config' },
        { href: 'support.html', icon: 'fas fa-ticket-alt', text: 'Support' },
        { href: 'reports.html', icon: 'fas fa-chart-bar', text: 'Reports' },
        { href: 'announcements.html', icon: 'fas fa-bullhorn', text: 'Announcements' }
    ];
    
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
    
    navMenu.dataset.populated = 'true';
    setActiveNavigation();
    navMenu.style.display = '';
}

function setActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        const cleanHref = href.replace(/^\.\//, '').split('/').pop();
        const cleanCurrent = currentPage.replace(/^\.\//, '');
        
        if (cleanHref === cleanCurrent) {
            item.classList.add('active');
        }
    });
}

function initializeDynamicUserHeader() {
    const userRole = localStorage.getItem('user_role') || 'IT Head';
    const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
    const userBranchLocation = localStorage.getItem('user_branch_location') || 'IBAAN';
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) userNameElement.textContent = userRole;
    
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        userRoleElement.textContent = `IMVCMPC - ${userBranchName} ${userBranchLocation}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
