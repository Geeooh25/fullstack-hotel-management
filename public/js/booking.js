document.addEventListener('DOMContentLoaded', function() {
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room_id');
    const checkin = urlParams.get('checkin');
    const checkout = urlParams.get('checkout');
    const adults = parseInt(urlParams.get('adults')) || 2;
    const children = parseInt(urlParams.get('children')) || 0;
    
    // Get pending cart from localStorage
    let pendingCart = null;
    const pendingCartStr = localStorage.getItem('pendingCart');
    if (pendingCartStr) {
        pendingCart = JSON.parse(pendingCartStr);
        console.log('Pending cart found:', pendingCart);
    }
    
    // Validate required parameters
    if (!roomId || !checkin || !checkout) {
        showToast('Missing booking information. Please search again.', 'error');
        setTimeout(function() {
            window.location.href = '/rooms.html';
        }, 2000);
        return;
    }
    
    let roomData = null;
    let priceDetails = null;
    let currentUser = null;
    
    async function checkLoggedInUser() {
        if (typeof Auth !== 'undefined') {
            currentUser = await Auth.getCurrentUser();
            console.log('Current user object:', currentUser);
            if (currentUser && currentUser.id) {
                console.log('User logged in:', currentUser.email);
                var firstNameInput = document.getElementById('first-name');
                var lastNameInput = document.getElementById('last-name');
                var emailInput = document.getElementById('email');
                
                if (firstNameInput && currentUser.first_name) firstNameInput.value = currentUser.first_name;
                if (lastNameInput && currentUser.last_name) lastNameInput.value = currentUser.last_name;
                if (emailInput && currentUser.email) emailInput.value = currentUser.email;
            } else {
                currentUser = null;
            }
        }
    }
    
    // Load user first, then booking details
    async function init() {
        await checkLoggedInUser();
        await loadBookingDetails();
    }
    init();
    
    async function loadBookingDetails() {
        try {
            // Load room details
            var roomResponse = await fetch('/api/rooms/' + roomId);
            var roomDataResult = await roomResponse.json();
            
            if (roomDataResult.success) {
                roomData = roomDataResult.room;
            } else {
                throw new Error('Room not found');
            }
            
            // Calculate price
            var roomTypeId = roomData.RoomType ? roomData.RoomType.id : null;
            if (roomTypeId) {
                var formattedCheckin = new Date(checkin).toISOString().split('T')[0];
                var formattedCheckout = new Date(checkout).toISOString().split('T')[0];
                
                console.log('Calculating price with dates:', formattedCheckin, formattedCheckout);
                
                var priceResponse = await fetch('/api/availability/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomTypeId: roomTypeId,
                        checkIn: formattedCheckin,
                        checkOut: formattedCheckout
                    })
                });
                
                var priceResult = await priceResponse.json();
                console.log('Price result:', priceResult);
                
                if (priceResult.success) {
                    priceDetails = priceResult;
                }
            }
            
            displayBookingSummary();
            
            // Enable booking button after terms checkbox is checked
            var termsCheckbox = document.getElementById('terms');
            var bookBtn = document.getElementById('complete-booking-btn');
            
            if (termsCheckbox && bookBtn) {
                termsCheckbox.addEventListener('change', function() {
                    bookBtn.disabled = !this.checked;
                });
            }
            
        } catch (error) {
            console.error('Error loading booking details:', error);
            showToast('Failed to load booking details', 'error');
        }
    }
    
    function displayBookingSummary() {
        var container = document.getElementById('booking-summary');
        if (!container) return;
        
        var roomType = roomData?.RoomType || {};
        var nights = priceDetails?.nights || calculateNights(checkin, checkout);
        var basePrice = priceDetails?.base_price || roomType.base_price || 129;
        var subtotal = priceDetails?.subtotal || (basePrice * nights);
        var total = priceDetails?.total || subtotal;
        
        // Calculate cart total - FORCE RECALCULATION FROM ITEMS (NO TAX)
        var cartTotal = 0;
        var cartItemsHtml = '';
        if (pendingCart && pendingCart.items && pendingCart.items.length > 0) {
            // Recalculate from items, ignore pendingCart.total (which may include tax)
            for (var i = 0; i < pendingCart.items.length; i++) {
                var item = pendingCart.items[i];
                cartTotal += parseFloat(item.price) * parseInt(item.quantity);
            }
            cartItemsHtml = '<hr><h5>Additional Services:</h5>';
            for (var i = 0; i < pendingCart.items.length; i++) {
                var item = pendingCart.items[i];
                var itemTotal = parseFloat(item.price) * parseInt(item.quantity);
                cartItemsHtml += '<div class="price-item"><span>' + item.name + ' x' + item.quantity + '</span><span>$' + itemTotal.toFixed(2) + '</span></div>';
            }
            cartItemsHtml += '<div class="price-item"><span>Services Total:</span><span>$' + cartTotal.toFixed(2) + '</span></div>';
        }
        
        var grandTotal = total + cartTotal;
        
        var imageUrl = (roomType.images && roomType.images[0]) ? roomType.images[0] : 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400';
        
        var bedType = 'Queen Bed';
        if (roomType.name === 'Executive Suite') bedType = 'King Bed';
        if (roomType.name === 'Deluxe Room') bedType = 'King Bed';
        
        var html = '<div class="text-center mb-3"><img src="' + imageUrl + '" alt="' + roomType.name + '" class="img-fluid" style="width: 100%; height: 180px; object-fit: cover;"></div>';
        html += '<h4 class="mb-2">' + (roomType.name || 'Standard Room') + '</h4>';
        html += '<p class="text-muted small">Room ' + (roomData?.room_number || '') + ' | Floor ' + (roomData?.floor || 'Ground') + '</p>';
        html += '<ul class="room-features-mini"><li><i class="fas fa-arrows-alt"></i> ' + (roomType.capacity || 2) + ' Guests</li>';
        html += '<li><i class="fas fa-bed"></i> ' + bedType + '</li><li><i class="fas fa-wifi"></i> Free WiFi</li>';
        html += '<li><i class="fas fa-eye"></i> City View</li></ul><hr>';
        html += '<div class="mb-3"><div class="price-item"><span><i class="fas fa-calendar-alt me-2"></i>Check-in:</span><strong>' + formatDate(checkin) + '</strong></div>';
        html += '<div class="price-item"><span><i class="fas fa-calendar-alt me-2"></i>Check-out:</span><strong>' + formatDate(checkout) + '</strong></div>';
        html += '<div class="price-item"><span><i class="fas fa-clock me-2"></i>Nights:</span><strong>' + nights + '</strong></div></div>';
        html += '<div class="mb-3"><div class="price-item"><span><i class="fas fa-user me-2"></i>Guests:</span><strong>' + adults + ' adults' + (children > 0 ? ', ' + children + ' children' : '') + '</strong></div></div><hr>';
        html += '<div class="price-breakdown"><div class="price-item"><span>Room Rate (' + nights + ' nights):</span><span>$' + basePrice + '/night</span></div>';
        html += '<div class="price-item"><span>Room Subtotal:</span><span>$' + subtotal.toFixed(2) + '</span></div>';
        html += cartItemsHtml;
        html += '<div class="price-total"><span>Grand Total:</span><span>$' + grandTotal.toFixed(2) + '</span></div>';
        html += '<div class="alert alert-info small mt-3 mb-0" style="background: #f8f9fa; border-left: 3px solid #c5a028;">';
        html += '<i class="fas fa-info-circle"></i> Full payment of <strong>$' + grandTotal.toFixed(2) + '</strong> is required to confirm your booking.';
        if (pendingCart && pendingCart.items && pendingCart.items.length > 0) html += '<br><i class="fas fa-shopping-cart"></i> Your cart services will be added to this booking.';
        if (currentUser && currentUser.id) {
            html += '<br><i class="fas fa-user-check"></i> This booking will be linked to your account.';
        } else {
            html += '<br><i class="fas fa-user-plus"></i> <a href="/signup.html">Create an account</a> to save your booking history.';
        }
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    // Handle booking submission
    var bookBtn = document.getElementById('complete-booking-btn');
    if (bookBtn) {
        bookBtn.addEventListener('click', async function() {
            var firstName = document.getElementById('first-name')?.value.trim();
            var lastName = document.getElementById('last-name')?.value.trim();
            var email = document.getElementById('email')?.value.trim();
            var phone = document.getElementById('phone')?.value.trim();
            var termsChecked = document.getElementById('terms')?.checked;
            
            if (!firstName || !lastName || !email || !phone) {
                showToast('Please fill in all required fields', 'warning');
                return;
            }
            
            if (!isValidEmail(email)) {
                showToast('Please enter a valid email address', 'warning');
                return;
            }
            
            if (!termsChecked) {
                showToast('Please agree to the terms and conditions', 'warning');
                return;
            }
            
            bookBtn.disabled = true;
            bookBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            
            try {
                var bookingData = {
                    roomId: parseInt(roomId),
                    guest: {
                        firstName: firstName,
                        lastName: lastName,
                        email: email,
                        phone: phone,
                        address: document.getElementById('address')?.value || '',
                        city: document.getElementById('city')?.value || '',
                        country: document.getElementById('country')?.value || ''
                    },
                    checkIn: new Date(checkin).toISOString().split('T')[0],
                    checkOut: new Date(checkout).toISOString().split('T')[0],
                    adults: adults,
                    children: children,
                    specialRequests: document.getElementById('special-requests')?.value || '',
                    source: 'online',
                    cart: pendingCart ? pendingCart.items : null,
                    user_id: currentUser ? currentUser.id : null
                };
                
                console.log('Sending booking data with cart:', bookingData);
                
                var response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });
                
                var result = await response.json();
                console.log('Booking response:', result);
                
                if (result.success && result.checkoutUrl) {
                    localStorage.removeItem('pendingCart');
                    console.log('Redirecting to Stripe:', result.checkoutUrl);
                    window.location.href = result.checkoutUrl;
                } else {
                    showToast(result.error || 'Booking failed', 'error');
                    bookBtn.disabled = false;
                    bookBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i> Proceed to Payment';
                }
            } catch (error) {
                console.error('Booking error:', error);
                showToast(error.message || 'Failed to create booking. Please try again.', 'error');
                bookBtn.disabled = false;
                bookBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i> Proceed to Payment';
            }
        });
    }
});

// Helper Functions
function formatDate(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    var start = new Date(checkIn);
    var end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function isValidEmail(email) {
    var re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return re.test(email);
}

function showToast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    var toast = document.createElement('div');
    toast.style.background = 'white';
    toast.style.borderRadius = '8px';
    toast.style.padding = '12px 20px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    var borderColor = type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : (type === 'warning' ? '#ffc107' : '#17a2b8'));
    toast.style.borderLeft = '4px solid ' + borderColor;
    toast.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center;"><span>' + message + '</span><button style="background: none; border: none; font-size: 1.2rem; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">&times;</button></div>';
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}