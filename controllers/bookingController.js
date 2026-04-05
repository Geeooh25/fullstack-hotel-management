const { BookingService, EmailService } = require('../services');
const { Booking, Guest, Room, RoomType, Payment } = require('../models');

class BookingController {
    
    // Create a new booking
    static async create(req, res, next) {
        try {
            const bookingData = {
                roomId: req.body.roomId,
                guestData: req.body.guest,
                checkIn: req.body.checkIn,
                checkOut: req.body.checkOut,
                adults: req.body.adults,
                children: req.body.children,
                specialRequests: req.body.specialRequests,
                source: req.body.source || 'online'
            };
            
            const { booking, guest, room, price } = await BookingService.createBooking(bookingData);
            
            res.status(201).json({
                success: true,
                booking: {
                    id: booking.id,
                    reference: booking.booking_reference,
                    status: booking.status
                },
                price: price
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get booking by reference
    static async getByReference(req, res, next) {
        try {
            const { reference } = req.params;
            const booking = await BookingService.getBookingByReference(reference);
            
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }
            
            res.json({
                success: true,
                booking: booking
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get guest bookings by email
    static async getByEmail(req, res, next) {
        try {
            const { email } = req.query;
            const bookings = await BookingService.getGuestBookings(email);
            
            res.json({
                success: true,
                bookings: bookings
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Cancel booking
    static async cancel(req, res, next) {
        try {
            const { reference } = req.params;
            const { reason } = req.body;
            
            const booking = await BookingService.cancelBookingByReference(reference, reason);
            
            res.json({
                success: true,
                message: 'Booking cancelled successfully',
                booking: booking
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Check-in (admin)
    static async checkIn(req, res, next) {
        try {
            const { id } = req.params;
            const booking = await BookingService.checkIn(id, req.body);
            
            res.json({
                success: true,
                booking: booking
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Check-out (admin)
    static async checkOut(req, res, next) {
        try {
            const { id } = req.params;
            const { finalAmount } = req.body;
            const booking = await BookingService.checkOut(id, finalAmount);
            
            res.json({
                success: true,
                booking: booking
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = BookingController;