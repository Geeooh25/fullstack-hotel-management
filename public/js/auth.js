// Auth helper functions for client-side (supports both staff and guests)
const Auth = {
    // Get current staff user (admin panel)
    async getCurrentStaff() {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            if (data.success) {
                return data.user;
            }
            return null;
        } catch (error) {
            return null;
        }
    },
    
    // Get current guest user (public site)
    async getCurrentGuest() {
        try {
            const response = await fetch('/api/auth/guest-me');
            const data = await response.json();
            return data.user;
        } catch (error) {
            return null;
        }
    },
    
    // Get current user (checks both)
    async getCurrentUser() {
        // First try guest endpoint
        const guest = await this.getCurrentGuest();
        if (guest) return guest;
        
        // Then try staff endpoint
        const staff = await this.getCurrentStaff();
        return staff;
    },
    
    // Staff logout
    async staffLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/admin/login.html';
    },
    
    // Guest logout
    async guestLogout() {
        await fetch('/api/auth/guest-logout', { method: 'POST' });
        window.location.href = '/';
    },
    
    // Universal logout (detects which one to use)
    async logout() {
        // Try guest logout first
        const response = await fetch('/api/auth/guest-logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/';
        } else {
            // Fallback to staff logout
            window.location.href = '/admin/login.html';
        }
    },
    
    // Update navigation bar (for public site)
    async updateNav() {
        const user = await this.getCurrentUser();
        const authNav = document.getElementById('authNav');
        
        if (!authNav) return;
        
        if (user) {
            authNav.innerHTML = `
                <div class="dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-user"></i> ${user.first_name}
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="userDropdown">
                        <li><a class="dropdown-item" href="/profile.html"><i class="fas fa-id-card"></i> My Profile</a></li>
                        <li><a class="dropdown-item" href="/booking-lookup.html"><i class="fas fa-calendar-check"></i> My Bookings</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="Auth.logout(); return false;"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
                    </ul>
                </div>
            `;
        } else {
            authNav.innerHTML = `<a class="nav-link" href="/login.html"><i class="fas fa-sign-in-alt"></i> Login</a>`;
        }
    },
    
    // Check if user is logged in (for API calls)
    async isLoggedIn() {
        const user = await this.getCurrentUser();
        return !!user;
    },
    
    // Get auth token for API requests
    getToken() {
        // Try to get from cookies
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : null;
    },
    
    // Add auth header to fetch options
    authHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

// Initialize auth on page load (for public pages)
document.addEventListener('DOMContentLoaded', () => {
    // Only run on public pages (not admin)
    if (!window.location.pathname.includes('/admin/')) {
        Auth.updateNav();
    }
});