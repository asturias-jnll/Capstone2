// Member Data functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize member data
    initializeMemberData();
    
    // Set up event listeners
    setupEventListeners();
});

// Sample member data (in real app, this would come from API)
let members = [
    // Branch 1 - IBAAN (Main Branch)
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
        name: "Carmen Santos",
        branch: "Branch 1",
        location: "IBAAN",
        savings: 38000,
        disbursement: 18000,
        total: 56000
    },
    {
        id: 5,
        name: "Roberto Torres",
        branch: "Branch 1",
        location: "IBAAN",
        savings: 45000,
        disbursement: 22000,
        total: 67000
    },
    {
        id: 6,
        name: "Luz Villanueva",
        branch: "Branch 1",
        location: "IBAAN",
        savings: 32000,
        disbursement: 16000,
        total: 48000
    }
];

let currentMembers = [...members];
let editingMemberId = null;

// Initialize member data
function initializeMemberData() {
    // Generate comprehensive branch-specific data
    generateBranchSpecificMembers();
    
    // Filter members based on user's branch
    filterMembersByUserBranch();
    
    renderMemberTable();
}

// Generate comprehensive branch-specific member data
function generateBranchSpecificMembers() {
    const branchData = {
        2: { // Bauan
            names: ['Maria Santos', 'Juan Dela Cruz', 'Ana Reyes', 'Pedro Mendoza', 'Carmen Garcia', 'Roberto Torres', 'Luz Villanueva', 'Miguel Lopez', 'Isabela Cruz', 'Antonio Santos'],
            baseSavings: 28000,
            baseDisbursement: 12000
        },
        3: { // San Jose
            names: ['Jose Rizal', 'Gabriela Silang', 'Andres Bonifacio', 'Melchora Aquino', 'Lapu-Lapu', 'Tandang Sora', 'Gregorio Del Pilar', 'Mariano Gomez', 'Jacinta Zamora', 'Jose Burgos'],
            baseSavings: 42000,
            baseDisbursement: 22000
        },
        4: { // Rosario
            names: ['Isabela Basa', 'Mariano Ponce', 'Marcelo Del Pilar', 'Graciano Lopez', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban', 'Rafael Palma', 'Teodoro Kalaw', 'Tomas Mapua'],
            baseSavings: 25000,
            baseDisbursement: 10000
        },
        5: { // San Juan
            names: ['Emilio Aguinaldo', 'Apolinario Mabini', 'Miguel Malvar', 'Artemio Ricarte', 'Macario Sakay', 'Gregoria De Jesus', 'Marina Dizon', 'Paciano Rizal', 'Trinidad Rizal', 'Josefa Rizal'],
            baseSavings: 22000,
            baseDisbursement: 9000
        },
        6: { // Taysan
            names: ['Santiago Alvarez', 'Mariano Alvarez', 'Pio Valenzuela', 'Jose Dizon', 'Josefa Llanes', 'Gregoria De Jesus', 'Marina Dizon', 'Candido Tirona', 'Vicente Lim', 'Jose Abad Santos'],
            baseSavings: 30000,
            baseDisbursement: 15000
        },
        7: { // Lobo
            names: ['Emilio Jacinto', 'Andres Bonifacio', 'Gregoria De Jesus', 'Procopio Bonifacio', 'Procorpio Bonifacio', 'Maximino Bonifacio', 'Espiridiona Bonifacio', 'Santiago Bonifacio', 'Troadio Bonifacio', 'Ciriaco Bonifacio'],
            baseSavings: 28000,
            baseDisbursement: 14000
        },
        8: { // Calaca
            names: ['Jose Rizal', 'Marcelo Del Pilar', 'Graciano Lopez', 'Mariano Ponce', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban', 'Rafael Palma', 'Teodoro Kalaw', 'Tomas Mapua'],
            baseSavings: 32000,
            baseDisbursement: 16000
        },
        9: { // Lemery
            names: ['Emilio Aguinaldo', 'Apolinario Mabini', 'Miguel Malvar', 'Artemio Ricarte', 'Macario Sakay', 'Gregoria De Jesus', 'Marina Dizon', 'Paciano Rizal', 'Trinidad Rizal', 'Josefa Rizal'],
            baseSavings: 24000,
            baseDisbursement: 12000
        },
        10: { // Agoncillo
            names: ['Santiago Alvarez', 'Mariano Alvarez', 'Pio Valenzuela', 'Jose Dizon', 'Josefa Llanes', 'Gregoria De Jesus', 'Marina Dizon', 'Candido Tirona', 'Vicente Lim', 'Jose Abad Santos'],
            baseSavings: 26000,
            baseDisbursement: 13000
        },
        11: { // San Nicolas
            names: ['Emilio Jacinto', 'Andres Bonifacio', 'Gregoria De Jesus', 'Procopio Bonifacio', 'Procorpio Bonifacio', 'Maximino Bonifacio', 'Espiridiona Bonifacio', 'Santiago Bonifacio', 'Troadio Bonifacio', 'Ciriaco Bonifacio'],
            baseSavings: 29000,
            baseDisbursement: 14500
        },
        12: { // Taal
            names: ['Jose Rizal', 'Marcelo Del Pilar', 'Graciano Lopez', 'Mariano Ponce', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban', 'Rafael Palma', 'Teodoro Kalaw', 'Tomas Mapua'],
            baseSavings: 31000,
            baseDisbursement: 15500
        }
    };

    // Generate members for each branch
    Object.keys(branchData).forEach(branchId => {
        const branchInfo = branchData[branchId];
        const branchName = `Branch ${branchId}`;
        const branchLocation = getLocationFromBranch(branchName);
        
        branchInfo.names.forEach((name, index) => {
            const memberId = parseInt(branchId) * 100 + index + 1;
            
            // Generate realistic variations in savings and disbursements
            const savingsVariation = (Math.random() - 0.5) * 0.4; // ±20% variation
            const disbursementVariation = (Math.random() - 0.5) * 0.3; // ±15% variation
            
            const savings = Math.round(branchInfo.baseSavings * (1 + savingsVariation));
            const disbursement = Math.round(branchInfo.baseDisbursement * (1 + disbursementVariation));
            
            const member = {
                id: memberId,
                name: name,
                branch: branchName,
                location: branchLocation,
                savings: savings,
                disbursement: disbursement,
                total: savings + disbursement
            };
            
            members.push(member);
        });
    });
}

// Filter members based on user's branch
function filterMembersByUserBranch() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    if (!isMainBranchUser && userBranchName) {
        // Filter members to show only those from user's branch
        currentMembers = members.filter(member => member.branch === userBranchName);
        
        // Update page title and description
        updateMemberDataHeader(userBranchName);
        
        // Hide branch filter for branch-specific users
        hideBranchFilter();
    } else {
        // Main branch users see all members
        currentMembers = [...members];
    }
}

// Update member data header based on branch
function updateMemberDataHeader(branchName) {
    const headerTitle = document.querySelector('.member-header h1');
    if (headerTitle) {
        headerTitle.textContent = `${branchName} Branch Member Data`;
    }
}

// Hide branch filter for branch-specific users
function hideBranchFilter() {
    const branchFilter = document.getElementById('branchFilter');
    if (branchFilter) {
        branchFilter.style.display = 'none';
    }
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
