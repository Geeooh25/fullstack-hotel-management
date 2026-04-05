document.addEventListener('DOMContentLoaded', function() {
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');
    
    if (!roomId) {
        window.location.href = '/rooms.html';
        return;
    }
    
    let roomData = null;
    let selectedCheckin = urlParams.get('checkin') || null;
    let selectedCheckout = urlParams.get('checkout') || null;
    let selectedAdults = parseInt(urlParams.get('adults')) || 2;
    let selectedChildren = parseInt(urlParams.get('children')) || 0;
    let priceDetails = null;
    
    // Load room details
    loadRoomDetails();
    
    async function loadRoomDetails() {
        try {
            const response = await fetch(`/api/rooms/${roomId}`);
            const data = await response.json();
            
            if (data.success) {
                roomData = data.room;
                displayRoomDetails();
                
                // If dates are pre-selected, calculate price
                if (selectedCheckin && selectedCheckout) {
                    calculatePrice();
                }
            } else {
                showToast('Room not found', 'error');
                setTimeout(() => {
                    window.location.href = '/rooms.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Error loading room:', error);
            showToast('Failed to load room details', 'error');
        }
    }
    
    function displayRoomDetails() {
        const container = document.getElementById('room-detail-container');
        const roomType = roomData.RoomType || {};
        const amenities = roomType.amenities || [];
        const images = roomType.images && roomType.images.length ? roomType.images : ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800'];
        
        let imageGalleryHtml = '';
        images.forEach((img, index) => {
            imageGalleryHtml += `
                <div class="col-${index === 0 ? '12' : '3'} mb-3">
                    <img src="${img}" class="img-fluid" onclick="openImageModal('${img}')" style="cursor: pointer; height: ${index === 0 ? '400px' : '150px'}; width: 100%; object-fit: cover;">
                </div>
            `;
        });
        
        const html = `
            <div class="row">
                <div class="col-lg-8">
                    <div class="room-detail-card">
                        <!-- Image Gallery -->
                        <div class="row mb-4">
                            ${imageGalleryHtml}
                        </div>
                        
                        <div class="room-info">
                            <h1>${roomType.name || 'Room ' + roomData.room_number}</h1>
                            <p class="text-muted">Room ${roomData.room_number} | Floor ${roomData.floor || 'Ground'}</p>
                            <div class="room-price">$${roomType.base_price || 129} <span>/ night</span></div>
                            
                            <h4 class="mt-4">Description</h4>
                            <p>${roomType.description || 'Experience luxury and comfort in our beautifully appointed room. Perfect for both business and leisure travelers. Enjoy stunning views, premium amenities, and exceptional service throughout your stay.'}</p>
                            
                            <h4>Amenities</h4>
                            <ul class="amenities-list">
                                ${amenities.length > 0 ? amenities.map(a => `<li><i class="fas fa-check-circle"></i> ${a}</li>`).join('') : `
                                    <li><i class="fas fa-wifi"></i> Free High-Speed WiFi</li>
                                    <li><i class="fas fa-tv"></i> Flat-screen TV</li>
                                    <li><i class="fas fa-snowflake"></i> Air Conditioning</li>
                                    <li><i class="fas fa-coffee"></i> Coffee Maker</li>
                                    <li><i class="fas fa-shower"></i> Rain Shower</li>
                                    <li><i class="fas fa-bed"></i> Premium Bedding</li>
                                `}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-4">
                    <div class="booking-card">
                        <h4>Book This Room</h4>
                        
                        <div class="mb-3">
                            <label class="form-label">Check-in Date</label>
                            <input type="text" id="checkin" class="date-input" value="${selectedCheckin || ''}" placeholder="Select date">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Check-out Date</label>
                            <input type="text" id="checkout" class="date-input" value="${selectedCheckout || ''}" placeholder="Select date">
                        </div>
                        
                        <div class="row">
                            <div class="col-6 mb-3">
                                <label class="form-label">Adults</label>
                                <input type="number" id="adults" class="date-input" value="${selectedAdults}" min="1" max="10">
                            </div>
                            <div class="col-6 mb-3">
                                <label class="form-label">Children</label>
                                <input type="number" id="children" class="date-input" value="${selectedChildren}" min="0" max="10">
                            </div>
                        </div>
                        
                        <div id="price-breakdown" class="price-breakdown" style="display: none;">
                            <div class="price-item">
                                <span>Nights:</span>
                                <span id="nights-count">0</span>
                            </div>
                            <div class="price-item">
                                <span>Room Rate:</span>
                                <span>$<span id="nightly-rate">0</span>/night</span>
                            </div>
                            <div class="price-item">
                                <span>Subtotal:</span>
                                <span>$<span id="subtotal">0</span></span>
                            </div>
                            <div class="price-item">
                                <span>Tax (12.5%):</span>
                                <span>$<span id="tax">0</span></span>
                            </div>
                            <hr>
                            <div class="price-item">
                                <strong>Total:</strong>
                                <strong>$<span id="total">0</span></strong>
                            </div>
                            <div class="price-item text-muted small mt-2">
                                <span>Deposit Required:</span>
                                <span>$<span id="deposit">0</span></span>
                            </div>
                        </div>
                        
                        <button id="book-now-btn" class="btn-gold w-100 mt-3" style="border: none; cursor: pointer;" disabled>Select Dates to Book</button>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Initialize date pickers
        initDatePickers();
        
        // Add event listeners
        document.getElementById('adults').addEventListener('change', updateBookingParams);
        document.getElementById('children').addEventListener('change', updateBookingParams);
    }
    
    function initDatePickers() {
        const checkinPicker = flatpickr('#checkin', {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            onChange: function(selectedDates, dateStr) {
                selectedCheckin = dateStr;
                if (dateStr && checkoutPicker) {
                    checkoutPicker.set('minDate', dateStr);
                }
                updateBookingParams();
                calculatePrice();
            }
        });
        
        const checkoutPicker = flatpickr('#checkout', {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            onChange: function(selectedDates, dateStr) {
                selectedCheckout = dateStr;
                updateBookingParams();
                calculatePrice();
            }
        });
        
        if (selectedCheckin) {
            checkinPicker.setDate(selectedCheckin);
        }
        if (selectedCheckout) {
            checkoutPicker.setDate(selectedCheckout);
        }
    }
    
    function updateBookingParams() {
        selectedAdults = parseInt(document.getElementById('adults').value) || 2;
        selectedChildren = parseInt(document.getElementById('children').value) || 0;
        
        const bookBtn = document.getElementById('book-now-btn');
        if (selectedCheckin && selectedCheckout) {
            bookBtn.disabled = false;
            bookBtn.textContent = 'Proceed to Booking';
        } else {
            bookBtn.disabled = true;
            bookBtn.textContent = 'Select Dates to Book';
        }
    }
    
    async function calculatePrice() {
        if (!selectedCheckin || !selectedCheckout || !roomData) return;
        
        const roomTypeId = roomData.RoomType ? roomData.RoomType.id : null;
        if (!roomTypeId) return;
        
        try {
            const response = await fetch('/api/availability/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomTypeId: roomTypeId,
                    checkIn: selectedCheckin,
                    checkOut: selectedCheckout
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                priceDetails = data;
                displayPriceBreakdown();
            }
        } catch (error) {
            console.error('Error calculating price:', error);
        }
    }
    
    function displayPriceBreakdown() {
        if (!priceDetails) return;
        
        document.getElementById('nights-count').textContent = priceDetails.nights;
        document.getElementById('nightly-rate').textContent = priceDetails.base_price;
        document.getElementById('subtotal').textContent = priceDetails.subtotal.toFixed(2);
        document.getElementById('tax').textContent = priceDetails.tax.toFixed(2);
        document.getElementById('total').textContent = priceDetails.total.toFixed(2);
        document.getElementById('deposit').textContent = priceDetails.deposit_required.toFixed(2);
        
        document.getElementById('price-breakdown').style.display = 'block';
    }
    
    // Book now button
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'book-now-btn') {
            if (selectedCheckin && selectedCheckout) {
                window.location.href = `/booking.html?room_id=${roomId}&checkin=${selectedCheckin}&checkout=${selectedCheckout}&adults=${selectedAdults}&children=${selectedChildren}`;
            }
        }
    });
});

// Image modal function
function openImageModal(imageUrl) {
    const modalHtml = `
        <div class="modal fade" id="imageModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body p-0">
                        <img src="${imageUrl}" class="img-fluid w-100">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();
    
    document.getElementById('imageModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}