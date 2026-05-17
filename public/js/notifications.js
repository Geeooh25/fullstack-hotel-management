// Socket.io client-side notifications
const socket = io();

// Notification sound (optional - create an audio file or use browser notification)
const playNotificationSound = () => {
    // You can add a sound file or use the Web Audio API
    // For now, we'll just use browser notifications
};

// Show browser notification
const showBrowserNotification = (title, body, icon = 'https://via.placeholder.com/64') => {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body, icon });
            }
        });
    }
};

// Add notification to dropdown
const addNotification = (notification) => {
    const notificationList = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    const count = parseInt(badge.textContent) || 0;
    
    // Create notification element
    const notifElement = document.createElement('a');
    notifElement.href = '#';
    notifElement.className = 'dropdown-item notification-item';
    notifElement.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="flex-shrink-0">
                <i class="bi ${notification.icon} text-${notification.color}"></i>
            </div>
            <div class="flex-grow-1 ms-3">
                <h6 class="mb-0">${notification.title}</h6>
                <small class="text-muted">${notification.message}</small>
                <br>
                <small class="text-muted">${new Date(notification.timestamp).toLocaleTimeString()}</small>
            </div>
        </div>
    `;
    
    // Add click handler
    notifElement.addEventListener('click', (e) => {
        e.preventDefault();
        if (notification.type === 'booking' && notification.data) {
            window.location.href = '/admin/bookings';
        } else if (notification.type === 'request' && notification.data) {
            window.location.href = '/admin/requests';
        }
    });
    
    notificationList.prepend(notifElement);
    badge.textContent = count + 1;
    
    // Show browser notification for important events
    if (notification.type === 'booking' || notification.type === 'payment') {
        showBrowserNotification(notification.title, notification.message);
        playNotificationSound();
    }
    
    // Show toast notification
    showToast(notification);
};

// Show toast notification
const showToast = (notification) => {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${notification.color} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${notification.icon} me-2"></i>
                    <strong>${notification.title}</strong><br>
                    <small>${notification.message}</small>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
};

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to real-time server');
});

socket.on('new_booking', (notification) => {
    console.log('New booking received:', notification);
    addNotification(notification);
    // Update dashboard stats if on dashboard page
    if (window.location.pathname === '/admin/dashboard') {
        location.reload();
    }
});

socket.on('new_request', (notification) => {
    console.log('New request received:', notification);
    addNotification(notification);
    if (window.location.pathname === '/admin/requests') {
        location.reload();
    }
});

socket.on('booking_updated', (notification) => {
    console.log('Booking updated:', notification);
    addNotification(notification);
});

socket.on('payment_received', (notification) => {
    console.log('Payment received:', notification);
    addNotification(notification);
    if (window.location.pathname === '/admin/dashboard') {
        location.reload();
    }
});

socket.on('admin_action', (notification) => {
    console.log('Admin action:', notification);
    // Only add to notification center if not from current user
    if (notification.data.admin.username !== window.currentAdminUsername) {
        addNotification(notification);
    }
});

socket.on('system_notification', (notification) => {
    console.log('System notification:', notification);
    showToast(notification);
});

// Update notification badge on page load
const updateNotificationBadge = () => {
    const savedNotifications = localStorage.getItem('admin_notifications');
    if (savedNotifications) {
        const notifications = JSON.parse(savedNotifications);
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = notifications.length;
        }
    }
};

// Save notifications to localStorage
const saveNotification = (notification) => {
    let notifications = localStorage.getItem('admin_notifications');
    notifications = notifications ? JSON.parse(notifications) : [];
    notifications.unshift(notification);
    // Keep only last 50 notifications
    notifications = notifications.slice(0, 50);
    localStorage.setItem('admin_notifications', JSON.stringify(notifications));
};

// Clear all notifications
const clearNotifications = () => {
    localStorage.removeItem('admin_notifications');
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.textContent = '0';
    const notificationList = document.getElementById('notificationList');
    if (notificationList) {
        notificationList.innerHTML = '<p class="dropdown-item text-center text-muted">No new notifications</p>';
    }
};

// Mark notifications as read
const markAsRead = () => {
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.textContent = '0';
};

// Initialize notifications on page load
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Update notification badge
    updateNotificationBadge();
    
    // Add clear button to notification dropdown
    const notificationHeader = document.querySelector('#notificationDropdown + .dropdown-menu .dropdown-header');
    if (notificationHeader) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-sm btn-link float-end';
        clearBtn.innerHTML = 'Clear all';
        clearBtn.onclick = (e) => {
            e.preventDefault();
            clearNotifications();
        };
        notificationHeader.appendChild(clearBtn);
    }
});

// Store current admin username
window.currentAdminUsername = '<%= session.admin?.username %>';