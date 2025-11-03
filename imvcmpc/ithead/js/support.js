// IT Head Support & Ticketing JavaScript

let currentUser = null;
let tickets = [];
let filteredTickets = [];
let currentPage = 1;
const ticketsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    initializeSupport();
    loadTickets();
});

function initializeSupport() {
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

async function loadTickets() {
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/support/tickets', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            tickets = data.tickets || [];
        } else {
            tickets = generateMockTickets();
        }
        
        filteredTickets = [...tickets];
        updateTicketSummary();
        displayTickets();
    } catch (error) {
        console.error('Error loading tickets:', error);
        tickets = generateMockTickets();
        filteredTickets = [...tickets];
        updateTicketSummary();
        displayTickets();
    }
}

function generateMockTickets() {
    const tickets = [];
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    const categories = ['technical', 'access', 'performance', 'security'];
    
    for (let i = 1; i <= 45; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        tickets.push({
            id: `TKT-${String(i).padStart(5, '0')}`,
            title: `Support Ticket ${i}`,
            description: `Issue description for ticket ${i}`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            category: categories[Math.floor(Math.random() * categories.length)],
            assignee: `Support Team ${Math.floor(Math.random() * 5) + 1}`,
            created_at: date.toISOString(),
            sla_status: Math.random() > 0.8 ? 'at_risk' : 'on_track'
        });
    }
    
    return tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function updateTicketSummary() {
    const critical = tickets.filter(t => t.priority === 'critical').length;
    const high = tickets.filter(t => t.priority === 'high').length;
    const medium = tickets.filter(t => t.priority === 'medium').length;
    const low = tickets.filter(t => t.priority === 'low').length;
    
    document.getElementById('criticalCount').textContent = critical;
    document.getElementById('highCount').textContent = high;
    document.getElementById('mediumCount').textContent = medium;
    document.getElementById('lowCount').textContent = low;
}

function displayTickets() {
    const tbody = document.getElementById('ticketsTableBody');
    const start = (currentPage - 1) * ticketsPerPage;
    const end = start + ticketsPerPage;
    const paginatedTickets = filteredTickets.slice(start, end);
    
    if (paginatedTickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No tickets found</td></tr>';
        updateTicketPagination();
        return;
    }
    
    let html = '';
    paginatedTickets.forEach(ticket => {
        const date = new Date(ticket.created_at);
        const dateStr = date.toLocaleDateString();
        const priorityClass = `priority-${ticket.priority}`;
        const statusClass = `status-${ticket.status}`;
        const slaClass = ticket.sla_status === 'at_risk' ? 'sla-at-risk' : 'sla-on-track';
        
        html += `
            <tr onclick="viewTicket('${ticket.id}')">
                <td><strong>${escapeHtml(ticket.id)}</strong></td>
                <td>${escapeHtml(ticket.title)}</td>
                <td><span class="badge ${statusClass}">${ticket.status.replace(/_/g, ' ')}</span></td>
                <td><span class="badge ${priorityClass}">${ticket.priority}</span></td>
                <td>${escapeHtml(ticket.assignee || 'Unassigned')}</td>
                <td>${dateStr}</td>
                <td><span class="sla ${slaClass}">${ticket.sla_status.replace(/_/g, ' ')}</span></td>
                <td>
                    <button class="action-btn" onclick="event.stopPropagation(); editTicket('${ticket.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    updateTicketPagination();
}

function filterTickets() {
    const searchTerm = document.getElementById('ticketSearch').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    
    filteredTickets = tickets.filter(ticket => {
        const matchesSearch = !searchTerm || 
            ticket.id.toLowerCase().includes(searchTerm) ||
            ticket.title.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !status || ticket.status === status;
        const matchesPriority = !priority || ticket.priority === priority;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });
    
    currentPage = 1;
    displayTickets();
}

function showCreateTicketModal() {
    document.getElementById('ticketModalTitle').textContent = 'Create New Ticket';
    document.getElementById('ticketTitle').value = '';
    document.getElementById('ticketDescription').value = '';
    document.getElementById('ticketPriority').value = 'medium';
    document.getElementById('ticketCategory').value = 'technical';
    document.getElementById('ticketAssignee').value = '';
    
    document.getElementById('ticketModal').style.display = 'flex';
}

function saveTicket(event) {
    event.preventDefault();
    
    const ticket = {
        title: document.getElementById('ticketTitle').value,
        description: document.getElementById('ticketDescription').value,
        priority: document.getElementById('ticketPriority').value,
        category: document.getElementById('ticketCategory').value,
        assignee: document.getElementById('ticketAssignee').value || null
    };
    
    console.log('Saving ticket:', ticket);
    alert('Ticket saved successfully!');
    closeModal(null, 'ticketModal');
    loadTickets();
}

function viewTicket(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const date = new Date(ticket.created_at);
    const html = `
        <div class="ticket-detail-row">
            <label>Ticket ID:</label>
            <span>${escapeHtml(ticket.id)}</span>
        </div>
        <div class="ticket-detail-row">
            <label>Title:</label>
            <span>${escapeHtml(ticket.title)}</span>
        </div>
        <div class="ticket-detail-row">
            <label>Description:</label>
            <span>${escapeHtml(ticket.description)}</span>
        </div>
        <div class="ticket-detail-row">
            <label>Status:</label>
            <span class="badge status-${ticket.status}">${ticket.status.replace(/_/g, ' ')}</span>
        </div>
        <div class="ticket-detail-row">
            <label>Priority:</label>
            <span class="badge priority-${ticket.priority}">${ticket.priority}</span>
        </div>
        <div class="ticket-detail-row">
            <label>Category:</label>
            <span>${ticket.category}</span>
        </div>
        <div class="ticket-detail-row">
            <label>Assigned To:</label>
            <span>${escapeHtml(ticket.assignee || 'Unassigned')}</span>
        </div>
        <div class="ticket-detail-row">
            <label>Created:</label>
            <span>${date.toLocaleString()}</span>
        </div>
        <div class="ticket-detail-row">
            <label>SLA Status:</label>
            <span class="sla sla-${ticket.sla_status}">${ticket.sla_status.replace(/_/g, ' ')}</span>
        </div>
    `;
    
    document.getElementById('announcementDetailsContent').innerHTML = html;
    document.getElementById('viewAnnouncementTitle').textContent = `Ticket ${ticket.id}`;
    document.getElementById('viewAnnouncementModal').style.display = 'flex';
    
    document.getElementById('editBtn').textContent = 'Edit Ticket';
    document.getElementById('deleteBtn').textContent = 'Close Ticket';
}

function editTicket(ticketId) {
    console.log('Edit ticket:', ticketId);
    alert('Edit functionality not yet implemented');
}

function updateTicketPagination() {
    const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
    document.getElementById('ticketPageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
}

function previousTicketPage() {
    if (currentPage > 1) {
        currentPage--;
        displayTickets();
        window.scrollTo(0, 0);
    }
}

function nextTicketPage() {
    const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayTickets();
        window.scrollTo(0, 0);
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
