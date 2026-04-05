const { Booking, Guest, Room, RoomType, Payment } = require('../models');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const AvailabilityService = require('./availabilityService');
const PricingService = require('./pricingService');
const { calculateNights } = require('../utils/dateUtils');
const EmailService = require('./emailService');

class BookingService {
    /**
     * Create a new booking
     * @param {Object} bookingData - Booking details
     * @returns {Promise<Object>} - Created booking
     */
    static async createBooking(bookingData) {
        const {
            roomId,
            guestData,
            checkIn,
            checkOut,
            adults,
            children,
            specialRequests,
            source = 'online',
            cart = null,
            user_id = null  // ADDED: link to user account
        } = bookingData;

        // Check availability first
        const isAvailable = await AvailabilityService.isRoomAvailable(roomId, checkIn, checkOut);
        if (!isAvailable) {
            throw new Error('Room is not available for selected dates');
        }

        // Get room and its type
        const room = await Room.findByPk(roomId, {
            include: [{ model: RoomType }]
        });
        
        if (!room) {
            throw new Error('Room not found');
        }

        // Create or find guest
        let guest = await Guest.findOne({
            where: { email: guestData.email }
        });

        if (!guest) {
            guest = await Guest.create({
                first_name: guestData.firstName,
                last_name: guestData.lastName,
                email: guestData.email,
                phone: guestData.phone,
                address: guestData.address,
                city: guestData.city,
                country: guestData.country
            });
        }

        // Calculate room price only (no deposit)
        const priceDetails = await PricingService.calculatePrice(
            room.room_type_id,
            checkIn,
            checkOut,
            new Date()
        );

        // Calculate cart total if exists
        let cartTotal = 0;
        if (cart && cart.length > 0) {
            cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
        }

        // Total amount = room total + cart total (FULL PAYMENT, no deposit)
        const totalAmount = priceDetails.total + cartTotal;

        // Create booking (no deposit - pay in full) - NOW WITH user_id
        const booking = await Booking.create({
            guest_id: guest.id,
            room_id: roomId,
            check_in: checkIn,
            check_out: checkOut,
            adults: adults || 1,
            children: children || 0,
            total_nights: priceDetails.nights,
            subtotal: priceDetails.subtotal,
            tax: priceDetails.tax,
            total_amount: totalAmount,
            deposit_paid: 0,
            remaining_balance: totalAmount,
            status: BOOKING_STATUS.PENDING,
            payment_status: PAYMENT_STATUS.UNPAID,
            source: source,
            special_requests: specialRequests,
            user_id: user_id  // ADDED: links booking to user account
        });

        return {
            booking,
            guest,
            room,
            price: {
                ...priceDetails,
                cart_total: cartTotal,
                total: totalAmount,
                deposit_required: totalAmount,
                remaining_balance: totalAmount
            }
        };
    }

    /**
     * Confirm a booking after payment (FULL PAYMENT)
     */
    static async confirmBooking(bookingId, paymentAmount, paymentMethod = 'card', transactionId = null) {
        const booking = await Booking.findByPk(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== BOOKING_STATUS.PENDING) {
            throw new Error(`Cannot confirm booking with status: ${booking.status}`);
        }

        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.confirmed_at = new Date();
        booking.deposit_paid = paymentAmount;
        booking.remaining_balance = booking.total_amount - paymentAmount;
        booking.payment_status = PAYMENT_STATUS.PAID;
        
        await booking.save();

        const payment = await Payment.create({
            booking_id: bookingId,
            amount: paymentAmount,
            payment_method: paymentMethod,
            status: 'succeeded',
            transaction_id: transactionId
        });

        const guest = await Guest.findByPk(booking.guest_id);
        const room = await Room.findByPk(booking.room_id, {
            include: [{ model: RoomType }]
        });
        
        if (guest && room) {
            await EmailService.sendBookingConfirmation(booking, guest, room, {
                total: booking.total_amount,
                deposit_required: paymentAmount,
                remaining_balance: booking.remaining_balance
            });
        }

        return { booking, payment };
    }

    /**
     * Cancel a booking
     */
    static async cancelBooking(bookingId, reason) {
        const booking = await Booking.findByPk(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status === BOOKING_STATUS.CANCELLED) {
            throw new Error('Booking is already cancelled');
        }

        if (booking.status === BOOKING_STATUS.CHECKED_OUT) {
            throw new Error('Cannot cancel a completed booking');
        }

        booking.status = BOOKING_STATUS.CANCELLED;
        booking.cancelled_at = new Date();
        booking.cancellation_reason = reason;
        
        await booking.save();

        const guest = await Guest.findByPk(booking.guest_id);
        if (guest) {
            console.log(`📧 Booking ${booking.booking_reference} cancelled for ${guest.email}`);
        }

        return booking;
    }

    /**
     * Cancel booking by reference
     */
    static async cancelBookingByReference(reference, reason) {
        const booking = await Booking.findOne({
            where: { booking_reference: reference }
        });
        
        if (!booking) {
            throw new Error('Booking not found');
        }
        
        return await this.cancelBooking(booking.id, reason);
    }

    /**
     * Check in a guest
     */
    static async checkIn(bookingId, checkInData) {
        const booking = await Booking.findByPk(bookingId, {
            include: [{ model: Room }]
        });
        
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== BOOKING_STATUS.CONFIRMED) {
            throw new Error(`Cannot check in booking with status: ${booking.status}`);
        }

        booking.status = BOOKING_STATUS.CHECKED_IN;
        booking.checked_in_at = new Date();
        
        if (booking.Room) {
            booking.Room.status = 'occupied';
            await booking.Room.save();
        }
        
        await booking.save();

        const guest = await Guest.findByPk(booking.guest_id);
        if (guest) {
            await EmailService.sendCheckInReminder(booking, guest, booking.Room);
        }

        return booking;
    }

    /**
     * Check out a guest
     */
    static async checkOut(bookingId, finalAmount = null) {
        const booking = await Booking.findByPk(bookingId, {
            include: [{ model: Room }]
        });
        
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== BOOKING_STATUS.CHECKED_IN) {
            throw new Error(`Cannot check out booking with status: ${booking.status}`);
        }

        booking.status = BOOKING_STATUS.CHECKED_OUT;
        booking.checked_out_at = new Date();
        
        if (finalAmount) {
            booking.total_amount = finalAmount;
            booking.remaining_balance = 0;
            booking.payment_status = PAYMENT_STATUS.PAID;
        }
        
        if (booking.Room) {
            booking.Room.status = 'cleaning';
            await booking.Room.save();
        }
        
        await booking.save();

        const guest = await Guest.findByPk(booking.guest_id);
        const payments = await Payment.findAll({
            where: { booking_id: bookingId }
        });
        
        if (guest) {
            await EmailService.sendReceipt(booking, guest, payments);
        }

        return booking;
    }

    /**
     * Get booking by reference
     */
    static async getBookingByReference(reference) {
        const booking = await Booking.findOne({
            where: { booking_reference: reference },
            include: [
                { model: Guest },
                { model: Room, include: [{ model: RoomType }] },
                { model: Payment }
            ]
        });
        
        return booking;
    }

    /**
     * Get bookings for a guest
     */
    static async getGuestBookings(email) {
        const guest = await Guest.findOne({ where: { email } });
        if (!guest) return [];
        
        const bookings = await Booking.findAll({
            where: { guest_id: guest.id },
            include: [
                { model: Room, include: [{ model: RoomType }] }
            ],
            order: [['created_at', 'DESC']]
        });
        
        return bookings;
    }

    /**
     * Send confirmation email for existing booking
     */
    static async sendConfirmationEmail(bookingId) {
        try {
            const booking = await Booking.findByPk(bookingId, {
                include: [
                    { model: Guest },
                    { model: Room, include: [{ model: RoomType }] }
                ]
            });
            
            if (booking && booking.Guest && booking.Room) {
                await EmailService.sendBookingConfirmation(
                    booking,
                    booking.Guest,
                    booking.Room,
                    {
                        total: booking.total_amount,
                        deposit_required: booking.deposit_paid,
                        remaining_balance: booking.remaining_balance
                    }
                );
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to send confirmation email:', error);
            return false;
        }
    }
}

module.exports = BookingService;