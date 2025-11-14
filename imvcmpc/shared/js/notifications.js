// Notifications Management System - Connected to Backend API
// API Configuration
const API_BASE_URL = '/api/auth';

// Current state
let currentFilter = 'all';
let currentNotification = null;
let allNotifications = [];
let currentPage = 1;
const notificationsPerPage = 20;

// Simple localStorage key for completed notifications
const COMPLETED_KEY = 'completed_notifications';

// Map backend type 'warning' (any case) to display as 'important'
// Map 'error' to 'rejected' and 'success' to 'approved'
// For specific system notifications, return 'system' instead of 'approved'
function mapTypeForDisplay(type, notification = null) {
    const t = (type || '').toString().toLowerCase();
    
    // Check if this is a system notification that should display as "System"
    if (notification && notification.category === 'system') {
        const systemReferenceTypes = [
            'reactivation_request',
            'password_reset',
            'profile_update',
            'password_change',
            'account_deactivation',
            'account_reactivation'
        ];
        if (systemReferenceTypes.includes(notification.reference_type)) {
            return 'system';
        }
    }
    
    if (t === 'warning') return 'important';
    if (t === 'error') return 'rejected';
    if (t === 'success') return 'approved';
    return t;
}

// Initialize notifications when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupFilterEventListeners();
    setupNotificationEventListeners();
    loadNotificationsFromAPI().then(() => {
        // Display all notifications initially
        displayNotifications(allNotifications);
    });
    
    // Refresh notifications every 30 seconds
    setInterval(loadNotificationsFromAPI, 30000);
    
    // Update timestamps every second for real-time display
    setInterval(updateAllTimestamps, 1000);
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

// Handle notification click (extracted to reusable function)
async function handleNotificationClick(notification, notificationItem) {
            const notificationId = notificationItem.getAttribute('data-id');
            
                // Always mark as read when clicked
                await markAsRead(notificationId, false);

                // Try to refresh this notification from the API for latest status (e.g., report_request -> completed)
                try {
                    const token = localStorage.getItem('access_token');
                    if (token) {
                        console.log('🔄 Refreshing notification:', notificationId);
                        const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            console.log('📥 Refreshed notification data:', data);
                            if (data && data.success && data.data) {
                                // Replace in local cache
                                const idx = allNotifications.findIndex(n => n.id === notificationId);
                                if (idx !== -1) {
                                    // Before replacing, check if notification is marked as completed in localStorage
                                    const completedIds = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
                                    const isCompleted = completedIds.includes(notificationId);
                                    
                                    // If completed, preserve the completed status
                                    if (isCompleted) {
                                        allNotifications[idx] = { ...data.data, status: 'completed', is_highlighted: false };
                                        notification = { ...data.data, status: 'completed', is_highlighted: false };
                                    } else {
                                        allNotifications[idx] = data.data;
                                        notification = data.data;
                                    }
                                    console.log('✅ Updated notification in cache. New status:', notification.status);
                                } else {
                                    // Notification not in cache, add it and preserve completed status if exists
                                    const completedIds = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
                                    const isCompleted = completedIds.includes(notificationId);
                                    
                                    let notificationData = data.data;
                                    if (isCompleted) {
                                        notificationData = { ...data.data, status: 'completed', is_highlighted: false };
                                        console.log('✅ Using fresh notification (not in cache) with completed status');
                                    } else {
                                        console.log('✅ Using fresh notification (not in cache). Status:', notificationData.status);
                                    }
                                    
                                    // Add to allNotifications array
                                    allNotifications.push(notificationData);
                                    notification = notificationData;
                                }
                            }
                        } else {
                            console.error('❌ Failed to refresh notification. Status:', res.status);
                        }
                    }
                } catch (refreshErr) {
                    console.warn('⚠️ Failed to refresh notification; proceeding with cached version.', refreshErr);
                }

                // Update UI based on notification status
                // For Finance Officer: clicking notification makes it read (no blue dot) but keeps green if not completed
                // For Marketing Clerk: clicking notification makes it read (white background)
                const userRole = localStorage.getItem('user_role');
    
    // Check if this is a change request approved/rejected notification
    const isChangeRequestApprovedRejected = notification.reference_type === 'change_request' && 
        (notification.title.includes('Approved') || notification.title.includes('Rejected'));
    
                if (userRole === 'Finance Officer') {
                    // FO: Remove blue dot but keep green background if not completed
                    notificationItem.classList.remove('unread');
                    notificationItem.classList.add('read');
                } else {
                    // MC: Remove blue dot and change to white background
        // Remove pending (green) for system notifications and change request approved/rejected
        // Keep green for important notifications that need action (pending change requests, report requests)
                    notificationItem.classList.remove('unread');
        if (notification.category === 'system' || isChangeRequestApprovedRejected) {
            // System notifications and change request approved/rejected: remove green background when read
            notificationItem.classList.remove('pending');
        }
        // Important notifications that need action keep their green background even when read
                    notificationItem.classList.add('read');
                }
    
    // Also update the notification object to reflect it's been read
    if (notification) {
        notification.isRead = true;
    }

                // Update the UI to reflect the read state
                filterNotifications(currentFilter);
                updateNotificationCounts();

                // Show modal for important notifications: change request, report request, or generated report
                if (notification.category === 'important' && (notification.reference_type === 'change_request' || notification.reference_type === 'report_request' || notification.reference_type === 'generated_report')) {
                    showNotificationModal(notification);
    } else if (notification.category === 'system') {
        // For system notifications (reactivation, password reset), show modal with details
        showNotificationModal(notification);
                }
                // For other notifications, they are already marked as read above
    
    // Update notification badge count after marking as read
    if ((userRole === 'Marketing Clerk' || userRole === 'Finance Officer') && typeof updateNotificationCount === 'function') {
        await updateNotificationCount();
    }
}

// Setup notification item event listeners
function setupNotificationEventListeners() {
    document.addEventListener('click', async function(e) {
        // Handle notification click
        if (e.target.closest('.notification-item')) {
            const notificationItem = e.target.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            
            // Find the notification
            let notification = allNotifications.find(n => n.id === notificationId);
            if (notification) {
                await handleNotificationClick(notification, notificationItem);
            }
        }
    });
}

// Load notifications from API
async function loadNotificationsFromAPI() {
    try {
        // Log notification view
        if (typeof AuditLogger !== 'undefined') {
            AuditLogger.logNotificationView();
        }
        
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
            
            // Log notification timestamps for debugging
            if (allNotifications.length > 0) {
                console.log('🕐 Notification timestamps sample:');
                allNotifications.slice(0, 3).forEach((notif, idx) => {
                    const now = new Date();
                    const notifTime = new Date(notif.timestamp);
                    const diffSeconds = Math.floor((now - notifTime) / 1000);
                    console.log(`  [${idx}] ID: ${notif.id}`);
                    console.log(`      Timestamp: ${notif.timestamp}`);
                    console.log(`      Current time: ${now.toISOString()}`);
                    console.log(`      Diff (seconds): ${diffSeconds}`);
                    console.log(`      Display: ${getTimeAgo(notif.timestamp)}`);
                });
            }
            
            // Apply completed status from localStorage
            const completedIds = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
            allNotifications = allNotifications.map(notification => {
                if (completedIds.includes(notification.id)) {
                    return { ...notification, status: 'completed', is_highlighted: false };
                }
                return notification;
            });
            
            console.log(`✅ Loaded ${allNotifications.length} notifications`);
            // Don't display all notifications here - let the calling function handle display
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

// Display notifications in the UI with pagination
function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const notificationsEmpty = document.getElementById('notificationsEmpty');
    
    if (!notificationsList) return;
    
    if (notifications.length === 0) {
        notificationsList.style.display = 'none';
        notificationsEmpty.style.display = 'flex';
        updatePaginationInfo(0, 0);
        return;
    }
    
    notificationsList.style.display = 'block';
    notificationsEmpty.style.display = 'none';
    
    // Calculate pagination
    const totalNotifications = notifications.length;
    const totalPages = Math.ceil(totalNotifications / notificationsPerPage);
    const startIndex = (currentPage - 1) * notificationsPerPage;
    const endIndex = Math.min(startIndex + notificationsPerPage, totalNotifications);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);
    
    // Update pagination info
    updatePaginationInfo(startIndex + 1, endIndex, totalNotifications);
    
    // Display paginated notifications
    notificationsList.innerHTML = '';
    paginatedNotifications.forEach(notification => {
        const notificationItem = createNotificationItem(notification);
        notificationsList.appendChild(notificationItem);
    });
}

// Create a single notification item
function createNotificationItem(notification) {
    const notificationItem = document.createElement('div');
    
    const isUnread = !notification.isRead;
    const isPending = (notification.status === 'pending');
    const isCompleted = (notification.status === 'completed');
    const isHighlighted = notification.is_highlighted;
    const isImportant = notification.category === 'important';
    
    // For Marketing Clerk: Green background until action is taken (status changes from pending)
    // Blue dot only shows for unread notifications
    // System notifications (reactivation, password reset): no green background when read
    // Change request approved/rejected: no green background when read
    // Important notifications that need action (pending change requests, report requests): keep green background even when read
    const shouldShowAsUnread = isUnread;
    const shouldShowAsPending = isPending; // Green background for pending notifications
    const shouldShowAsCompleted = isCompleted; // White background for completed notifications
    const isSystemNotification = notification.category === 'system';
    const isChangeRequestApprovedRejected = notification.reference_type === 'change_request' && 
        (notification.title.includes('Approved') || notification.title.includes('Rejected'));
    
    // Build class string based on state
    let classString = 'notification-item';
    
    // For completed notifications, always use 'read' class (no unread, no pending)
    if (shouldShowAsCompleted) {
        classString += ' read completed';
    } else if (shouldShowAsUnread) {
        classString += ' unread';
        if (shouldShowAsPending) {
            classString += ' pending';
        }
    } else {
        // Read notifications
        classString += ' read';
        // For system notifications and change request approved/rejected: don't show green background when read
        // For important notifications that need action: keep green background when read (they need action)
        if (shouldShowAsPending && !isSystemNotification && !isChangeRequestApprovedRejected) {
            classString += ' pending';
        }
    }
    
    if (isHighlighted) {
        classString += ' highlighted';
    }
    notificationItem.className = classString;
    notificationItem.setAttribute('data-id', notification.id);
    notificationItem.setAttribute('data-category', notification.category);
    notificationItem.setAttribute('data-type', mapTypeForDisplay(notification.type, notification));
    notificationItem.setAttribute('data-timestamp', notification.timestamp);
    
    const timeAgo = getTimeAgo(notification.timestamp);
    const typeClass = mapTypeForDisplay(notification.type, notification);
    
    notificationItem.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">${notification.title}</div>
        </div>
        <div class="notification-content-wrapper">
            <div class="notification-content">${notification.content}</div>
            <div class="notification-meta">
                <span class="notification-time">${timeAgo}</span>
                <span class="notification-type ${typeClass}">
                    <i class="fas fa-${getTypeIcon(typeClass)}"></i>
                    ${typeClass}
                </span>
            </div>
        </div>
    `;
    
    return notificationItem;
}

// Get appropriate icon for notification type
function getTypeIcon(type) {
    const icons = {
        'info': 'info-circle',
        'warning': 'exclamation-triangle',
        'important': 'exclamation-triangle',
        'rejected': 'times-circle',
        'approved': 'check-circle',
        'system': 'cog'
    };
    return icons[type] || 'bell';
}

// Get time ago string
function getTimeAgo(timestamp) {
    if (!timestamp) {
        console.warn('⚠️ No timestamp provided');
        return 'Just now';
    }
    
    const now = new Date();
    const notificationTime = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(notificationTime.getTime())) {
        console.error('❌ Invalid timestamp:', timestamp);
        return 'Just now';
    }
    
    let diffInMs = now - notificationTime;
    let diffInSeconds = Math.floor(diffInMs / 1000);
    
    // Handle timezone issue: if timestamp appears to be in the future (negative diff),
    // it's likely the database is storing Philippine time (UTC+8) as UTC
    // Adjust by subtracting 8 hours (28800 seconds) from the notification time
    if (diffInSeconds < 0) {
        // Adjust for Philippine timezone (UTC+8 = 8 hours = 28800 seconds)
        const adjustedTime = new Date(notificationTime.getTime() - (8 * 60 * 60 * 1000));
        diffInMs = now - adjustedTime;
        diffInSeconds = Math.floor(diffInMs / 1000);
        
        // If still negative after adjustment, just show "Just now"
        if (diffInSeconds < 0) {
            return 'Just now';
        }
    }
    
    if (diffInSeconds < 10) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} min ago`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

// Update all timestamps in real-time
function updateAllTimestamps() {
    // Update timestamps in notification list
    const notificationItems = document.querySelectorAll('.notification-item');
    
    if (notificationItems.length === 0) {
        return; // No notifications to update
    }
    
    notificationItems.forEach((item, index) => {
        const timestamp = item.getAttribute('data-timestamp');
        
        if (timestamp) {
            const timeElement = item.querySelector('.notification-time');
            if (timeElement) {
                const newTimeText = getTimeAgo(timestamp);
                

                
                timeElement.textContent = newTimeText;
            }
        }
    });
    
    // Update timestamp in modal if it's open
    const modal = document.getElementById('notificationModal');
    if (modal && modal.style.display !== 'none' && currentNotification) {
        const modalTime = document.getElementById('modalNotificationTime');
        if (modalTime && currentNotification.timestamp) {
            modalTime.textContent = getTimeAgo(currentNotification.timestamp);
        }
    }
}

// Filter notifications based on selected filter
function filterNotifications(filterType) {
    let filteredNotifications = [];
    
    // Show all notifications (no filtering by reference_type)
    const validNotifications = allNotifications;
    
    switch (filterType) {
        case 'unread':
            // To Do: notifications that need action (exclude system notifications and change request approved/rejected)
            filteredNotifications = validNotifications.filter(n => {
                // Exclude completed notifications
                if (n.status === 'completed') return false;
                // Exclude system notifications (reactivation, password reset)
                if (n.category === 'system') return false;
                // Exclude change request approved/rejected notifications
                if (n.reference_type === 'change_request' && 
                    (n.title.includes('Approved') || n.title.includes('Rejected'))) {
                    return false;
                }
                return true;
            });
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
    // Count unread notifications for "All" filter
    const allUnreadCount = allNotifications.filter(n => !n.isRead).length;
    
    // Count unactioned notifications for "To Do" filter (not completed, exclude system and change request approved/rejected)
    const unactionedCount = allNotifications.filter(n => {
        // Exclude completed notifications
        if (n.status === 'completed') return false;
        // Exclude system notifications (reactivation, password reset)
        if (n.category === 'system') return false;
        // Exclude change request approved/rejected notifications
        if (n.reference_type === 'change_request' && 
            (n.title.includes('Approved') || n.title.includes('Rejected'))) {
            return false;
        }
        return true;
    }).length;
    
    // Count unread system notifications
    const systemUnreadCount = allNotifications.filter(n => n.category === 'system' && !n.isRead).length;
    
    // Count unread important notifications
    const importantUnreadCount = allNotifications.filter(n => n.category === 'important' && !n.isRead).length;
    
    // Update All filter badge (show count of unread notifications)
    const allBadge = document.getElementById('allFilterBadge');
    if (allBadge) {
        allBadge.textContent = allUnreadCount;
        allBadge.style.display = allUnreadCount > 0 ? 'inline-block' : 'none';
    }
    
    // Update To Do filter badge (show count of unactioned notifications)
    const unreadBadge = document.getElementById('unreadFilterBadge');
    if (unreadBadge) {
        unreadBadge.textContent = unactionedCount;
        unreadBadge.style.display = unactionedCount > 0 ? 'inline-block' : 'none';
    }
    
    // Update Important filter badge
    const importantBadge = document.getElementById('importantFilterBadge');
    if (importantBadge) {
        importantBadge.textContent = importantUnreadCount;
        importantBadge.style.display = importantUnreadCount > 0 ? 'inline-block' : 'none';
    }
    
    // Update System filter badge
    const systemBadge = document.getElementById('systemFilterBadge');
    if (systemBadge) {
        systemBadge.textContent = systemUnreadCount;
        systemBadge.style.display = systemUnreadCount > 0 ? 'inline-block' : 'none';
    }
    
    // Hide any legacy badges
    const importantBadgeLegacy = document.getElementById('importantCount');
    if (importantBadgeLegacy) {
        importantBadgeLegacy.style.display = 'none';
    }
    
    // Count unread notifications for navbar badge (include unactioned + unread system notifications)
    const navbarBadgeCount = unactionedCount + systemUnreadCount;
    
    // Update navbar badge with unactioned count + unread system notifications
    if (typeof updateNotificationBadge === 'function') {
        updateNotificationBadge(navbarBadgeCount);
    }
    
    // Return unactioned count for navbar badge update
    return unactionedCount;
}

// Show notification modal
function showNotificationModal(notification) {
    currentNotification = notification;
    
    console.log('🔔 showNotificationModal called with:', {
        id: notification.id,
        title: notification.title,
        reference_type: notification.reference_type,
        status: notification.status,
        category: notification.category
    });
    
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
        const mappedType = mapTypeForDisplay(notification.type, notification);
        modalType.textContent = mappedType;
        modalType.className = `notification-detail-type ${mappedType}`;
        modalTime.textContent = getTimeAgo(notification.timestamp);
        modalContent.textContent = notification.content;
        
        // Show appropriate buttons based on notification type and status
        const initialButtons = document.getElementById('initialButtons');
        const actionTakenButtons = document.getElementById('actionTakenButtons');
        const reportButtons = document.getElementById('reportButtons');
        
        console.log('🔘 Determining button set:', {
            reference_type: notification.reference_type,
            status: notification.status,
            isGeneratedReport: notification.reference_type === 'generated_report',
            isCompleted: notification.status === 'completed'
        });
        
        // Check if this is a change request approved/rejected notification
        const isChangeRequestApprovedRejected = notification.reference_type === 'change_request' && 
            (notification.title.includes('Approved') || notification.title.includes('Rejected'));
        
        if (notification.reference_type === 'generated_report') {
            // Show Delete/View Report buttons for generated report notifications
            console.log('➡️ Showing reportButtons (Delete/View Report)');
            if (initialButtons) initialButtons.style.display = 'none';
            if (actionTakenButtons) actionTakenButtons.style.display = 'none';
            if (reportButtons) reportButtons.style.display = 'flex';
        } else if (notification.category === 'system' || isChangeRequestApprovedRejected) {
            // System notifications (reactivation, password reset) and change request approved/rejected
            // Show Close/Delete buttons (no Take Action)
            console.log('➡️ Showing actionTakenButtons (Close/Delete) - no action needed');
            if (initialButtons) initialButtons.style.display = 'none';
            if (actionTakenButtons) actionTakenButtons.style.display = 'flex';
            if (reportButtons) reportButtons.style.display = 'none';
        } else if (notification.status === 'completed') {
            // Show Close/Delete buttons for completed notifications
            console.log('➡️ Showing actionTakenButtons (Close/Delete)');
            if (initialButtons) initialButtons.style.display = 'none';
            if (actionTakenButtons) actionTakenButtons.style.display = 'flex';
            if (reportButtons) reportButtons.style.display = 'none';
        } else {
            // Show Later/Take Action buttons for pending notifications that need action
            console.log('➡️ Showing initialButtons (Later/Take Action)');
            if (initialButtons) initialButtons.style.display = 'flex';
            if (actionTakenButtons) actionTakenButtons.style.display = 'none';
            if (reportButtons) reportButtons.style.display = 'none';
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
    // Just close the modal, notification should remain read (white background)
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
        const userRole = localStorage.getItem('user_role');

        // Close modal
        closeNotificationModal();

        // Mark as read
        await markAsRead(notificationId, false);

        // Determine redirect URL based on user role
        // Finance Officer receives report requests from Marketing Clerk
        let redirectUrl;
        if (metadata && metadata.redirect_url) {
            redirectUrl = metadata.redirect_url;
        } else if (userRole === 'Finance Officer') {
            redirectUrl = `/financeofficer/html/reports.html?from=report_request&requestId=${encodeURIComponent(requestId)}`;
        } else {
            // Fallback for Marketing Clerk (shouldn't happen, but just in case)
            redirectUrl = `/marketingclerk/html/reports.html?from=report_request&requestId=${encodeURIComponent(requestId)}`;
        }

        // Persist minimal prefill so Reports can hydrate if metadata lacks details
        try {
            sessionStorage.setItem('report_request_prefill', JSON.stringify({ requestId, metadata }));
        } catch (_) {}

        // Redirect to appropriate reports page
        window.location.href = redirectUrl;
    }
}

// Handle "Close" button (after action taken)
function handleClose() {
    closeNotificationModal();
    // Refresh to show current state
    filterNotifications(currentFilter);
}

// Handle "View Report" button (for generated report notifications)
async function handleViewReport() {
    console.log('🔍 handleViewReport called');
    console.log('📋 currentNotification:', currentNotification);
    
    // Check if currentNotification exists
    if (!currentNotification) {
        console.error('❌ currentNotification is null - cannot proceed');
        alert('Error: Notification data not available. Please try again.');
        return;
    }
    
    if (currentNotification.reference_type === 'generated_report') {
        // Store notification data before closing modal
        const reportId = currentNotification.reference_id;
        const metadata = currentNotification.metadata || {};
        const notificationId = currentNotification.id;
        
        console.log('📊 reportId:', reportId);
        console.log('📋 metadata:', metadata);
        console.log('📋 notificationId:', notificationId);
        
        // Close modal first
        closeNotificationModal();
        
        // Mark as read AND completed (white background)
        await markAsRead(notificationId, false);
        await markAsCompleted(notificationId);
        
        // Redirect to reports page with report ID (role-specific)
        const userRole = localStorage.getItem('user_role');
        let redirectUrl = metadata.redirect_url;
        
        // If no redirect URL in metadata, determine based on role
        if (!redirectUrl) {
            if (userRole === 'Marketing Clerk') {
                redirectUrl = `../../marketingclerk/html/reports.html?reportId=${reportId}`;
            } else if (userRole === 'Finance Officer') {
                redirectUrl = `../../financeofficer/html/reports.html?reportId=${reportId}`;
            } else {
                redirectUrl = `../../financeofficer/html/reports.html?reportId=${reportId}`;
            }
        }
        
        console.log('🔗 Redirecting to:', redirectUrl);
        
        // Redirect to reports page
        window.location.href = redirectUrl;
    } else {
        console.log('❌ Invalid notification or wrong reference type');
        console.log('📋 currentNotification exists:', !!currentNotification);
        console.log('📋 reference_type:', currentNotification?.reference_type);
    }
}

// Handle "Delete" button (after action taken)
async function handleDelete() {
    if (currentNotification) {
        // Show confirmation modal before deletion
        showDeleteConfirmationModal();
    }
}

// Show delete confirmation modal
function showDeleteConfirmationModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'delete-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'delete-modal';
    modalContent.style.cssText = `
        background: #E9EEF3;
        border-radius: 24px;
        padding: 24px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    `;

    modalContent.innerHTML = `
        <h2 style="
            font-size: 18px;
            font-weight: 600;
            color: #0B5E1C;
            margin-bottom: 8px;
        ">Confirm Delete</h2>
        <p style="
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 18px;
            line-height: 1.4;
        ">Are you sure you want to delete this notification? This action cannot be undone.</p>
        <div style="
            display: flex;
            gap: 12px;
            justify-content: center;
        ">
            <button id="cancelDelete" style="
                padding: 12px 24px;
                border: 1px solid #D1D5DB;
                border-radius: 10px;
                background: white;
                color: #4B5563;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 100px;
            ">Cancel</button>
            <button id="confirmDelete" style="
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                background: #EF4444;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 100px;
            ">Delete</button>
        </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        
        @keyframes modalSlideOut {
            from {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
            to {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
        }
        
        #cancelDelete:hover {
            border-color: #9CA3AF;
            background: #F9FAFB;
            transform: translateY(-1px);
        }
        
        #confirmDelete:hover {
            background: #DC2626;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
    `;
    document.head.appendChild(style);

    // Add modal to page
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Add event listeners
    document.getElementById('cancelDelete').addEventListener('click', () => {
        closeDeleteModal();
    });

    document.getElementById('confirmDelete').addEventListener('click', () => {
        closeDeleteModal();
        performDelete();
    });

    // Close modal on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeDeleteModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
        }
    });
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.querySelector('.delete-modal-overlay');
    if (modal) {
        modal.style.animation = 'modalSlideOut 0.2s ease-in';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 200);
    }
}

// Perform actual deletion
async function performDelete() {
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
            
            // Always update navigation badge count when notification is marked as read
                const userRole = localStorage.getItem('user_role');
                if ((userRole === 'Marketing Clerk' || userRole === 'Finance Officer') && typeof updateNotificationCount === 'function') {
                    await updateNotificationCount();
                }
            
            if (refreshList) {
                // Refresh display
                filterNotifications(currentFilter);
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark a notification as completed (for Finance Officer View Report action)
async function markAsCompleted(notificationId) {
    try {
        // Save to localStorage
        const completedIds = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
        if (!completedIds.includes(notificationId)) {
            completedIds.push(notificationId);
            localStorage.setItem(COMPLETED_KEY, JSON.stringify(completedIds));
        }
        
        // Update local state
        const notification = allNotifications.find(n => n.id === notificationId);
        if (notification) {
            notification.status = 'completed';
            notification.is_highlighted = false;
            console.log('✅ Marked notification as completed:', notificationId);
            
            // Refresh display
            displayNotifications(allNotifications);
            updateNotificationCounts();
        }
    } catch (error) {
        console.error('Error marking notification as completed:', error);
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
                // Reapply current filter after refresh
                filterNotifications(currentFilter);
            }
        }
    } catch (error) {
        console.error('Error unhighlighting notification:', error);
    }
}

// Update pagination info display
function updatePaginationInfo(start, end, total) {
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        if (total === 0) {
            paginationInfo.textContent = '0-0 of 0';
        } else {
            paginationInfo.textContent = `${start}-${end} of ${total}`;
        }
    }
}

// Go to next page
function nextPage() {
    const totalNotifications = allNotifications.length;
    const totalPages = Math.ceil(totalNotifications / notificationsPerPage);
    
    if (currentPage < totalPages) {
        currentPage++;
        filterNotifications(currentFilter);
    }
}

// Go to previous page
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        filterNotifications(currentFilter);
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
    updatePaginationInfo(0, 0, 0);
}

// Make functions available globally
window.closeNotificationModal = closeNotificationModal;
window.handleLater = handleLater;
// Refresh notifications function
function refreshNotifications() {
    const refreshBtn = document.getElementById('refreshBtn');
    const icon = refreshBtn.querySelector('i');
    
    // Get current active filter
    const activeFilter = document.querySelector('.filter-btn.active');
    const currentFilter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    
    // Add spinning animation
    icon.style.animation = 'spin 1s linear infinite';
    refreshBtn.disabled = true;
    
    // Reload notifications from API
    loadNotificationsFromAPI().then(() => {
        // Remove spinning animation
        icon.style.animation = '';
        refreshBtn.disabled = false;
        
        // Reapply current filter after refresh
        filterNotifications(currentFilter);
        
        // Show success feedback
        refreshBtn.style.borderColor = 'var(--dark-green)';
        refreshBtn.style.color = 'var(--dark-green)';
        setTimeout(() => {
            refreshBtn.style.borderColor = '';
            refreshBtn.style.color = '';
        }, 1000);
    }).catch(error => {
        console.error('Error refreshing notifications:', error);
        icon.style.animation = '';
        refreshBtn.disabled = false;
        
        // Show error feedback
        refreshBtn.style.borderColor = 'var(--red)';
        refreshBtn.style.color = 'var(--red)';
        setTimeout(() => {
            refreshBtn.style.borderColor = '';
            refreshBtn.style.color = '';
        }, 1000);
    });
}

window.handleTakeAction = handleTakeAction;
window.handleViewReport = handleViewReport;
window.unhighlightNotification = unhighlightNotification;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.refreshNotifications = refreshNotifications;