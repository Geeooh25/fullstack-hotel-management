document.addEventListener('DOMContentLoaded', function() {
    
    const urlParams = new URLSearchParams(window.location.search);
    let bookingId = urlParams.get('booking_id');
    const sessionId = urlParams.get('session_id');
    
    // Helper function to show error message
    function showErrorMessage(message) {
        const container = document.getElementById('booking-details');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3" style="color: #c5a028;"></i>
                    <p>${message}</p>
                    <div class="mt-3">
                        <a href="/booking-lookup.html" class="btn-outline-gold">Look Up My Booking</a>
                        <a href="/" class="btn-outline-gold ms-2">Return to Homepage</a>
                    </div>
                </div>
            `;
        }
    }
    
    // Validate booking ID
    function isValidBookingId(id) {
        const num = parseInt(id);
        return !isNaN(num) && num > 0;
    }
    
    if (!bookingId && !sessionId) {
        // Try to get from session storage
        const tempBooking = sessionStorage.getItem('temp_booking');
        if (tempBooking) {
            try {
                const booking = JSON.parse(tempBooking);
                if (booking && booking.bookingId) {
                    loadBookingDetails(booking.bookingId);
                    sessionStorage.removeItem('temp_booking');
                } else {
                    showErrorMessage('No booking information found. Please check your email for confirmation.');
                }
            } catch (e) {
                showErrorMessage('Invalid booking data. Please use the lookup feature.');
            }
        } else {
            showErrorMessage('No booking information found. Please check your email for confirmation.');
        }
        return;
    }
    
    // If we have session_id from Stripe, verify payment
    if (sessionId) {
        verifyPayment(sessionId);
    } else if (bookingId) {
        // Validate booking ID before proceeding
        if (!isValidBookingId(bookingId)) {
            console.error('Invalid booking ID:', bookingId);
            showErrorMessage('Invalid booking reference. Please use the lookup feature to find your booking.');
            return;
        }
        loadBookingDetails(bookingId);
    }
    
    async function verifyPayment(sessionId) {
        try {
            const response = await fetch(`/api/payments/verify?session_id=${sessionId}`);
            const data = await response.json();
            
            if (data.success && data.booking_id) {
                loadBookingDetails(data.booking_id);
            } else {
                showErrorMessage('Your payment has been processed. A confirmation email has been sent to you.');
            }
        } catch (error) {
            console.error('Payment verification error:', error);
            showErrorMessage('There was an issue verifying your payment. Please check your email for confirmation.');
        }
    }
    
    async function loadBookingDetails(bookingId) {
        // Validate booking ID
        const id = parseInt(bookingId);
        if (isNaN(id) || id <= 0) {
            console.error('Invalid booking ID:', bookingId);
            showErrorMessage('Invalid booking reference. Please use the lookup feature.');
            return;
        }
        
        const container = document.getElementById('booking-details');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="loader"></div>
                    <p class="mt-3">Loading your booking details...</p>
                </div>
            `;
        }
        
        try {
            // First try to get by ID
            const response = await fetch(`/api/bookings/${id}`);
            const data = await response.json();
            
            if (data.success && data.booking) {
                displayBookingDetails(data.booking);
                return;
            }
            
            // If that fails, try to get by reference
            const refResponse = await fetch(`/api/bookings/lookup?reference=${bookingId}`);
            const refData = await refResponse.json();
            
            if (refData.success && refData.booking) {
                displayBookingDetails(refData.booking);
                return;
            }
            
            // If both fail, show error
            showErrorMessage('Unable to find your booking. A confirmation email has been sent to you.');
            
        } catch (error) {
            console.error('Error loading booking:', error);
            showErrorMessage('Unable to load booking details. A confirmation email has been sent to you.');
        }
    }
    
    function displayBookingDetails(booking) {
        const guest = booking.Guest || {};
        const room = booking.Room || {};
        const roomType = room.RoomType || {};
        
        const nights = booking.total_nights || calculateNights(booking.check_in, booking.check_out);
        const totalAmount = parseFloat(booking.total_amount || 0).toFixed(2);
        const depositPaid = parseFloat(booking.deposit_paid || 0).toFixed(2);
        const remainingBalance = parseFloat(booking.remaining_balance || 0).toFixed(2);
        
        
// Calculate expected deposit (20% of total)
const expectedDeposit = (parseFloat(totalAmount) * 0.2).toFixed(2);
        let statusClass = '';
        let statusText = booking.status ? booking.status.toUpperCase().replace('_', ' ') : 'PENDING';
        
        if (booking.status === 'confirmed') statusClass = 'badge-success';
        else if (booking.status === 'pending') statusClass = 'badge-warning';
        else if (booking.status === 'checked_in') statusClass = 'badge-info';
        else if (booking.status === 'checked_out') statusClass = 'badge-secondary';
        else if (booking.status === 'cancelled') statusClass = 'badge-danger';
        else statusClass = 'badge-secondary';
        
        const html = `
            <style>
                .booking-details-card {
                    background: white;
                    border-radius: 16px;
                    padding: 25px;
                    margin-top: 20px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.05);
                }
                .booking-reference {
                    font-family: monospace;
                    font-size: 1.2rem;
                    color: #c5a028;
                    font-weight: bold;
                }
                .badge-success { background: #28a745; color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; }
                .badge-warning { background: #ffc107; color: #333; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; }
                .badge-info { background: #17a2b8; color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; }
                .badge-secondary { background: #6c757d; color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; }
                .badge-danger { background: #dc3545; color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; }
                .print-btn {
                    background: transparent;
                    border: 2px solid #c5a028;
                    color: #c5a028;
                    padding: 8px 20px;
                    border-radius: 8px;
                    transition: all 0.3s;
                }
                .print-btn:hover {
                    background: #c5a028;
                    color: white;
                }
                .btn-outline-gold {
                    border: 2px solid #c5a028;
                    background: transparent;
                    color: #c5a028;
                    padding: 8px 20px;
                    border-radius: 8px;
                    text-decoration: none;
                    display: inline-block;
                    transition: all 0.3s;
                }
                .btn-outline-gold:hover {
                    background: #c5a028;
                    color: white;
                }
            </style>
            
            <div class="booking-details-card">
                <div class="row">
                    <div class="col-md-6">
                        <h5>Booking Reference</h5>
                        <p class="booking-reference">${escapeHtml(booking.booking_reference)}</p>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <span class="${statusClass}">${escapeHtml(statusText)}</span>
                    </div>
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6>Guest Information</h6>
                        <p class="mb-1"><strong>${escapeHtml(guest.first_name || '')} ${escapeHtml(guest.last_name || '')}</strong></p>
                        <p class="mb-1">${escapeHtml(guest.email || '')}</p>
                        <p class="mb-1">${escapeHtml(guest.phone || 'No phone provided')}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Room Details</h6>
                        <p class="mb-1"><strong>${escapeHtml(roomType.name || 'Room ' + (room.room_number || ''))}</strong></p>
                        <p class="mb-1">Room ${escapeHtml(room.room_number || 'N/A')} | Floor ${escapeHtml(room.floor || 'Ground')}</p>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h6>Stay Dates</h6>
                        <p class="mb-1">Check-in: <strong>${formatDate(booking.check_in)}</strong></p>
                        <p class="mb-1">Check-out: <strong>${formatDate(booking.check_out)}</strong></p>
                        <p class="mb-1">Nights: <strong>${nights}</strong></p>
                    </div>
                    <div class="col-md-6">
                        <h6>Guests</h6>
                        <p class="mb-1">Adults: ${booking.adults || 1}</p>
                        <p class="mb-1">Children: ${booking.children || 0}</p>
                    </div>
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6>Payment Summary</h6>
                        <p class="mb-1">Total Amount: <strong>$${totalAmount}</strong></p>
                        <p class="mb-1">Deposit Paid: <strong>$${depositPaid}</strong></p>
                        <p class="mb-1">Remaining: <strong>$${remainingBalance}</strong></p>
                    </div>
                    <div class="col-md-6">
                        <h6>Important Information</h6>
                        <p class="small text-muted mb-1">• Check-in: 3:00 PM</p>
                        <p class="small text-muted mb-1">• Check-out: 11:00 AM</p>
                        <p class="small text-muted mb-1">• Please bring a valid ID</p>
                        <p class="small text-muted">• Free WiFi available</p>
                    </div>
                </div>
                
                ${booking.special_requests ? `
                    <hr>
                    <h6>Special Requests</h6>
                    <p class="text-muted">${escapeHtml(booking.special_requests)}</p>
                ` : ''}
                
                <hr>
                <div class="text-center">
                    <button onclick="window.print()" class="print-btn me-2">
                        <i class="fas fa-print"></i> Print Confirmation
                    </button>
                    <a href="/booking-lookup.html" class="btn-outline-gold">
                        <i class="fas fa-search"></i> View All Bookings
                    </a>
                </div>
            </div>
        `;
        
        const container = document.getElementById('booking-details');
        if (container) {
            container.innerHTML = html;
        }
    }
    
    function calculateNights(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }
    
   function escapeHtml(str) {
    if (!str) return '';
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}});