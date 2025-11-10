// Shared Top Bar Functionality
// This file handles dynamic updates for the top bar across all pages

// Cache for branch data to avoid repeated API calls
let branchDataCache = null;
let branchDataPromise = null;

// Fetch branch data from API
async function fetchBranchData() {
    // Return cached data if available
    if (branchDataCache) {
        return branchDataCache;
    }
    
    // Return existing promise if already fetching
    if (branchDataPromise) {
        return branchDataPromise;
    }
    
    // Create new fetch promise
    branchDataPromise = (async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.warn('No access token found for fetching branch data');
                return {};
            }

            const response = await fetch('/api/auth/branches', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch branches:', response.status);
                return {};
            }

            const result = await response.json();
            if (!result.success || !result.branches || result.branches.length === 0) {
                console.log('No branches found');
                return {};
            }

            // Convert array to object keyed by branch ID
            const branchData = {};
            result.branches.forEach(branch => {
                branchData[branch.id.toString()] = {
                    name: branch.name,
                    location: branch.location,
                    contact: branch.contact_number || '+63 43 123 4567',
                    isMain: branch.is_main_branch || false
                };
            });

            // Cache the data
            branchDataCache = branchData;
            return branchData;
        } catch (error) {
            console.error('Error fetching branch data:', error);
            return {};
        } finally {
            // Clear promise so we can retry if needed
            branchDataPromise = null;
        }
    })();
    
    return branchDataPromise;
}

// Function to get user data from multiple sources
async function getUserData() {
    console.log('=== GETTING USER DATA FOR TOPBAR ===');
    
    // Try to get from localStorage first
    let userRole = localStorage.getItem('user_role');
    let userBranchId = localStorage.getItem('user_branch_id');
    let userBranchName = localStorage.getItem('user_branch_name');
    let userBranchLocation = localStorage.getItem('user_branch_location');
    let isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';

    console.log('localStorage values:');
    console.log('- user_role:', userRole);
    console.log('- user_branch_id:', userBranchId);
    console.log('- user_branch_name:', userBranchName);
    console.log('- user_branch_location:', userBranchLocation);
    console.log('- is_main_branch_user:', isMainBranchUser);

    // FIX: Correct the branch data based on location (fetch from API)
    if (userBranchLocation) {
        const branchData = await fetchBranchData();
        
        // Find the correct branch ID based on location
        const correctBranch = Object.entries(branchData).find(([id, data]) => 
            data.location === userBranchLocation
        );
        
        if (correctBranch) {
            const [correctId, correctData] = correctBranch;
            console.log(`Correcting branch data for location: ${userBranchLocation}`);
            console.log(`Correct branch ID: ${correctId}, Name: ${correctData.name}`);
            
            userBranchId = correctId;
            userBranchName = correctData.name;
            isMainBranchUser = correctData.isMain;
        }
    }

    // If not found, try to get from user object
    if (!userRole || !userBranchId) {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('User object from localStorage:', userData);
            
            userRole = userRole || userData.role_display_name || userData.role;
            userBranchId = userBranchId || userData.branch_id;
            userBranchName = userBranchName || userData.branch_name;
            userBranchLocation = userBranchLocation || userData.branch_location;
            isMainBranchUser = isMainBranchUser || userData.is_main_branch_user === true;
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }

    // If still not found, try to get from URL or other sources
    if (!userBranchId) {
        // Check if we can determine from current page context
        const currentPath = window.location.pathname;
        console.log('Current path:', currentPath);
        
        if (currentPath.includes('marketingclerk')) {
            userRole = userRole || 'Marketing Clerk';
        } else if (currentPath.includes('financeofficer')) {
            userRole = userRole || 'Finance Officer';
        }
    }

    // Default fallback
    userRole = userRole || 'User';
    userBranchId = userBranchId || '1';
    userBranchName = userBranchName || 'Main Branch';
    userBranchLocation = userBranchLocation || 'IBAAN';
    isMainBranchUser = isMainBranchUser || userBranchId === '1';

    console.log('Final user data:');
    console.log('- userRole:', userRole);
    console.log('- userBranchId:', userBranchId);
    console.log('- userBranchName:', userBranchName);
    console.log('- userBranchLocation:', userBranchLocation);
    console.log('- isMainBranchUser:', isMainBranchUser);

    return {
        userRole,
        userBranchId: userBranchId.toString(),
        userBranchName,
        userBranchLocation,
        isMainBranchUser
    };
}

// Function to update top bar information
async function updateTopBar() {
    console.log('=== UPDATING TOP BAR ===');
    
    const userData = await getUserData();
    const { userRole, userBranchId, userBranchLocation, isMainBranchUser } = userData;

    // Update Header - FIXED FORMAT
    updateElement('userName', userRole);
    const headerText = isMainBranchUser 
        ? `IMVCMPC - Main Branch ${userBranchLocation}`
        : `IMVCMPC - Branch ${userBranchId} ${userBranchLocation}`;
    updateElement('userRole', headerText);
    
    // Update dropdown content for mobile
    updateElement('dropdownUserName', userRole);
    updateElement('dropdownUserRole', headerText);

    console.log('Top bar updated successfully!');
}

// Helper function to update element text
function updateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
        console.log(`Updated ${id} to: ${text}`);
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
}

// Mobile dropdown toggle functionality
function initializeMobileDropdown() {
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    
    // Only initialize dropdown on mobile screens
    function isMobileScreen() {
        return window.innerWidth <= 768;
    }
    
    console.log('Initializing mobile dropdown...');
    console.log('User avatar found:', !!userAvatar);
    console.log('User dropdown found:', !!userDropdown);
    console.log('Is mobile screen:', isMobileScreen());
    
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Only show dropdown on mobile screens
            if (isMobileScreen()) {
                console.log('Avatar clicked! Toggling dropdown...');
                userDropdown.classList.toggle('show');
                console.log('Dropdown classes:', userDropdown.className);
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
        
        // Close dropdown on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                userDropdown.classList.remove('show');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (!isMobileScreen()) {
                userDropdown.classList.remove('show');
            }
        });
    } else {
        console.error('Could not find user avatar or dropdown elements');
    }
}

// Initialize top bar when page loads
function initializeTopBar() {
    console.log('Initializing top bar...');
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize mobile dropdown
    initializeMobileDropdown();
    
    // Update top bar immediately and after delays to ensure it works
    updateTopBar();
    setTimeout(updateTopBar, 100);
    setTimeout(updateTopBar, 500);
    setTimeout(updateTopBar, 1000);
}

// Make functions globally available
window.updateTopBar = updateTopBar;
window.updateDateTime = updateDateTime;
window.initializeTopBar = initializeTopBar;
