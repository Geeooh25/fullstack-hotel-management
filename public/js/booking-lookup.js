document.addEventListener('DOMContentLoaded', function() {
    
    // Update cart count
    updateCartCount();
    
    // Pagination variables (using window for global access)
    window.currentBookingsList = [];
    window.currentBookingPage = 1;
    const itemsPerPage = 5;
    
    // Reference lookup form
    const referenceForm = document.getElementById('reference-form');
    if (referenceForm) {
        referenceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const reference = document.getElementById('booking-ref').value.trim();
            
            if (!reference) {
                showToast('Please enter a booking reference', 'warning');
                return;
            }
            
            await lookupByReference(reference);
        });
    }
    
    // Email lookup form
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('booking-email').value.trim();
            
            if (!email) {
                showToast('Please enter an email address', 'warning');
                return;
            }
            
            await lookupByEmail(email);
        });
    }
    
    // Check URL parameter for direct booking reference
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        document.getElementById('booking-ref').value = refParam;
        lookupByReference(refParam);
    }
    
    async function lookupByReference(reference) {
        showLoading();
        
        try {
            const response = await fetch(`/api/bookings/lookup?reference=${reference}`);
            const data = await response.json();
            
            if (data.success && data.booking) {
                displaySingleBooking(data.booking);
                setTimeout(() => {
                    const resultsContainer = document.getElementById('results-container');
                    if (resultsContainer) {
                        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            } else {
                displayNoResults('No booking found with that reference');
            }
        } catch (error) {
            console.error('Lookup error:', error);
            displayNoResults('Error searching for booking. Please try again.');
        }
    }
    
    async function lookupByEmail(email) {
        showLoading();
        
        try {
            const response = await fetch(`/api/bookings/lookup?email=${email}`);
            const data = await response.json();
            
            if (data.success && data.bookings && data.bookings.length > 0) {
                window.currentBookingsList = data.bookings;
                window.currentBookingPage = 1;
                displayMultipleBookings(window.currentBookingsList);
                setTimeout(() => {
                    const resultsContainer = document.getElementById('results-container');
                    if (resultsContainer) {
                        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            } else {
                displayNoResults('No bookings found for this email address');
            }
        } catch (error) {
            console.error('Lookup error:', error);
            displayNoResults('Error searching for bookings. Please try again.');
        }
    }
    
    function displaySingleBooking(booking) {
        const guest = booking.Guest || booking.guest || {};
        const room = booking.Room || booking.room || {};
        const roomType = room.RoomType || room.roomType || {};
        
        const statusText = booking.status.toUpperCase().replace('_', ' ');
        
        let services = [];
        if (booking.services && Array.isArray(booking.services)) {
            services = booking.services;
        } else if (booking.BookingServices && Array.isArray(booking.BookingServices)) {
            services = booking.BookingServices;
        }
        
        let servicesHtml = '';
        let servicesTotal = 0;
        
        if (services.length > 0) {
            servicesHtml = `
                <hr>
                <h6>Additional Services</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr><th>Service</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                        </thead>
                        <tbody>
            `;
            services.forEach(service => {
                let itemName = 'Service';
                if (service.menu_item && service.menu_item.name) {
                    itemName = service.menu_item.name;
                } else if (service.MenuItem && service.MenuItem.name) {
                    itemName = service.MenuItem.name;
                } else if (service.name) {
                    itemName = service.name;
                } else {
                    itemName = `Menu Item #${service.menu_item_id}`;
                }
                
                const price = parseFloat(service.price_at_time);
                const qty = service.quantity;
                servicesTotal += price * qty;
                servicesHtml += `
                    <tr>
                        <td>${itemName}</td>
                        <td>${qty}</td>
                        <td>$${price.toFixed(2)}</td>
                        <td>$${(price * qty).toFixed(2)}</td>
                    </tr>
                `;
            });
            servicesHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        const roomTotal = parseFloat(booking.total_amount || 0) - servicesTotal;
        const roomDisplay = room.room_number ? `${roomType.name || 'Standard Room'} (Room ${room.room_number})` : (roomType.name || 'Standard Room');
        
        const html = `
            <div class="col-lg-8" id="receiptSection">
                <div class="result-card">
                    <div class="row">
                        <div class="col-md-6">
                            <h5>Booking Reference</h5>
                            <p class="booking-reference">${booking.booking_reference}</p>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <span class="status-badge status-${booking.status}">${statusText}</span>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Guest Information</h6>
                            <p class="mb-1"><strong>${guest.first_name || 'N/A'} ${guest.last_name || ''}</strong></p>
                            <p class="mb-1">${guest.email || 'N/A'}</p>
                            <p class="mb-1">${guest.phone || 'No phone provided'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Room Details</h6>
                            <p class="mb-1"><strong>${roomDisplay}</strong></p>
                            <p class="mb-1">Floor ${room.floor || 'Ground'}</p>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <h6>Stay Dates</h6>
                            <p class="mb-1">Check-in: <strong>${formatDate(booking.check_in)}</strong></p>
                            <p class="mb-1">Check-out: <strong>${formatDate(booking.check_out)}</strong></p>
                            <p class="mb-1">Nights: <strong>${booking.total_nights || calculateNights(booking.check_in, booking.check_out)}</strong></p>
                        </div>
                        <div class="col-md-6">
                            <h6>Guests</h6>
                            <p class="mb-1">Adults: ${booking.adults || 1}</p>
                            <p class="mb-1">Children: ${booking.children || 0}</p>
                        </div>
                    </div>
                    
                    ${servicesHtml}
                    
                    <hr>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Payment Summary</h6>
                            <p class="mb-1">Room Total: <strong>$${roomTotal.toFixed(2)}</strong></p>
                            ${servicesTotal > 0 ? `<p class="mb-1">Services Total: <strong>$${servicesTotal.toFixed(2)}</strong></p>` : ''}
                            <p class="mb-1">Total Amount: <strong>$${parseFloat(booking.total_amount || 0).toFixed(2)}</strong></p>
                            <p class="mb-1">Paid: <strong>$${parseFloat(booking.deposit_paid || 0).toFixed(2)}</strong></p>
                            <p class="mb-1">Remaining: <strong>$${parseFloat(booking.remaining_balance || 0).toFixed(2)}</strong></p>
                        </div>
                        <div class="col-md-6">
                            <h6>Actions</h6>
                            ${booking.status === 'confirmed' ? `
                                <button onclick="cancelBooking('${booking.booking_reference}')" class="btn-outline-gold mt-2" style="border: 1px solid #dc3545; color: #dc3545; background: transparent; padding: 8px 20px; cursor: pointer;">
                                    Cancel Booking
                                </button>
                            ` : ''}
                            <button onclick="window.print()" class="btn-outline-gold mt-2 ms-2" style="padding: 8px 20px;">Print Details</button>
                        </div>
                    </div>
                    
                    ${booking.special_requests ? `
                        <hr>
                        <h6>Special Requests</h6>
                        <p class="text-muted">${booking.special_requests}</p>
                    ` : ''}
                </div>
            </div>
        `;
        
        hideLoading(html);
    }
    
    function displayMultipleBookings(bookings) {
        // Store globally for pagination
        window.currentBookingsList = bookings;
        
        const totalPages = Math.ceil(bookings.length / itemsPerPage);
        const startIndex = (window.currentBookingPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedBookings = bookings.slice(startIndex, endIndex);
        
        let bookingsHtml = `
            <div class="col-lg-10">
                <div class="result-card">
                    <h5>Your Bookings (${bookings.length})</h5>
                    <hr>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Reference</th>
                                    <th>Room</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        for (const booking of paginatedBookings) {
            const room = booking.Room || booking.room || {};
            const roomType = room.RoomType || room.roomType || {};
            
            bookingsHtml += `
                <tr>
                    <td><strong>${booking.booking_reference}</strong></td>
                    <td>${roomType.name || 'Room ' + (room.room_number || 'N/A')}</td>
                    <td>${formatDate(booking.check_in)}</span></td>
                    <td>${formatDate(booking.check_out)}</span></td>
                    <td><span class="status-badge status-${booking.status}">${booking.status}</span></span></td>
                    <td>$${parseFloat(booking.total_amount || 0).toFixed(2)}</span></span></td>
                    <td><button onclick="viewBooking('${booking.booking_reference}')" class="btn-outline-gold" style="padding: 5px 15px; font-size: 0.8rem;">View</button></span></td>
                </tr>
            `;
        }
        
        bookingsHtml += `
                            </tbody>
                        </table>
                    </div>
        `;
        
        // Add pagination controls
        if (totalPages > 1) {
            bookingsHtml += `
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div>
                        <small class="text-muted">Showing ${startIndex + 1}-${Math.min(endIndex, bookings.length)} of ${bookings.length} bookings</small>
                    </div>
                    <div>
                        <nav aria-label="Booking pagination">
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item ${window.currentBookingPage === 1 ? 'disabled' : ''}">
                                    <button class="page-link" onclick="changePage(${window.currentBookingPage - 1})">Previous</button>
                                </li>
                                <li class="page-item disabled">
                                    <span class="page-link">Page ${window.currentBookingPage} of ${totalPages}</span>
                                </li>
                                <li class="page-item ${window.currentBookingPage === totalPages ? 'disabled' : ''}">
                                    <button class="page-link" onclick="changePage(${window.currentBookingPage + 1})">Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
            `;
        }
        
        bookingsHtml += `</div></div>`;
        
        hideLoading(bookingsHtml);
    }
    
    // Pagination function
    window.changePage = function(page) {
        if (!window.currentBookingsList || window.currentBookingsList.length === 0) return;
        if (page < 1 || page > Math.ceil(window.currentBookingsList.length / itemsPerPage)) return;
        window.currentBookingPage = page;
        displayMultipleBookings(window.currentBookingsList);
        
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    function displayNoResults(message) {
        const html = `
            <div class="col-lg-6">
                <div class="result-card text-center">
                    <i class="fas fa-search fa-3x" style="color: var(--gold); opacity: 0.5; margin-bottom: 1rem;"></i>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="btn-outline-gold mt-2">Try Again</button>
                </div>
            </div>
        `;
        
        hideLoading(html);
    }
    
    function showLoading() {
        const container = document.getElementById('results-container');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="loader"></div>
                    <p class="mt-2">Searching...</p>
                </div>
            `;
        }
    }
    
    function hideLoading(content) {
        const container = document.getElementById('results-container');
        if (container) {
            container.innerHTML = content;
        }
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    function calculateNights(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    function updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount && typeof hotelCart !== 'undefined') {
            cartCount.innerText = hotelCart.getItemCount();
        }
    }
    
    // Make functions global for onclick handlers
    window.viewBooking = async function(reference) {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="loader"></div>
                    <p class="mt-2">Loading booking details...</p>
                </div>
            `;
        }
        
        try {
            const response = await fetch(`/api/bookings/lookup?reference=${reference}`);
            const data = await response.json();
            
            if (data.success && data.booking) {
                displaySingleBooking(data.booking);
                setTimeout(() => {
                    const receiptSection = document.getElementById('receiptSection');
                    if (receiptSection) {
                        receiptSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            } else {
                displayNoResults('Booking not found');
            }
        } catch (error) {
            console.error('Error:', error);
            displayNoResults('Error loading booking');
        }
    };
    
    window.cancelBooking = async function(reference) {
        if (!confirm('Are you sure you want to cancel this booking? Cancellation fees may apply.')) {
            return;
        }
        
        try {
            const lookupResponse = await fetch(`/api/bookings/lookup?reference=${reference}`);
            const lookupData = await lookupResponse.json();
            
            if (!lookupData.success || !lookupData.booking) {
                showToast('Booking not found', 'error');
                return;
            }
            
            const bookingId = lookupData.booking.id;
            
            const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Cancelled by guest' })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Booking cancelled successfully', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showToast(data.error || 'Failed to cancel booking', 'error');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            showToast('Error cancelling booking', 'error');
        }
    };
});

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<div class="d-flex justify-content-between align-items-center"><span>${message}</span><button class="btn btn-sm btn-link" onclick="this.parentElement.parentElement.remove()">&times;</button></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}