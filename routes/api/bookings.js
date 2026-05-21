const express = require('express');
const router = express.Router();
const { BookingService, PaymentService } = require('../../services');
const { Booking, Guest, Room, RoomType, MenuItem, BookingService: BookingServiceModel } = require('../../models');
const { validateBooking } = require('../../middleware/validation');
const { bookingLimiter } = require('../../middleware/rateLimiter');
const EmailService = require('../../services/emailService');
const { Op } = require('sequelize');
const db = require('../../models');

// ==================== HISTORICAL BOOKING (Super Admin Only) ====================
router.post('/historical', async (req, res) => {
    if (!req.session.admin || req.session.admin.role !== 'super_admin') {
        return res.status(403).json({ 
            success: false, 
            error: 'Only Super Admin can create historical bookings' 
        });
    }
    
    try {
        const { 
            guest_name, guest_email, guest_phone, room_id, 
            check_in, check_out, adults, children, 
            total_amount, payment_method, special_requests,
            id_number, address 
        } = req.body;
        
        console.log('📜 Historical booking request:', { guest_name, guest_email, room_id, check_in, check_out });
        
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            return res.status(400).json({ success: false, error: 'Invalid date format' });
        }
        
        if (checkOutDate <= checkInDate) {
            return res.status(400).json({ success: false, error: 'Check-out must be after check-in' });
        }
        
        const isHistorical = checkInDate < today;
        
        const nameParts = guest_name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        let guest = await db.Guest.findOne({ where: { email: guest_email } });
        if (!guest) {
            guest = await db.Guest.create({
                first_name: firstName,
                last_name: lastName,
                email: guest_email,
                phone: guest_phone,
                id_card_number: id_number,
                address: address
            });
        }
        
        const booking = await db.Booking.create({
            booking_reference: 'HIST-' + Date.now(),
            guest_id: guest.id,
            room_id: parseInt(room_id),
            check_in: check_in,
            check_out: check_out,
            adults: adults || 2,
            children: children || 0,
            total_amount: total_amount,
            status: 'checked_out',
            payment_status: 'paid',
            source: 'historical',
            special_requests: special_requests || null,
            is_historical: isHistorical,
            created_by_admin_id: req.session.admin.id
        });
        
        await db.Payment.create({
            booking_id: booking.id,
            amount: total_amount,
            payment_method: payment_method || 'cash',
            status: 'completed',
            transaction_id: 'HIST-' + Date.now()
        });
        
        await db.ActivityLog.create({
            admin_id: req.session.admin.id,
            admin_username: req.session.admin.email,
            action: 'historical_booking',
            details: JSON.stringify({ 
                booking_id: booking.id,
                guest: guest_email,
                check_in, 
                check_out,
                is_historical: true,
                warning: 'Past date booking recorded'
            }),
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });
        
        res.json({ 
            success: true, 
            booking,
            warning: isHistorical ? 'Past date booking recorded successfully' : null
        });
        
    } catch (error) {
        console.error('Historical booking error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== COUNTER BOOKING ====================
router.post('/counter', async (req, res) => {
    try {
        const { guest_name, guest_email, guest_phone, room_id, check_in, check_out, adults, children, payment_method, special_requests, total_amount, id_number, address } = req.body;
        
        console.log('📝 Counter booking request:', { guest_name, guest_email, room_id, check_in, check_out });
        
        const nameParts = guest_name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        let guest = await db.Guest.findOne({ where: { email: guest_email } });
        if (!guest) {
            guest = await db.Guest.create({
                first_name: firstName,
                last_name: lastName,
                email: guest_email,
                phone: guest_phone,
                id_card_number: id_number,
                address: address
            });
        }
        
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        
        const room = await db.Room.findByPk(room_id, { include: [{ model: db.RoomType }] });
        const roomPrice = room.RoomType ? room.RoomType.base_price : 129.99;
        const subtotal = roomPrice * nights;
        const finalAmount = subtotal;
        
        const booking = await db.Booking.create({
            booking_reference: 'BKG-' + Date.now(),
            guest_id: guest.id,
            room_id: parseInt(room_id),
            check_in: check_in,
            check_out: check_out,
            adults: adults || 2,
            children: children || 0,
            total_nights: nights,
            subtotal: subtotal,
            tax: 0,
            total_amount: finalAmount,
            status: 'confirmed',
            payment_status: 'completed',
            source: 'walk_in',
            special_requests: special_requests
        });
        
        const payment = await db.Payment.create({
            booking_id: booking.id,
            amount: finalAmount,
            payment_method: payment_method || 'cash',
            status: 'completed',
            transaction_id: 'WALK-' + Date.now()
        });
        
        const fullBooking = await db.Booking.findByPk(booking.id, {
            include: [
                { model: db.Guest },
                { model: db.Room, include: [{ model: db.RoomType }] },
                { model: db.Payment }
            ]
        });
        
        res.json({ success: true, booking: fullBooking });
        
                // Notify admins
        try {
            const { sendNewBookingNotification } = require('../../socket');
            sendNewBookingNotification({
                id: booking.id,
                booking_reference: booking.booking_reference,
                guest_name: guest_name,
                room_number: room.room_number,
                check_in: check_in,
                check_out: check_out,
                total_amount: finalAmount,
                status: 'confirmed',
                source: 'walk_in'
            });
        } catch (socketError) {
            console.error('WebSocket notification error:', socketError.message);
        }
    } catch (error) {
        console.error('Counter booking error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/bookings - Create a new booking
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
              
        // Notify admins via WebSocket
        try {
            const { sendNewBookingNotification } = require('../../socket');
            sendNewBookingNotification({
                id: booking.id,
                booking_reference: booking.booking_reference,
                guest_name: `${guest.first_name} ${guest.last_name}`,
                room_number: room.room_number,
                check_in: bookingData.checkIn,
                check_out: bookingData.checkOut,
                total_amount: booking.total_amount,
                status: booking.status,
                source: bookingData.source || 'online',
                 color: 'warning'
            });
            console.log('📡 Admin notified via WebSocket');
        } catch (socketError) {
            console.error('WebSocket notification error:', socketError.message);
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

// POST /api/bookings/add-services-pending
router.post('/add-services-pending', async (req, res) => {
    try {
        const { booking_reference, guest_email, services } = req.body;
        
        console.log('📝 Saving pending services:', { booking_reference, guest_email, services });
        
        if (!booking_reference || !guest_email || !services || !services.length) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: booking_reference, guest_email, or services' 
            });
        }
        
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
            return res.status(400).json({ 
                success: false, 
                error: 'Services can only be added to confirmed bookings. Please complete payment first.' 
            });
        }
        
        if (checkInDate < today) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot add services to past or checked-out bookings' 
            });
        }
        
        await BookingServiceModel.destroy({
            where: { booking_id: booking.id, status: 'pending' }
        });
        
        let servicesTotal = 0;
        
        for (const service of services) {
            if (!service.menu_item_id || !service.quantity || !service.price) {
                console.log('⚠️ Invalid service data:', service);
                continue;
            }
            
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
        
        res.json({ 
            success: true, 
            message: 'Services saved, ready for payment', 
            total: newTotal,
            servicesTotal: servicesTotal
        });
        
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

// POST /api/bookings/add-services
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
// TEMP: Fix booking ID sequence
router.all('/fix-sequence', async (req, res) => {
    try {
        const { sequelize } = require('../../config/database');
        
        const [results] = await sequelize.query(
            `SELECT MAX(id) as max_id FROM bookings`
        );
        
        const maxId = results[0] ? results[0].max_id : 0;
        const nextId = (maxId || 0) + 1;
        
        await sequelize.query(
            `SELECT setval(pg_get_serial_sequence('bookings', 'id'), ${nextId}, false)`
        );
        
        res.json({ 
            success: true, 
            message: `Sequence reset to ${nextId}`, 
            maxId: maxId,
            nextId: nextId
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message
        });
    }
});
// GET /api/bookings/lookup
router.get('/lookup', async (req, res) => {
    try {
        const { reference, email, user_id } = req.query;

        if (!reference && !email && !user_id) {
            return res.status(400).json({
                success: false,
                error: 'Booking reference, email, or user_id is required'
            });
        }

        // Search by reference
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

        // Search by email OR user_id
        let bookings = [];
        const whereConditions = [];
        
        // Method 1: Search by guest email (via guest_id)
        if (email) {
            const guest = await Guest.findOne({ where: { email } });
            if (guest) {
                whereConditions.push({ guest_id: guest.id });
            }
        }
        
        // Method 2: Search by user_id directly on booking
        if (user_id) {
            const userId = parseInt(user_id);
            if (!isNaN(userId) && userId > 0) {
                whereConditions.push({ user_id: userId });
            }
        }
        
        // If we have conditions, search
        if (whereConditions.length > 0) {
            bookings = await Booking.findAll({
                where: {
                    [Op.or]: whereConditions
                },
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
        }
        
        return res.json({ success: true, bookings });
        
    } catch (error) {
        console.error('❌ Lookup error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bookings/reference/:ref
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

// GET /api/bookings/reference/:ref/receipt - Download receipt by reference
router.get('/reference/:ref/receipt', async (req, res) => {
    try {
        const reference = req.params.ref;
        const PDFService = require('../../services/pdfService');
        
        const booking = await db.Booking.findOne({
            where: { booking_reference: reference },
            include: [
                { model: db.Guest },
                { model: db.Room, include: [{ model: db.RoomType }] },
                { 
                    model: db.BookingService,
                    as: 'services',
                    include: [{ model: db.MenuItem, as: 'menu_item' }]
                }
            ]
        });
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        // Fetch payments directly with raw query
        const payments = await db.sequelize.query(
            `SELECT * FROM payments WHERE booking_id = :bookingId ORDER BY created_at DESC`,
            {
                replacements: { bookingId: booking.id },
                type: db.sequelize.QueryTypes.SELECT
            }
        );
        
        console.log(`📄 Generating receipt for ${booking.booking_reference}`);
        console.log(`   Payments found: ${payments.length}`);
        payments.forEach((p, i) => {
            console.log(`   Payment ${i+1}: ${p.payment_method} - ${p.status} - $${p.amount}`);
        });
        
        const pdfBuffer = await PDFService.generateReceipt(
            booking,
            booking.Guest,
            booking.Room,
            payments || [],
            booking.services || []
        );
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${booking.booking_reference}.pdf"`);
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bookings/:id
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

// GET /api/bookings/:id/receipt - Download receipt PDF
router.get('/:id/receipt', async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        if (isNaN(bookingId)) {
            return res.status(400).json({ error: 'Invalid booking ID' });
        }
        
        const PDFService = require('../../services/pdfService');
        
        const booking = await db.Booking.findByPk(bookingId, {
            include: [
                { model: db.Guest },
                { model: db.Room, include: [{ model: db.RoomType }] },
                { 
                    model: db.BookingService,
                    as: 'services',
                    include: [{ model: db.MenuItem, as: 'menu_item' }]
                }
            ]
        });
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        // Fetch payments directly with raw query
        const payments = await db.sequelize.query(
            `SELECT * FROM payments WHERE booking_id = :bookingId ORDER BY created_at DESC`,
            {
                replacements: { bookingId: bookingId },
                type: db.sequelize.QueryTypes.SELECT
            }
        );
        
        console.log(`📄 Generating receipt for ${booking.booking_reference}`);
        console.log(`   Payments found: ${payments.length}`);
        payments.forEach((p, i) => {
            console.log(`   Payment ${i+1}: ${p.payment_method} - ${p.status} - $${p.amount}`);
        });
        
        const pdfBuffer = await PDFService.generateReceipt(
            booking,
            booking.Guest,
            booking.Room,
            payments,
            booking.services || []
        );
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${booking.booking_reference}.pdf"`);
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// SIMPLE SEARCH - Only by booking reference
router.get('/find-booking', async (req, res) => {
    try {
        const { ref } = req.query;
        
        console.log('🔍 Looking for booking:', ref);
        
        if (!ref || ref.trim() === '') {
            return res.json({ success: false, message: 'No reference provided' });
        }
        
        const booking = await db.sequelize.query(
            `SELECT b.*, 
                    g.first_name, g.last_name, g.email, g.phone,
                    r.room_number, rt.name as room_type
             FROM bookings b
             LEFT JOIN guests g ON b.guest_id = g.id
             LEFT JOIN rooms r ON b.room_id = r.id
             LEFT JOIN room_types rt ON r.room_type_id = rt.id
             WHERE b.booking_reference = :ref
             LIMIT 1`,
            {
                replacements: { ref: ref },
                type: db.sequelize.QueryTypes.SELECT
            }
        );
        
        if (booking && booking.length > 0) {
            res.json({ success: true, booking: booking[0] });
        } else {
            res.json({ success: false, message: 'Booking not found' });
        }
    } catch (error) {
        console.error('Find booking error:', error);
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
        
        if (booking.status === 'checked_in') {
            return res.status(400).json({ success: false, error: 'Cannot cancel after check-in. Please contact reception.' });
        }
        
        // Check 3-day cancellation policy
        const checkIn = new Date(booking.check_in);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        checkIn.setHours(0, 0, 0, 0);
        const daysUntilCheckIn = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilCheckIn < 3) {
            const dayText = daysUntilCheckIn === 0 ? 'today' : 
                           daysUntilCheckIn === 1 ? 'tomorrow' : 
                           `in ${daysUntilCheckIn} days`;
            return res.status(400).json({ 
                success: false, 
                error: `Cancellation is only allowed 3 or more days before check-in. Your check-in is ${dayText}.`
            });
        }
        
        booking.status = 'cancelled';
        booking.cancelled_at = new Date();
        booking.cancellation_reason = reason || 'Cancelled by guest';
        await booking.save();
        
        // Send cancellation email
        try {
            const guest = await Guest.findByPk(booking.guest_id);
            const room = await Room.findByPk(booking.room_id);
            await EmailService.sendCancellationEmail(booking, guest, reason);
            console.log(`📧 Cancellation email sent to ${guest.email}`);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }
        
        res.json({ success: true, message: 'Booking cancelled successfully', booking });
    } catch (error) {
        console.error('❌ Cancel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get today's arrivals
router.get('/today/arrivals', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const bookings = await db.Booking.findAll({
        where: { check_in: today, status: 'confirmed' },
        include: [{ model: db.Guest }, { model: db.Room }]
    });
    res.json(bookings);
});

// Get today's departures
router.get('/today/departures', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const bookings = await db.Booking.findAll({
        where: { check_out: today, status: ['confirmed', 'checked_in'] },
        include: [{ model: db.Guest }, { model: db.Room }]
    });
    res.json(bookings);
});

// Check-in
router.post('/:id/checkin', async (req, res) => {
    await db.Booking.update({ status: 'checked_in', checked_in_at: new Date() }, { where: { id: req.params.id } });
    res.json({ success: true });
});

// Check-out
router.post('/:id/checkout', async (req, res) => {
    await db.Booking.update({ status: 'checked_out', checked_out_at: new Date() }, { where: { id: req.params.id } });
    res.json({ success: true });
});


// Search bookings
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        console.log('🔍 Searching for:', q);
        
        if (!q || q.trim() === '') {
            return res.json([]);
        }
        
        const searchTerm = `%${q}%`;
        
        const bookings = await db.sequelize.query(
            `SELECT 
                b.id, 
                b.booking_reference, 
                b.check_in, 
                b.check_out, 
                b.status, 
                b.total_amount,
                b.created_at,
                g.id as guest_id,
                g.first_name, 
                g.last_name, 
                g.email, 
                g.phone,
                r.id as room_id,
                r.room_number,
                rt.name as room_type
            FROM bookings b
            LEFT JOIN guests g ON b.guest_id = g.id
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN room_types rt ON r.room_type_id = rt.id
            WHERE b.booking_reference LIKE :searchTerm
               OR g.first_name LIKE :searchTerm
               OR g.last_name LIKE :searchTerm
               OR g.email LIKE :searchTerm
               OR r.room_number LIKE :searchTerm
            ORDER BY b.created_at DESC
            LIMIT 50`,
            {
                replacements: { searchTerm: searchTerm },
                type: db.sequelize.QueryTypes.SELECT
            }
        );
        
        console.log(`✅ Found ${bookings.length} results for "${q}"`);
        res.json(bookings);
        
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;