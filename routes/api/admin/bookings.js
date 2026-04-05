const express = require('express');
const router = express.Router();
const { Booking, Guest, Room } = require('../../../models');
const BookingService = require('../../../services/bookingService');
const { isAuthenticated, isStaff } = require('../../../middleware/auth');

router.use(isAuthenticated);
router.use(isStaff);

// Get all bookings
router.get('/', async (req, res, next) => {
    try {
        const bookings = await Booking.findAll({
            include: [
                { model: Guest },
                { model: Room }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, bookings });
    } catch (error) {
        next(error);
    }
});

// Get booking details
router.get('/:id', async (req, res, next) => {
    try {
        const booking = await Booking.findByPk(req.params.id, {
            include: [
                { model: Guest },
                { model: Room, include: [{ model: RoomType }] },
                { model: Payment }
            ]
        });
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }
});

// Check-in booking
router.post('/:id/checkin', async (req, res, next) => {
    try {
        const booking = await BookingService.checkIn(req.params.id, req.body);
        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }
});

// Check-out booking
router.post('/:id/checkout', async (req, res, next) => {
    try {
        const { finalAmount } = req.body;
        const booking = await BookingService.checkOut(req.params.id, finalAmount);
        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }
});

// Cancel booking
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const { reason } = req.body;
        const booking = await BookingService.cancelBooking(req.params.id, reason);
        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }
});

module.exports = router;