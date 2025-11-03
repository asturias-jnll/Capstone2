// IT Head Announcements JavaScript

let currentUser = null;
let announcements = [];
let activeAnnouncements = [];
let scheduledAnnouncements = [];
let archivedAnnouncements = [];
let branches = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeAnnouncements();
    loadAnnouncements();
    loadBranches();
});

function initializeAnnouncements() {
    checkAuthentication();
    initializeITHeadNavigation();
    initializeDynamicUserHeader();
    if (typeof initializeMobileDropdown === 'function') {
        initializeMobileDropdown();
    }
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
            logout();
            return;
        }
    } catch (error) {
        logout();
        return;
    }
}

async function loadAnnouncements() {
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/announcements', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            announcements = await response.json();
        } else {
            announcements = generateMockAnnouncements();
        }
        
        categorizeAnnouncements();
        displayAnnouncements();
    } catch (error) {
        console.error('Error loading announcements:', error);
        announcements = generateMockAnnouncements();
        categorizeAnnouncements();
        displayAnnouncements();
    }
}

function generateMockAnnouncements() {
    const anns = [];
    const types = ['maintenance', 'feature', 'security', 'general'];
    const statuses = ['active', 'scheduled', 'archived'];
    
    for (let i = 1; i <= 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 60));
        
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        anns.push({
            id: i,
            title: `Announcement ${i}`,
            content: `This is the content of announcement ${i}. This is a sample announcement for testing purposes.`,
            type: types[Math.floor(Math.random() * types.length)],
            priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            status: status,
            published_at: date.toISOString(),
            expires_at: status === 'archived' ? new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            target_branches: ['Main Branch', 'Branch 2'],
            recipients: ['finance_officers', 'marketing_clerks'],
            view_count: Math.floor(Math.random() * 500)
        });
    }
    
    return anns;
}

function categorizeAnnouncements() {
    const now = new Date();
    
    activeAnnouncements = announcements.filter(a => 
        a.status === 'active' && 
        new Date(a.published_at) <= now && 
        (!a.expires_at || new Date(a.expires_at) > now)
    ).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    
    scheduledAnnouncements = announcements.filter(a => 
        a.status === 'scheduled' || (a.published_at && new Date(a.published_at) > now)
    ).sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    
    archivedAnnouncements = announcements.filter(a => 
        a.status === 'archived' || (a.expires_at && new Date(a.expires_at) <= now)
    ).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    
    updateAnnouncementBadges();
}

function updateAnnouncementBadges() {
    document.getElementById('activeBadge').textContent = activeAnnouncements.length;
    document.getElementById('scheduledBadge').textContent = scheduledAnnouncements.length;
    document.getElementById('archivedBadge').textContent = archivedAnnouncements.length;
}

function displayAnnouncements() {
    displayAnnouncementTab('active', activeAnnouncements);
    displayAnnouncementTab('scheduled', scheduledAnnouncements);
    displayAnnouncementTab('archived', archivedAnnouncements);
}

function displayAnnouncementTab(tabName, announcements) {
    const containerId = `${tabName}AnnouncementsList`;
    const container = document.getElementById(containerId);
    
    if (announcements.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No ${tabName} announcements</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    announcements.forEach(ann => {
        const date = new Date(ann.published_at);
        const dateStr = date.toLocaleDateString();
        const priorityClass = `priority-${ann.priority}`;
        const typeIcon = getAnnouncementTypeIcon(ann.type);
        
        html += `
            <div class="announcement-card" onclick="viewAnnouncement(${ann.id})">
                <div class="announcement-header">
                    <div class="announcement-title-section">
                        <i class="${typeIcon}"></i>
                        <h3>${escapeHtml(ann.title)}</h3>
                    </div>
                    <span class="badge ${priorityClass}">${ann.priority}</span>
                </div>
                <div class="announcement-content">
                    <p>${escapeHtml(ann.content.substring(0, 100))}...</p>
                </div>
                <div class="announcement-footer">
                    <span class="date"><i class="fas fa-calendar"></i> ${dateStr}</span>
                    <span class="views"><i class="fas fa-eye"></i> ${ann.view_count} views</span>
                    <span class="type">${ann.type}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getAnnouncementTypeIcon(type) {
    const icons = {
        'maintenance': 'fas fa-wrench',
        'feature': 'fas fa-star',
        'security': 'fas fa-shield-alt',
        'general': 'fas fa-bell'
    };
    return icons[type] || 'fas fa-bell';
}

function switchAnnouncementTab(tabName) {
    document.querySelectorAll('.announcements-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.announcements-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.closest('.tab-btn').classList.add('active');
}

function showCreateAnnouncementModal() {
    document.getElementById('announcementModalTitle').textContent = 'Create Announcement';
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
    document.getElementById('announcementType').value = 'general';
    document.getElementById('announcementPriority').value = 'medium';
    document.getElementById('publishStatus').value = 'immediate';
    document.getElementById('scheduleField').style.display = 'none';
    
    document.getElementById('announcementModal').style.display = 'flex';
}

function updateTypeFields() {
    // Could add type-specific fields here
}

function updateScheduleFields() {
    const status = document.getElementById('publishStatus').value;
    const scheduleField = document.getElementById('scheduleField');
    
    if (status === 'scheduled') {
        scheduleField.style.display = 'block';
    } else {
        scheduleField.style.display = 'none';
    }
}

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
            branches = [
                { id: 1, name: 'Main Branch' },
                { id: 2, name: 'Branch 2' },
                { id: 3, name: 'Branch 3' }
            ];
        }
        
        displayBranchCheckboxes();
    } catch (error) {
        console.error('Error loading branches:', error);
        branches = [
            { id: 1, name: 'Main Branch' },
            { id: 2, name: 'Branch 2' },
            { id: 3, name: 'Branch 3' }
        ];
        displayBranchCheckboxes();
    }
}

function displayBranchCheckboxes() {
    const container = document.getElementById('targetBranchesList');
    
    let html = '';
    branches.forEach(branch => {
        html += `
            <label class="checkbox-label">
                <input type="checkbox" value="${branch.id}" checked> ${escapeHtml(branch.name)}
            </label>
        `;
    });
    
    container.innerHTML = html;
}

async function saveAnnouncement(event) {
    event.preventDefault();
    
    const announcementData = {
        title: document.getElementById('announcementTitle').value,
        content: document.getElementById('announcementContent').value,
        type: document.getElementById('announcementType').value,
        priority: document.getElementById('announcementPriority').value,
        status: document.getElementById('publishStatus').value,
        publish_date_time: document.getElementById('publishDateTime').value
    };
    
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/announcements', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(announcementData)
        });
        
        if (response.ok) {
            alert('Announcement created successfully');
            closeModal(null, 'announcementModal');
            loadAnnouncements();
        } else {
            alert('Error creating announcement');
        }
    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Error creating announcement: ' + error.message);
    }
}

function viewAnnouncement(id) {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;
    
    const date = new Date(announcement.published_at);
    const typeIcon = getAnnouncementTypeIcon(announcement.type);
    
    const html = `
        <div class="announcement-detail-section">
            <h3><i class="${typeIcon}"></i> ${escapeHtml(announcement.title)}</h3>
            <div class="detail-meta">
                <span class="badge priority-${announcement.priority}">${announcement.priority}</span>
                <span class="date">${date.toLocaleString()}</span>
                <span class="type">${announcement.type}</span>
            </div>
        </div>
        <div class="announcement-detail-section">
            <h4>Content</h4>
            <p>${escapeHtml(announcement.content)}</p>
        </div>
        <div class="announcement-detail-section">
            <h4>Distribution</h4>
            <p><strong>Target Branches:</strong> ${escapeHtml(announcement.target_branches.join(', '))}</p>
            <p><strong>Recipients:</strong> ${escapeHtml(announcement.recipients.join(', '))}</p>
        </div>
        <div class="announcement-detail-section">
            <h4>Statistics</h4>
            <p><strong>Views:</strong> ${announcement.view_count}</p>
            <p><strong>Status:</strong> ${announcement.status}</p>
        </div>
    `;
    
    document.getElementById('announcementDetailsContent').innerHTML = html;
    document.getElementById('viewAnnouncementTitle').textContent = 'Announcement Details';
    document.getElementById('viewAnnouncementModal').style.display = 'flex';
}

function editAnnouncement() {
    alert('Edit functionality not yet implemented');
}

function deleteAnnouncement() {
    if (confirm('Are you sure you want to delete this announcement?')) {
        alert('Delete functionality not yet implemented');
    }
}

function closeModal(event, modalId) {
    if (event) event.stopPropagation();
    document.getElementById(modalId).style.display = 'none';
}

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
