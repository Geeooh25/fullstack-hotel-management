const { RoomType } = require('../models');
const { calculateNights } = require('../utils/dateUtils');

class PricingService {
    // NO TAX - Simple pricing

    /**
     * Calculate total price for a booking (NO tax, NO seasonal rates, NO weekend multipliers, FULL PAYMENT)
     * @param {number} roomTypeId - Room Type ID
     * @param {string} checkIn - YYYY-MM-DD
     * @param {string} checkOut - YYYY-MM-DD
     * @param {Date} bookingDate - When the booking is made
     * @returns {Promise<Object>} - Price breakdown
     */
    static async calculatePrice(roomTypeId, checkIn, checkOut, bookingDate = new Date()) {
        // Get base price from room type
        const roomType = await RoomType.findByPk(roomTypeId);
        if (!roomType) {
            throw new Error('Room type not found');
        }

        const basePrice = parseFloat(roomType.base_price);
        const nights = calculateNights(checkIn, checkOut);
        
        // Simple calculation - base price × nights (NO tax)
        const subtotal = basePrice * nights;
        const total = subtotal;  // No tax added
        
        // NO DEPOSIT - full payment required
        const depositRequired = total;
        const remainingBalance = 0;
        
        return {
            base_price: basePrice,
            nights: nights,
            nightly_rates: [],
            subtotal: subtotal,
            tax: 0,
            total: total,
            deposit_required: depositRequired,
            remaining_balance: remainingBalance,
            discounts_applied: null
        };
    }

    /**
     * Calculate cancellation refund amount based on days before check-in
     * @param {Date} checkIn 
     * @param {Date} cancellationDate 
     * @param {number} totalPaid 
     * @returns {number}
     */
    static calculateRefund(checkIn, cancellationDate, totalPaid) {
        const daysBefore = Math.ceil((new Date(checkIn) - cancellationDate) / (1000 * 60 * 60 * 24));
        
        if (daysBefore >= 14) {
            return totalPaid; // Full refund
        } else if (daysBefore >= 7) {
            return totalPaid * 0.5; // 50% refund
        } else if (daysBefore >= 2) {
            return totalPaid * 0.25; // 25% refund
        } else {
            return 0; // No refund
        }
    }
}

module.exports = PricingService;