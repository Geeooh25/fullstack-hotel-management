const express = require('express');
const router = express.Router();
const { BookingService, PaymentService } = require('../../services');
const { Booking, Guest, Room, RoomType, MenuItem, BookingService: BookingServiceModel } = require('../../models');
const { validateBooking } = require('../../middleware/validation');
const { bookingLimiter } = require('../../middleware/rateLimiter');
const EmailService = require('../../services/emailService');
const { Op } = require('sequelize');

// POST /api/bookings - Create a new booking (with optional cart)
router.post('/', bookingLimiter, validateBooking, async (req, res, next) => {
    try {
        console.log('📝 Booking request received');
        console.log('📝 Request body:', req.body);

        const cartItems = req.body.cart || null;
        
        const bookingData = {
            roomId: req.body.roomId,
            guestData: req.body.guest,
            checkIn: req.body.checkIn,
            checkOut: req.body.checkOut,
            adults: req.body.adults,
            children: req.body.children,
            specialRequests: req.body.specialRequests,
            source: req.body.source || 'online',
            cart: cartItems,
            user_id: req.body.user_id || null
        };

        const { booking, guest, room, price } = await BookingService.createBooking(bookingData);

        if (cartItems && cartItems.length > 0) {
            console.log('📝 Saving cart items as pending services:', cartItems);
            for (const item of cartItems) {
                await BookingServiceModel.create({
                    booking_id: booking.id,
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    price_at_time: item.price,
                    special_instructions: item.special_instructions || '',
                    appointment_time: item.appointment_time || null,
                    status: 'pending'
                });
            }
            console.log('✅ Cart items saved to booking:', booking.booking_reference);
        }

        const paymentAmount = parseFloat(booking.total_amount);
        
        console.log('💰 Creating checkout session for amount:', paymentAmount);
        console.log('💰 Booking ID:', booking.id);
        console.log('💰 Booking Reference:', booking.booking_reference);

        const successUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment-success.html?ref=${booking.booking_reference}&type=combined`;
        const cancelUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment-failed.html?ref=${booking.booking_reference}&type=combined`;
        
        const paymentResult = await PaymentService.createFullPaymentSession(
            paymentAmount,
            booking.booking_reference,
            guest.email,
            booking.id,
            successUrl,
            cancelUrl
        );

        if (!paymentResult.success) {
            console.log('❌ Payment creation failed, cancelling booking');
            await BookingService.cancelBooking(booking.id, 'Payment failed');
            return res.status(400).json({
                success: false,
                error: paymentResult.error
            });
        }

        console.log('✅ Sending response with checkout URL');

        res.json({
            success: true,
            booking: {
                id: booking.id,
                reference: booking.booking_reference,
                status: booking.status
            },
            checkoutUrl: paymentResult.url,
            price: price
        });
    } catch (error) {
        console.error('❌ Booking creation error:', error);
        next(error);
    }
});

// POST /api/bookings/add-services-pending - RESTRICTED to confirmed/future bookings only
router.post('/add-services-pending', async (req, res) => {
    try {
        const { booking_reference, guest_email, services } = req.body;
        
        console.log('📝 Saving pending services:', { booking_reference, guest_email, services });
        
        const booking = await Booking.findOne({
            where: { booking_reference },
            include: [{ model: Guest }]
        });
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        if (booking.Guest.email !== guest_email) {
            return res.status(403).json({ success: false, error: 'Email does not match booking' });
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDate = new Date(booking.check_in);
        
        if (booking.status !== 'confirmed') {
            return res.status(400).json({ success: false, error: 'Services can only be added to confirmed bookings' });
        }
        
        if (checkInDate < today) {
            return res.status(400).json({ success: false, error: 'Cannot add services to past or checked-out bookings' });
        }
        
        await BookingServiceModel.destroy({
            where: { booking_id: booking.id, status: 'pending' }
        });
        
        let servicesTotal = 0;
        
        for (const service of services) {
            await BookingServiceModel.create({
                booking_id: booking.id,
                menu_item_id: service.menu_item_id,
                quantity: service.quantity,
                price_at_time: service.price,
                special_instructions: service.special_instructions || '',
                appointment_time: service.appointment_time || null,
                status: 'pending'
            });
            servicesTotal += parseFloat(service.price) * parseInt(service.quantity);
        }
        
        const newTotal = parseFloat(booking.total_amount) + servicesTotal;
        const newRemainingBalance = parseFloat(booking.remaining_balance) + servicesTotal;
        
        await booking.update({
            total_amount: newTotal,
            remaining_balance: newRemainingBalance
        });
        
        console.log('✅ Pending services saved for booking:', booking.booking_reference);
        console.log('New booking total:', newTotal);
        
        res.json({ success: true, message: 'Services saved, ready for payment', total: newTotal });
        
    } catch (error) {
        console.error('❌ Error saving pending services:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/bookings/create-service-payment
router.post('/create-service-payment', async (req, res) => {
    try {
        const { booking_reference, guest_email, amount } = req.body;
        
        console.log('💰 Creating service payment session:', { booking_reference, guest_email, amount });
        
        const booking = await Booking.findOne({
            where: { booking_reference },
            include: [{ model: Guest }]
        });
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        if (booking.Guest.email !== guest_email) {
            return res.status(403).json({ success: false, error: 'Email does not match booking' });
        }
        
        const successUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment-success.html?ref=${booking_reference}&type=services`;
        const cancelUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment-failed.html?ref=${booking_reference}&type=services`;
        
        const paymentResult = await PaymentService.createFullPaymentSession(
            amount,
            booking_reference,
            guest_email,
            booking.id,
            successUrl,
            cancelUrl
        );
        
        if (!paymentResult.success) {
            return res.status(400).json({ success: false, error: paymentResult.error });
        }
        
        res.json({
            success: true,
            checkoutUrl: paymentResult.url,
            sessionId: paymentResult.sessionId
        });
        
    } catch (error) {
        console.error('❌ Error creating service payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/bookings/add-services (testing only)
router.post('/add-services', async (req, res) => {
    try {
        const { booking_reference, guest_email, services } = req.body;
        
        console.log('📝 Adding services to booking:', { booking_reference, guest_email, services });
        
        const booking = await Booking.findOne({
            where: { booking_reference },
            include: [{ model: Guest }]
        });
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        if (booking.Guest.email !== guest_email) {
            return res.status(403).json({ success: false, error: 'Email does not match booking' });
        }
        
        let servicesTotal = 0;
        
        for (const service of services) {
            await BookingServiceModel.create({
                booking_id: booking.id,
                menu_item_id: service.menu_item_id,
                quantity: service.quantity,
                price_at_time: service.price,
                special_instructions: service.special_instructions || '',
                appointment_time: service.appointment_time || null,
                status: 'confirmed'
            });
            servicesTotal += parseFloat(service.price) * parseInt(service.quantity);
        }
        
        const newTotal = parseFloat(booking.total_amount) + servicesTotal;
        const newRemainingBalance = parseFloat(booking.remaining_balance) + servicesTotal;
        
        await booking.update({
            total_amount: newTotal,
            remaining_balance: newRemainingBalance
        });
        
        console.log('✅ Services added. New total:', newTotal);
        
        const updatedBooking = await Booking.findByPk(booking.id, {
            include: [{ model: Guest }, { model: Room, include: [{ model: RoomType }] }]
        });
        
        try {
            await EmailService.sendBookingUpdateSimple(updatedBooking, updatedBooking.Guest, services);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }
        
        res.json({ success: true, booking: updatedBooking });
        
    } catch (error) {
        console.error('❌ Error adding services to booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bookings/lookup - WITH MenuItem include for service names
router.get('/lookup', async (req, res) => {
    try {
        const { reference, email } = req.query;

        if (!reference && !email) {
            return res.status(400).json({
                success: false,
                error: 'Booking reference or email is required'
            });
        }

        if (reference) {
            const booking = await Booking.findOne({
                where: { booking_reference: reference },
                include: [
                    { model: Guest },
                    { model: Room, include: [{ model: RoomType }] },
                    { 
                        model: BookingServiceModel, 
                        as: 'services',
                        include: [{ model: MenuItem, as: 'menu_item' }]
                    }
                ]
            });

            if (!booking) {
                return res.status(404).json({ success: false, error: 'Booking not found' });
            }

            return res.json({ success: true, booking });
        }

        if (email) {
            const guest = await Guest.findOne({ where: { email } });
            if (!guest) {
                return res.json({ success: true, bookings: [] });
            }

            const bookings = await Booking.findAll({
                where: { guest_id: guest.id },
                include: [
                    { model: Guest },
                    { model: Room, include: [{ model: RoomType }] },
                    { 
                        model: BookingServiceModel, 
                        as: 'services',
                        include: [{ model: MenuItem, as: 'menu_item' }]
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            return res.json({ success: true, bookings });
        }
    } catch (error) {
        console.error('❌ Lookup error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bookings/reference/:ref - WITH MenuItem include
router.get('/reference/:ref', async (req, res) => {
    try {
        const reference = req.params.ref;
        const booking = await Booking.findOne({
            where: { booking_reference: reference },
            include: [
                { model: Guest },
                { model: Room, include: [{ model: RoomType }] },
                { 
                    model: BookingServiceModel, 
                    as: 'services',
                    include: [{ model: MenuItem, as: 'menu_item' }]
                }
            ]
        });

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        res.json({ success: true, booking });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bookings/:id - WITH MenuItem include
router.get('/:id', async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const booking = await Booking.findByPk(bookingId, {
            include: [
                { model: Guest },
                { model: Room, include: [{ model: RoomType }] },
                { 
                    model: BookingServiceModel, 
                    as: 'services',
                    include: [{ model: MenuItem, as: 'menu_item' }]
                }
            ]
        });

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        res.json({ success: true, booking });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/bookings/:id/cancel
router.delete('/:id/cancel', async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { reason } = req.body;
        
        const booking = await Booking.findByPk(bookingId);
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Booking is already cancelled' });
        }
        
        if (booking.status === 'checked_out') {
            return res.status(400).json({ success: false, error: 'Cannot cancel a completed booking' });
        }
        
        booking.status = 'cancelled';
        booking.cancelled_at = new Date();
        booking.cancellation_reason = reason || 'Cancelled by guest';
        await booking.save();
        
        res.json({ success: true, message: 'Booking cancelled successfully', booking });
    } catch (error) {
        console.error('❌ Cancel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;