// Member Data functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize member data
    initializeMemberData();
    
    // Set up event listeners
    setupEventListeners();
});

// Sample member data (in real app, this would come from API)
let members = [
    {
        id: 1,
        name: "Rita Helera",
        branch: "Branch 1",
        location: "IBAAN",
        savings: 34000,
        disbursement: 15000,
        total: 49000
    },
    {
        id: 2,
        name: "Jom Cortez",
        branch: "Branch 1",
        location: "IBAAN",
        savings: 40000,
        disbursement: 20000,
        total: 60000
    },
    {
        id: 3,
        name: "Alvin Aquino",
        branch: "Branch 1",
        location: "IBAAN",
        savings: 50000,
        disbursement: 25000,
        total: 75000
    },
    {
        id: 4,
        name: "Maria Santos",
        branch: "Branch 2",
        location: "BAUAN",
        savings: 28000,
        disbursement: 12000,
        total: 40000
    },
    {
        id: 5,
        name: "Juan Dela Cruz",
        branch: "Branch 2",
        location: "BAUAN",
        savings: 35000,
        disbursement: 18000,
        total: 53000
    },
    {
        id: 6,
        name: "Ana Garcia",
        branch: "Branch 3",
        location: "SAN JOSE",
        savings: 42000,
        disbursement: 22000,
        total: 64000
    }
];

let currentMembers = [...members];
let editingMemberId = null;

// Initialize member data
function initializeMemberData() {
    renderMemberTable();
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('memberSearch').addEventListener('input', function(e) {
        filterMembers();
    });
    
    // Branch filter
    document.getElementById('branchFilter').addEventListener('change', function(e) {
        filterMembers();
    });
    
    // Sort functionality
    document.getElementById('sortBy').addEventListener('change', function(e) {
        sortMembers();
    });
    
    // Member form submission
    document.getElementById('memberForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveMember();
    });
}

// Render member table
function renderMemberTable() {
    const tbody = document.getElementById('memberTableBody');
    
    if (currentMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No members found</td></tr>';
        return;
    }
    
    tbody.innerHTML = currentMembers.map(member => `
        <tr>
            <td>${member.name}</td>
            <td>${member.branch}</td>
            <td>${member.location}</td>
            <td>₱${member.savings.toLocaleString()}</td>
            <td>₱${member.disbursement.toLocaleString()}</td>
            <td>₱${member.total.toLocaleString()}</td>
            <td class="actions">
                <button class="action-btn edit-btn" onclick="editMember(${member.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteMember(${member.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter members
function filterMembers() {
    const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
    const branchFilter = document.getElementById('branchFilter').value;
    
    currentMembers = members.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm) ||
                            member.branch.toLowerCase().includes(searchTerm) ||
                            member.location.toLowerCase().includes(searchTerm);
        
        const matchesBranch = !branchFilter || member.branch === branchFilter;
        
        return matchesSearch && matchesBranch;
    });
    
    renderMemberTable();
}

// Sort members
function sortMembers() {
    const sortBy = document.getElementById('sortBy').value;
    
    currentMembers.sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'branch':
                return a.branch.localeCompare(b.branch);
            case 'savings':
                return b.savings - a.savings;
            case 'disbursement':
                return b.disbursement - a.disbursement;
            case 'total':
            default:
                return b.total - a.total;
        }
    });
    
    renderMemberTable();
}

// Open add member form
function openAddMemberForm() {
    editingMemberId = null;
    document.getElementById('memberFormTitle').textContent = 'Add Member';
    document.getElementById('memberForm').reset();
    document.getElementById('memberFormDialog').style.display = 'flex';
}

// Edit member
function editMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    editingMemberId = memberId;
    document.getElementById('memberFormTitle').textContent = 'Edit Member';
    
    // Populate form fields
    document.getElementById('memberName').value = member.name;
    document.getElementById('memberBranch').value = member.branch;
    document.getElementById('memberSavings').value = member.savings;
    document.getElementById('memberDisbursement').value = member.disbursement;
    
    document.getElementById('memberFormDialog').style.display = 'flex';
}

// Save member
function saveMember() {
    const name = document.getElementById('memberName').value.trim();
    const branch = document.getElementById('memberBranch').value;
    const savings = parseInt(document.getElementById('memberSavings').value);
    const disbursement = parseInt(document.getElementById('memberDisbursement').value);
    
    if (!name || !branch || isNaN(savings) || isNaN(disbursement)) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    if (editingMemberId) {
        // Update existing member
        const memberIndex = members.findIndex(m => m.id === editingMemberId);
        if (memberIndex !== -1) {
            members[memberIndex] = {
                ...members[memberIndex],
                name,
                branch,
                savings,
                disbursement,
                total: savings + disbursement
            };
        }
    } else {
        // Add new member
        const newMember = {
            id: Date.now(), // Simple ID generation
            name,
            branch,
            location: getLocationFromBranch(branch),
            savings,
            disbursement,
            total: savings + disbursement
        };
        members.push(newMember);
    }
    
    // Refresh the display
    filterMembers();
    closeMemberForm();
    
    // Show success message
    showSuccessMessage(editingMemberId ? 'Member updated successfully!' : 'Member added successfully!');
}

// Get location from branch
function getLocationFromBranch(branch) {
    const branchMap = {
        'Branch 1': 'IBAAN',
        'Branch 2': 'BAUAN',
        'Branch 3': 'SAN JOSE',
        'Branch 4': 'ROSARIO',
        'Branch 5': 'SAN JUAN',
        'Branch 6': 'PADRE GARCIA',
        'Branch 7': 'LIPA CITY',
        'Branch 8': 'BATANGAS CITY',
        'Branch 9': 'MABINI LIPA',
        'Branch 10': 'CALAMIAS',
        'Branch 11': 'LEMERY',
        'Branch 12': 'MATAAS NA KAHOY'
    };
    return branchMap[branch] || 'Unknown';
}

// Delete member
function deleteMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    // Store member info for confirmation
    window.memberToDelete = member;
    
    document.getElementById('deleteDialog').style.display = 'flex';
}

// Confirm delete
function confirmDelete() {
    const member = window.memberToDelete;
    if (!member) return;
    
    // Remove member from array
    members = members.filter(m => m.id !== member.id);
    
    // Refresh the display
    filterMembers();
    closeDeleteDialog();
    
    // Show success message
    showSuccessMessage(`Member "${member.name}" deleted successfully!`);
    
    // Clear stored member
    window.memberToDelete = null;
}

// Close member form
function closeMemberForm() {
    document.getElementById('memberFormDialog').style.display = 'none';
    editingMemberId = null;
}

// Close delete dialog
function closeDeleteDialog() {
    document.getElementById('deleteDialog').style.display = 'none';
    window.memberToDelete = null;
}

// Show success message
function showSuccessMessage(message) {
    // Create a simple success notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Export member data
function exportMemberData() {
    const csvContent = generateCSV();
    downloadCSV(csvContent, 'member_data.csv');
}

// Generate CSV content
function generateCSV() {
    const headers = ['Name', 'Branch', 'Location', 'Savings', 'Disbursement', 'Total'];
    const csvRows = [headers.join(',')];
    
    currentMembers.forEach(member => {
        const row = [
            member.name,
            member.branch,
            member.location,
            member.savings,
            member.disbursement,
            member.total
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
