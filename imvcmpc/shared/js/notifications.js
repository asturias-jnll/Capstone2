// Notifications Management System - Connected to Backend API
// API Configuration
const API_BASE_URL = '/api/auth';

// Current state
let currentFilter = 'all';
let currentNotification = null;
let allNotifications = [];

// Map backend type 'warning' (any case) to display as 'important'
function mapTypeForDisplay(type) {
    const t = (type || '').toString().toLowerCase();
    return t === 'warning' ? 'important' : t;
}

// Initialize notifications when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupFilterEventListeners();
    setupNotificationEventListeners();
    loadNotificationsFromAPI();
    
    // Refresh notifications every 30 seconds
    setInterval(loadNotificationsFromAPI, 30000);
});

// Setup filter button event listeners
function setupFilterEventListeners() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterType = this.getAttribute('data-filter');
            currentFilter = filterType;
            filterNotifications(filterType);
        });
    });
}

// Setup notification item event listeners
function setupNotificationEventListeners() {
    document.addEventListener('click', async function(e) {
        // Handle notification click
        if (e.target.closest('.notification-item')) {
            const notificationItem = e.target.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            
            // Find the notification
            const notification = allNotifications.find(n => n.id === notificationId);
            if (notification) {
                // Show modal for important notifications: change request or report request
                if (notification.category === 'important' && (notification.reference_type === 'change_request' || notification.reference_type === 'report_request')) {
                    showNotificationModal(notification);
                } else {
                    // For other notifications, just mark as read
                    await markAsRead(notificationId);
                }
        }
        }
    });
}

// Load notifications from API
async function loadNotificationsFromAPI() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('❌ No access token found');
            showEmptyState();
            return;
        }

        console.log('📡 Fetching notifications from:', `${API_BASE_URL}/notifications`);

        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();
        console.log('📋 Notifications data:', data);
        
        if (data.success) {
            allNotifications = data.data || [];
            console.log(`✅ Loaded ${allNotifications.length} notifications`);
            displayNotifications(allNotifications);
            updateNotificationCounts();
            
            // Update notification count for both roles
            const userRole = localStorage.getItem('user_role');
            if ((userRole === 'Marketing Clerk' || userRole === 'Finance Officer') && typeof updateNotificationCount === 'function') {
                await updateNotificationCount();
            }
        } else {
            console.error('❌ API returned success=false:', data);
            showEmptyState();
        }
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        showEmptyState();
    }
}

// Display notifications in the UI
function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const notificationsEmpty = document.getElementById('notificationsEmpty');
    
    if (!notificationsList) return;
    
    if (notifications.length === 0) {
        notificationsList.style.display = 'none';
        notificationsEmpty.style.display = 'flex';
        return;
    }
    
    notificationsList.style.display = 'block';
    notificationsEmpty.style.display = 'none';
    notificationsList.innerHTML = '';
    
    notifications.forEach(notification => {
        const notificationItem = createNotificationItem(notification);
        notificationsList.appendChild(notificationItem);
    });
}

// Create a single notification item
function createNotificationItem(notification) {
    const notificationItem = document.createElement('div');
    
    const isUnread = !notification.isRead;
    const isPending = (notification.status === 'pending');
    const isHighlighted = notification.is_highlighted;
    const isImportant = notification.category === 'important';
    
    // Use only state-driven classes for container coloring
    const shouldShowAsUnread = isUnread || isPending || isHighlighted;
    notificationItem.className = `notification-item ${shouldShowAsUnread ? 'unread' : 'read'} ${isHighlighted ? 'highlighted' : ''}`;
    notificationItem.setAttribute('data-id', notification.id);
    notificationItem.setAttribute('data-category', notification.category);
    notificationItem.setAttribute('data-type', mapTypeForDisplay(notification.type));
    
    const timeAgo = getTimeAgo(notification.timestamp);
    const typeClass = mapTypeForDisplay(notification.type);
    
    notificationItem.innerHTML = `
        <div class="notification-header">
            <div>
                <div class="notification-title">${notification.title}</div>
                <div class="notification-meta">
                    <span class="notification-type ${typeClass}">
                        <i class="fas fa-${getTypeIcon(typeClass)}"></i>
                        ${typeClass}
                    </span>
                    <span class="notification-time">${timeAgo}</span>
                </div>
            </div>
        </div>
        <div class="notification-content">${notification.content}</div>
    `;
    
    return notificationItem;
}

// Get appropriate icon for notification type
function getTypeIcon(type) {
    const icons = {
        'info': 'info-circle',
        'warning': 'exclamation-triangle',
        'important': 'exclamation-triangle',
        'error': 'times-circle',
        'success': 'check-circle'
    };
    return icons[type] || 'bell';
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Filter notifications based on selected filter
function filterNotifications(filterType) {
    let filteredNotifications = [];
    
    // Show all notifications (no filtering by reference_type)
    const validNotifications = allNotifications;
    
    switch (filterType) {
        case 'unread':
            filteredNotifications = validNotifications.filter(n => !n.isRead);
            break;
        case 'important':
            filteredNotifications = validNotifications.filter(n => n.category === 'important');
            break;
        case 'system':
            filteredNotifications = validNotifications.filter(n => n.category === 'system');
            break;
        default: // 'all'
            filteredNotifications = validNotifications;
            break;
    }
    
    displayNotifications(filteredNotifications);
}

// Update notification counts
function updateNotificationCounts() {
    const userRole = localStorage.getItem('user_role');
    
    // Count unread notifications (all roles)
    const unreadCount = allNotifications.filter(n => !n.isRead).length;
    
    // Update Unread filter badge
    const unreadBadge = document.getElementById('unreadFilterBadge');
    if (unreadBadge) {
        unreadBadge.textContent = unreadCount;
        unreadBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        console.log('🔔 Updated Unread filter badge:', unreadCount);
    }
    
    // Important filter badge logic differs by role
    if (userRole === 'Finance Officer') {
        // FO: Show unread + highlighted important notifications
        // Badge only disappears when action is taken (status changes from pending)
        const importantCount = allNotifications.filter(n => 
            n.category === 'important' && 
            n.reference_type === 'change_request' &&
            n.status === 'pending' && // Only pending requests
            n.is_highlighted
        ).length;
        
        const importantBadge = document.getElementById('importantFilterBadge');
        if (importantBadge) {
            importantBadge.textContent = importantCount;
            importantBadge.style.display = importantCount > 0 ? 'inline-block' : 'none';
            console.log('🔔 Updated FO Important filter badge:', importantCount);
        }
    } else if (userRole === 'Marketing Clerk') {
        // MC: Don't show badge on Important filter
        const importantBadge = document.getElementById('importantFilterBadge');
        if (importantBadge) {
            importantBadge.style.display = 'none';
            console.log('🔔 MC Important filter badge hidden');
        }
    }
    
    // Update existing important badge (if it exists) - legacy support
    const importantCountLegacy = allNotifications.filter(n => 
        n.category === 'important' && 
        n.is_highlighted && 
        n.status === 'pending'
    ).length;
    
    const importantBadgeLegacy = document.getElementById('importantCount');
    if (importantBadgeLegacy) {
        importantBadgeLegacy.textContent = importantCountLegacy;
        importantBadgeLegacy.style.display = importantCountLegacy > 0 ? 'inline-block' : 'none';
    }
}

// Show notification modal
function showNotificationModal(notification) {
    currentNotification = notification;
    
    const modal = document.getElementById('notificationModal');
    const modalHeaderTitle = document.getElementById('modalTitle');
    const modalDetailTitle = document.getElementById('modalNotificationTitle');
    const modalType = document.getElementById('modalNotificationType');
    const modalTime = document.getElementById('modalNotificationTime');
    const modalContent = document.getElementById('modalNotificationContent');
    
    if (modal && modalHeaderTitle && modalType && modalTime && modalContent) {
        // Minimalist: put the specific notification title in the header
        modalHeaderTitle.textContent = notification.title;
        // Hide the duplicate detail title to avoid redundancy
        if (modalDetailTitle) {
            modalDetailTitle.style.display = 'none';
        }
        const mappedType = mapTypeForDisplay(notification.type);
        modalType.textContent = mappedType;
        modalType.className = `notification-detail-type ${mappedType}`;
        modalTime.textContent = getTimeAgo(notification.timestamp);
        modalContent.textContent = notification.content;
        
        // Show appropriate buttons based on notification status
        const initialButtons = document.getElementById('initialButtons');
        const actionTakenButtons = document.getElementById('actionTakenButtons');
        
        if (notification.status === 'completed') {
            // Show Close/Delete buttons for completed notifications
            if (initialButtons) initialButtons.style.display = 'none';
            if (actionTakenButtons) actionTakenButtons.style.display = 'flex';
        } else {
            // Show Later/Take Action buttons for pending notifications
            if (initialButtons) initialButtons.style.display = 'flex';
            if (actionTakenButtons) actionTakenButtons.style.display = 'none';
        }
        
        modal.style.display = 'flex';
        
        // Mark as read when opening modal
        markAsRead(notification.id, false); // false = don't refresh list yet
    }
}


// Close notification modal
function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentNotification = null;
}

// Handle "Later" button
function handleLater() {
    // Just close the modal, keep notification highlighted
    closeNotificationModal();
    // Refresh to show current state
    filterNotifications(currentFilter);
}

// Handle "Take Action" button
async function handleTakeAction() {
    if (currentNotification && currentNotification.reference_type === 'change_request') {
        // Store the data before closing modal (which sets currentNotification to null)
        const notificationId = currentNotification.id;
        const requestId = currentNotification.reference_id;
        
        // Close modal
        closeNotificationModal();
        
        // Mark as read first
        await markAsRead(notificationId, false);
        
        // Redirect to member data page with the request ID
        window.location.href = `memberdata.html?highlightRequest=${requestId}`;
    } else if (currentNotification && currentNotification.reference_type === 'report_request') {
        const notificationId = currentNotification.id;
        const requestId = currentNotification.reference_id;
        const metadata = currentNotification.metadata || {};

        // Close modal
        closeNotificationModal();

        // Mark as read
        await markAsRead(notificationId, false);

        // Prefer server-provided redirect; otherwise build fallback URL
        const redirectUrl = (metadata && metadata.redirect)
            ? metadata.redirect
            : `/marketingclerk/html/reports.html?from=report_request&requestId=${encodeURIComponent(requestId)}`;

        // Persist minimal prefill so Reports can hydrate if metadata lacks details
        try {
            sessionStorage.setItem('report_request_prefill', JSON.stringify({ requestId, metadata }));
        } catch (_) {}

        // Redirect to MC reports page
        window.location.href = redirectUrl;
    }
}

// Handle "Close" button (after action taken)
function handleClose() {
    closeNotificationModal();
    // Refresh to show current state
    filterNotifications(currentFilter);
}

// Handle "Delete" button (after action taken)
async function handleDelete() {
    if (currentNotification) {
        const notificationId = currentNotification.id;
        
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.error('No access token found');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            const data = await response.json();
            
            if (data.success) {
                // Remove from local array
                allNotifications = allNotifications.filter(n => n.id !== notificationId);
                
                // Close modal
                closeNotificationModal();
                
                // Refresh display
                filterNotifications(currentFilter);
                updateNotificationCounts();
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            alert('Failed to delete notification. Please try again.');
        }
    }
}

// Mark a notification as read
async function markAsRead(notificationId, refreshList = true) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to mark notification as read');
        }

        const data = await response.json();
        
        if (data.success) {
            // Update local state
            const notification = allNotifications.find(n => n.id === notificationId);
            if (notification) {
                notification.isRead = true;
                
                // If it's a completed notification, also unhighlight it
                if (notification.status === 'completed') {
                    notification.is_highlighted = false;
                    
                    // Update is_highlighted in database
                    try {
                        const highlightResponse = await fetch(`${API_BASE_URL}/notifications/${notificationId}/highlight`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ is_highlighted: false })
                        });
                        
                        if (highlightResponse.ok) {
                            console.log('✅ Unhighlighted completed notification:', notificationId);
                        }
                    } catch (highlightError) {
                        console.error('Error unhighlighting notification:', highlightError);
                    }
                }
            }
            
            if (refreshList) {
                // Refresh display
                filterNotifications(currentFilter);
                
                // Update notification count for both roles
                const userRole = localStorage.getItem('user_role');
                if ((userRole === 'Marketing Clerk' || userRole === 'Finance Officer') && typeof updateNotificationCount === 'function') {
                    await updateNotificationCount();
                }
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Unhighlight notification (called from member data when request is processed)
async function unhighlightNotification(changeRequestId) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            return;
        }

        // Find notification by reference_id
        const notification = allNotifications.find(n => 
            n.reference_type === 'change_request' && n.reference_id === changeRequestId
        );
        
        if (notification) {
            const response = await fetch(`${API_BASE_URL}/notifications/${notification.id}/highlight`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_highlighted: false })
            });

            if (response.ok) {
                // Update local state
                notification.is_highlighted = false;
                
                // Refresh display
                await loadNotificationsFromAPI();
            }
        }
    } catch (error) {
        console.error('Error unhighlighting notification:', error);
    }
}

// Show empty state
function showEmptyState() {
    const notificationsList = document.getElementById('notificationsList');
    const notificationsEmpty = document.getElementById('notificationsEmpty');
    
    if (notificationsList && notificationsEmpty) {
        notificationsList.style.display = 'none';
        notificationsEmpty.style.display = 'flex';
    }
}

// Make functions available globally
window.closeNotificationModal = closeNotificationModal;
window.handleLater = handleLater;
window.handleTakeAction = handleTakeAction;
window.unhighlightNotification = unhighlightNotification;