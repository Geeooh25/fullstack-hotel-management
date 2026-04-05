document.addEventListener('DOMContentLoaded', function() {
    
    let allRooms = [];
    let currentFilters = {
        checkin: null,
        checkout: null,
        adults: 2,
        children: 0
    };
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkin')) {
        currentFilters.checkin = urlParams.get('checkin');
    }
    if (urlParams.get('checkout')) {
        currentFilters.checkout = urlParams.get('checkout');
    }
    if (urlParams.get('adults')) {
        currentFilters.adults = parseInt(urlParams.get('adults'));
    }
    if (urlParams.get('children')) {
        currentFilters.children = parseInt(urlParams.get('children'));
    }
    
    // Check for pending cart from amenities page
    const pendingCart = localStorage.getItem('pendingCart');
    if (pendingCart) {
        const cartData = JSON.parse(pendingCart);
        if (cartData.items && cartData.items.length > 0) {
            showToast(`You have ${cartData.items.length} service(s) in your cart. They will be added to your booking.`, 'info');
        }
    }
    
    // Initialize date pickers
    let checkinPicker, checkoutPicker;
    
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    
    if (checkinInput) {
        checkinPicker = flatpickr('#checkin', {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            defaultDate: currentFilters.checkin,
            onChange: function(selectedDates, dateStr) {
                currentFilters.checkin = dateStr;
                if (dateStr && checkoutPicker) {
                    checkoutPicker.set('minDate', dateStr);
                }
                updateButtonStates();
                applyFilters();
            }
        });
    }
    
    if (checkoutInput) {
        checkoutPicker = flatpickr('#checkout', {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            defaultDate: currentFilters.checkout,
            onChange: function(selectedDates, dateStr) {
                currentFilters.checkout = dateStr;
                updateButtonStates();
                applyFilters();
            }
        });
    }
    
    // Set initial values
    const adultsInput = document.getElementById('adults');
    const childrenInput = document.getElementById('children');
    
    if (adultsInput) adultsInput.value = currentFilters.adults;
    if (childrenInput) childrenInput.value = currentFilters.children;
    
    if (adultsInput) {
        adultsInput.addEventListener('change', function() {
            currentFilters.adults = parseInt(this.value) || 2;
            applyFilters();
        });
    }
    
    if (childrenInput) {
        childrenInput.addEventListener('change', function() {
            currentFilters.children = parseInt(this.value) || 0;
            applyFilters();
        });
    }
    
    // Search button
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            applyFilters();
        });
    }
    
    // Load all rooms
    loadAllRooms();
    
    function updateButtonStates() {
        const hasDates = currentFilters.checkin && currentFilters.checkout;
        const allBookBtns = document.querySelectorAll('.book-now-btn');
        allBookBtns.forEach(btn => {
            if (hasDates) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    }
    
    async function loadAllRooms() {
        const container = document.getElementById('rooms-container');
        if (!container) return;
        
        container.innerHTML = '<div class="text-center py-5"><div class="loader"></div><p class="mt-2">Loading rooms...</p></div>';
        
        try {
            const response = await fetch('/api/rooms');
            const data = await response.json();
            
            if (data.success && data.rooms && data.rooms.length > 0) {
                allRooms = data.rooms;
                applyFilters();
            } else {
                container.innerHTML = '<div class="col-12 text-center py-5"><p>No rooms available at the moment.</p></div>';
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
            container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-danger">Failed to load rooms. Please try again.</p></div>';
        }
    }
    
    async function applyFilters() {
        if (allRooms.length === 0) return;
        
        let availableRoomIds = [];
        
        if (currentFilters.checkin && currentFilters.checkout) {
            try {
                const response = await fetch('/api/availability/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        checkIn: currentFilters.checkin,
                        checkOut: currentFilters.checkout,
                        adults: currentFilters.adults,
                        children: currentFilters.children
                    })
                });
                
                const data = await response.json();
                if (data.success && data.rooms) {
                    availableRoomIds = data.rooms.map(r => r.id);
                }
            } catch (error) {
                console.error('Error checking availability:', error);
            }
        }
        
        let filteredRooms = allRooms;
        
        if (availableRoomIds.length > 0) {
            filteredRooms = filteredRooms.filter(room => availableRoomIds.includes(room.id));
        }
        
        const totalGuests = currentFilters.adults + currentFilters.children;
        filteredRooms = filteredRooms.filter(room => {
            const capacity = room.RoomType ? room.RoomType.capacity : 2;
            return capacity >= totalGuests;
        });
        
        displayRooms(filteredRooms);
        updateButtonStates();
    }
    
    function displayRooms(rooms) {
        const container = document.getElementById('rooms-container');
        
        if (!rooms || rooms.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-bed fa-3x" style="color: #c5a028; opacity: 0.5;"></i>
                    <h3 class="mt-3">No rooms available</h3>
                    <p class="text-muted">Please try different dates or reduce the number of guests.</p>
                    <button onclick="window.location.href='/rooms.html'" class="btn-outline-gold mt-3" style="padding: 10px 25px; border: 2px solid #c5a028; background: transparent; color: #c5a028; cursor: pointer;">Clear Filters</button>
                </div>
            `;
            return;
        }
        
        let html = '';
        const hasDates = currentFilters.checkin && currentFilters.checkout;
        
        rooms.forEach(room => {
            const roomType = room.RoomType || {};
            const price = roomType.base_price || 129;
            const roomName = roomType.name || 'Standard Room';
            const capacity = roomType.capacity || 2;
            const description = room.unique_description || roomType.description || 'Comfortable room with essential amenities.';
            const view = room.view || 'City View';
            const specialFeature = room.special_feature || '';
            const imageUrl = room.image || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800';
            
            let bedType = 'Queen Bed';
            let roomSize = 28;
            if (roomName === 'Executive Suite') {
                bedType = 'King Bed';
                roomSize = 55;
            } else if (roomName === 'Deluxe Room') {
                bedType = 'King Bed';
                roomSize = 38;
            }
            
            // Build booking URL with cart data
            let bookingUrl = hasDates ? `/booking.html?room_id=${room.id}&checkin=${currentFilters.checkin}&checkout=${currentFilters.checkout}&adults=${currentFilters.adults}&children=${currentFilters.children}` : '#';
            
            html += `
                <div class="col-md-4 mb-4">
                    <div class="room-card">
                        <img src="${imageUrl}" alt="${roomName}" loading="lazy" style="width: 100%; height: 250px; object-fit: cover;">
                        <div class="room-content">
                            <div class="price">$${price} <span>/ NIGHT</span></div>
                            <h3>${roomName} - Room ${room.room_number}</h3>
                            <p class="text-muted small"><i class="fas fa-eye"></i> ${view}</p>
                            ${specialFeature ? `<p class="text-muted small"><i class="fas fa-star"></i> ${specialFeature}</p>` : ''}
                            <p>${description.substring(0, 100)}...</p>
                            <ul class="room-features">
                                <li><i class="fas fa-arrows-alt"></i> ${roomSize} M²</li>
                                <li><i class="fas fa-bed"></i> ${bedType}</li>
                                <li><i class="fas fa-user-friends"></i> ${capacity} ADULTS</li>
                                <li><i class="fas fa-coffee"></i> BREAKFAST</li>
                            </ul>
                            ${hasDates ? 
                                `<a href="${bookingUrl}" class="book-now-btn" style="display: block; width: 100%; text-align: center; background: #c5a028; color: #1a2a3a; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s;">Book Room ${room.room_number} →</a>` :
                                `<button class="book-now-btn" disabled style="display: block; width: 100%; text-align: center; background: #ccc; color: #666; padding: 12px; border: none; border-radius: 8px; font-weight: 600; opacity: 0.5; cursor: not-allowed;">Select Dates to Book</button>`
                            }
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
});

function showToast(message, type) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.background = 'white';
    toast.style.borderRadius = '8px';
    toast.style.padding = '12px 20px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    toast.style.borderLeft = `4px solid ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'}`;
    toast.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center;"><span>${message}</span><button style="background: none; border: none; font-size: 1.2rem; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">&times;</button></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}