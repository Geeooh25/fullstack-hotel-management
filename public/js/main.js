// ==================== UTILITY FUNCTIONS ====================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - success, error, warning, info
 * @param {number} duration - Time in milliseconds (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${getToastIcon(type)} ${message}</span>
            <button class="btn btn-sm btn-link" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return '✓';
        case 'error': return '✗';
        case 'warning': return '⚠';
        default: return 'ℹ';
    }
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Format date to readable format
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} - Formatted date (e.g., "March 15, 2024")
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Calculate number of nights between dates
 * @param {string} checkIn - YYYY-MM-DD
 * @param {string} checkOut - YYYY-MM-DD
 * @returns {number}
 */
function calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

/**
 * Get URL parameters
 * @returns {Object}
 */
function getUrlParams() {
    const params = {};
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    for (const [key, value] of urlParams.entries()) {
        params[key] = value;
    }
    
    return params;
}

/**
 * Save to session storage
 * @param {string} key
 * @param {any} value
 */
function saveToSession(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}

/**
 * Get from session storage
 * @param {string} key
 * @returns {any}
 */
function getFromSession(key) {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

/**
 * Remove from session storage
 * @param {string} key
 */
function removeFromSession(key) {
    sessionStorage.removeItem(key);
}

/**
 * Clear all session storage
 */
function clearSession() {
    sessionStorage.clear();
}

/**
 * Show loading spinner
 * @param {string} elementId
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loader-container"><div class="loader"></div><p class="mt-2">Loading...</p></div>';
    }
}

/**
 * Hide loading spinner
 * @param {string} elementId
 * @param {string} content
 */
function hideLoading(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = content;
    }
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate phone number (basic)
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    const re = /^[\d\s\-+()]{10,20}$/;
    return re.test(phone);
}

/**
 * Make API request
 * @param {string} url
 * @param {string} method
 * @param {Object} data
 * @returns {Promise}
 */
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}