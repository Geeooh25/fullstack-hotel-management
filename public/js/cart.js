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
}

// Initialize global cart
const hotelCart = new HotelCart();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = hotelCart;
}