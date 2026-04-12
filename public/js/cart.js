// Cart Management System
class HotelCart {
    constructor() {
        this.storageKey = 'hotelCart';
        this.cart = this.loadCart();
    }

    loadCart() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveCart() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
        this.updateCartCount();
        this.dispatchCartEvent();
    }

    addItem(item) {
        const existingIndex = this.cart.findIndex(i => 
            i.menu_item_id === item.menu_item_id && 
            i.appointment_time === item.appointment_time
        );
        
        if (existingIndex > -1) {
            this.cart[existingIndex].quantity += item.quantity;
        } else {
            this.cart.push({
                id: Date.now(),
                menu_item_id: item.menu_item_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                special_instructions: item.special_instructions || '',
                appointment_time: item.appointment_time || null,
                category: item.category,
                image_url: item.image_url || ''
            });
        }
        
        this.saveCart();
        this.showAddedToast(item.name, item.quantity);
        return true;
    }

    updateQuantity(id, quantity) {
        const index = this.cart.findIndex(i => i.id === id);
        if (index > -1) {
            if (quantity <= 0) {
                this.cart.splice(index, 1);
            } else {
                this.cart[index].quantity = quantity;
            }
            this.saveCart();
        }
    }

    removeItem(id) {
        this.cart = this.cart.filter(i => i.id !== id);
        this.saveCart();
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
    }

    getTotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getItemCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    getCart() {
        return this.cart;
    }

    updateCartCount() {
        const countElement = document.getElementById('cartCount');
        if (countElement) {
            countElement.innerText = this.getItemCount();
        }
    }

    dispatchCartEvent() {
        window.dispatchEvent(new Event('cartUpdated'));
    }

    showAddedToast(itemName, quantity) {
        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            Added ${quantity} × ${itemName} to cart
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    // NEW: Save cart items to a confirmed booking
    async saveToBooking(bookingReference, guestEmail) {
        if (this.cart.length === 0) {
            this.showMessage('Your cart is empty', 'warning');
            return { success: false, error: 'Cart is empty' };
        }

        try {
            // Format services for API
            const services = this.cart.map(item => ({
                menu_item_id: item.menu_item_id,
                quantity: item.quantity,
                price: item.price,
                special_instructions: item.special_instructions || '',
                appointment_time: item.appointment_time || null
            }));

            console.log('Saving services to booking:', { booking_reference: bookingReference, guest_email: guestEmail, services });

            const response = await fetch('/api/bookings/add-services-pending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_reference: bookingReference,
                    guest_email: guestEmail,
                    services: services
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Show specific error message based on response
                if (data.error === 'Services can only be added to confirmed bookings') {
                    this.showMessage('⚠️ Please complete payment for your booking first, then add services.', 'error');
                    setTimeout(() => {
                        window.location.href = `/booking-lookup.html?ref=${bookingReference}`;
                    }, 3000);
                } else if (data.error === 'Cannot add services to past or checked-out bookings') {
                    this.showMessage('⚠️ Cannot add services to past or checked-out bookings.', 'error');
                } else {
                    this.showMessage('Error: ' + (data.error || 'Could not add services'), 'error');
                }
                return { success: false, error: data.error };
            }

            this.showMessage('✅ Services added to your booking successfully!', 'success');
            
            // Clear cart after successful save
            this.clearCart();
            
            return { success: true, data };
            
        } catch (error) {
            console.error('Error saving services:', error);
            this.showMessage('Network error. Please try again.', 'error');
            return { success: false, error: error.message };
        }
    }

    // Helper method to show messages
    showMessage(message, type) {
        const toast = document.createElement('div');
        toast.className = `cart-toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}

// Initialize global cart
const hotelCart = new HotelCart();

// Make available globally
window.hotelCart = hotelCart;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = hotelCart;
}