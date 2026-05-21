require('dotenv').config();

let stripeWebhookInstance = null;

try {
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') {
        const Stripe = require('stripe');
        stripeWebhookInstance = Stripe(process.env.STRIPE_SECRET_KEY);
        console.log('✅ Stripe initialized for webhooks');
    } else {
        console.warn('⚠️ Stripe webhook: No valid API key found');
    }
} catch (error) {
    console.error('❌ Stripe webhook initialization failed:', error.message);
}

const { Booking, Guest, Room, Payment, RoomType, BookingService, MenuItem } = require('../models');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const db = require('../models');
const EmailService = require('../services/emailService');

function notifyAdmins(event, data) {
    try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
            io.to('admin_room').emit(event, data);
            console.log(`📡 Admin notified: ${event}`);
        }
    } catch (e) {
        console.log('Socket notification skipped:', e.message);
    }
}

async function handleWebhook(req, res) {
    if (!stripeWebhookInstance) {
        console.log('⚠️ Stripe not configured, webhook simulated');
        return res.json({ received: true, simulated: true });
    }
    
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripeWebhookInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('📨 Webhook event received:', event.type);

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const paymentType = session.metadata.payment_type || 'deposit';
            console.log('💰 Payment type:', paymentType);
            
            if (paymentType === 'services' || paymentType === 'services-only') {
                await handleServicePaymentComplete(session);
            } else if (paymentType === 'full') {
                await handleFullPaymentComplete(session);
            } else {
                await handleDepositPaymentComplete(session);
            }
            break;
        
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;
        
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
}

async function handleFullPaymentComplete(session) {
    console.log('🎉 FULL payment completed! Session ID:', session.id);
    
    const bookingId = session.metadata.booking_id;
    if (!bookingId) { console.log('❌ No booking_id'); return; }
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [
                { model: Guest },
                { model: Room, include: [{ model: RoomType }] },
                { model: BookingService, as: 'services', where: { status: 'pending' }, required: false }
            ]
        });
        
        if (!booking) { console.log('❌ Booking not found'); return; }
        
        if (booking.services) {
            for (const service of booking.services) {
                service.status = 'confirmed';
                await service.save();
            }
        }
        
        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.payment_status = PAYMENT_STATUS.PAID;
        booking.deposit_paid = booking.total_amount;
        booking.remaining_balance = 0;
        booking.confirmed_at = new Date();
        await booking.save();
        
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: booking.total_amount,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Full payment (room + services)'
        });
        
        // 🔔 ONLY ONE notification - Payment Confirmed (Green)
       notifyAdmins('payment_received', {
    type: 'payment',
    title: 'Payment Confirmed ✅',
    message: `Room ${booking.Room?.room_number || 'N/A'} - $${booking.total_amount} paid`,
    data: {
        payment: { amount: booking.total_amount, payment_method: 'card', service_type: 'full' },
        booking: { id: booking.id, booking_reference: booking.booking_reference }
    },
    timestamp: new Date(),
    color: 'success'
});
        
        // Send email
        try {
            const services = await BookingService.findAll({
                where: { booking_id: booking.id, status: 'confirmed' },
                include: [{ model: MenuItem, as: 'menu_item' }]
            });
            if (booking.Guest && EmailService) {
                await EmailService.sendCombinedReceipt(booking, booking.Guest, booking.Room, services);
            }
        } catch (e) { console.error('Email error:', e.message); }
        
    } catch (error) {
        console.error('❌ Error in handleFullPaymentComplete:', error.message);
    }
}

async function handleServicePaymentComplete(session) {
    console.log('🎉 Service payment completed!');
    
    const bookingId = session.metadata.booking_id;
    const servicesTotal = parseFloat(session.metadata.services_total || 0);
    if (!bookingId) return;
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [
                { model: Guest },
                { model: BookingService, as: 'services', where: { status: 'pending' }, required: false }
            ]
        });
        if (!booking) return;
        
        if (booking.services) {
            for (const service of booking.services) {
                service.status = 'confirmed';
                await service.save();
            }
        }
        
        const totalPaid = parseFloat(booking.deposit_paid || 0) + servicesTotal;
        if (totalPaid >= booking.total_amount) {
            booking.payment_status = PAYMENT_STATUS.PAID;
            booking.remaining_balance = 0;
            booking.deposit_paid = booking.total_amount;
        } else {
            booking.remaining_balance = booking.total_amount - totalPaid;
        }
        await booking.save();
        
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: servicesTotal,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Services payment'
        });
        
        notifyAdmins('payment_received', {
    type: 'payment',
    title: 'Additional Services Paid 🛎️',
    message: `$${servicesTotal} in services added to Booking ${booking.booking_reference}`,
    data: {
        payment: { amount: servicesTotal, payment_method: 'card' },
        booking: { id: booking.id, booking_reference: booking.booking_reference }
    },
    timestamp: new Date()
});
        
        try {
            const services = await BookingService.findAll({
                where: { booking_id: booking.id, status: 'confirmed' },
                include: [{ model: MenuItem, as: 'menu_item' }]
            });
            if (booking.Guest && EmailService) {
                await EmailService.sendServicePaymentReceipt(booking, booking.Guest, services, servicesTotal);
            }
        } catch (e) { console.error('Email error:', e.message); }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}


/**
 * Handle standalone service payment (no room booking)
 */
async function handleStandaloneServicePayment(session) {
    console.log('?? Standalone service payment completed!');
    
    const ref = session.metadata.booking_reference;
    const pendingServices = global.pendingServices?.[ref];
    
    if (pendingServices) {
        console.log('? Found pending services:', pendingServices);
        // Save to a service_orders table or log
        try {
            const { getIO } = require('../socket');
            const io = getIO();
            if (io) {
                io.to('admin_room').emit('new_request', {
                    type: 'request',
                    title: 'Service Order Paid ???',
                    message: `${pendingServices.guest_name || 'Guest'} paid ${pendingServices.total.toFixed(2)} for ${pendingServices.services.length} service(s)`,
                    data: pendingServices,
                    timestamp: new Date()
                });
            }
        } catch (e) {}
        
        // Clean up
        delete global.pendingServices[ref];
    }
}


async function handleStandaloneServicePayment(session) {
    console.log(' Service standalone payment completed!');
    const ref = session.metadata.booking_reference;
    const pending = global.pendingServices?.[ref];
    if (!pending) return;
    
    try {
        for (const service of pending.services) {
            await db.RequestSubmission.create({
                amenity_id: service.menu_item_id || 1,
                guest_name: pending.guest_name || 'Guest',
                guest_email: pending.guest_email,
                guest_phone: 'Not provided',
                request_type: 'service_order',
                request_details: service.name + ' x' + service.quantity + ' - (session) {
    console.log('🎉 Deposit payment completed!');
    
    const bookingId = session.metadata.booking_id;
    if (!bookingId) return;
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [{ model: Guest }, { model: Room, include: [{ model: RoomType }] }]
        });
        if (!booking) return;
        
        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.payment_status = PAYMENT_STATUS.DEPOSIT;
        booking.deposit_paid = session.amount_total / 100;
        booking.remaining_balance = booking.total_amount - booking.deposit_paid;
        booking.confirmed_at = new Date();
        await booking.save();
        
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: session.amount_total / 100,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Deposit payment'
        });
        
        // This one uses new_booking because it's a deposit (partial payment)
        notifyAdmins('payment_received', {
            type: 'payment',
            title: 'Deposit Paid 📝',
            message: `${booking.Guest?.first_name || 'Guest'} - Room ${booking.Room?.room_number || 'N/A'} - Deposit: $${(session.amount_total / 100).toFixed(2)}`,
            data: {
                payment: { amount: session.amount_total / 100, payment_method: 'card' },
                booking: { id: booking.id, booking_reference: booking.booking_reference }
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function handlePaymentSuccess(paymentIntent) {
    const metadata = paymentIntent.metadata;
    if (metadata?.booking_id) {
        try {
            const booking = await Booking.findByPk(parseInt(metadata.booking_id));
            if (booking && booking.payment_status !== PAYMENT_STATUS.PAID) {
                booking.payment_status = PAYMENT_STATUS.PAID;
                booking.remaining_balance = 0;
                await booking.save();
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

module.exports = { handleWebhook };
 + (service.price * service.quantity).toFixed(2),
                status: 'pending'
            });
        }
        console.log(' Service orders saved for admin');
    } catch (e) { console.error('Save error:', e.message); }
    
    try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) { io.to('admin_room').emit('new_request', { type: 'request', title: 'Service Order Paid ', message: (pending.guest_name||'Guest') + ' paid (session) {
    console.log('🎉 Deposit payment completed!');
    
    const bookingId = session.metadata.booking_id;
    if (!bookingId) return;
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [{ model: Guest }, { model: Room, include: [{ model: RoomType }] }]
        });
        if (!booking) return;
        
        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.payment_status = PAYMENT_STATUS.DEPOSIT;
        booking.deposit_paid = session.amount_total / 100;
        booking.remaining_balance = booking.total_amount - booking.deposit_paid;
        booking.confirmed_at = new Date();
        await booking.save();
        
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: session.amount_total / 100,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Deposit payment'
        });
        
        // This one uses new_booking because it's a deposit (partial payment)
        notifyAdmins('payment_received', {
            type: 'payment',
            title: 'Deposit Paid 📝',
            message: `${booking.Guest?.first_name || 'Guest'} - Room ${booking.Room?.room_number || 'N/A'} - Deposit: $${(session.amount_total / 100).toFixed(2)}`,
            data: {
                payment: { amount: session.amount_total / 100, payment_method: 'card' },
                booking: { id: booking.id, booking_reference: booking.booking_reference }
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function handlePaymentSuccess(paymentIntent) {
    const metadata = paymentIntent.metadata;
    if (metadata?.booking_id) {
        try {
            const booking = await Booking.findByPk(parseInt(metadata.booking_id));
            if (booking && booking.payment_status !== PAYMENT_STATUS.PAID) {
                booking.payment_status = PAYMENT_STATUS.PAID;
                booking.remaining_balance = 0;
                await booking.save();
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

module.exports = { handleWebhook };
 + pending.total.toFixed(2) + ' for ' + pending.services.length + ' service(s)', data: pending, timestamp: new Date() }); }
    } catch (e) {}
    
    delete global.pendingServices[ref];
}


async function handleDepositPaymentComplete(session) {
    console.log('🎉 Deposit payment completed!');
    
    const bookingId = session.metadata.booking_id;
    if (!bookingId) return;
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [{ model: Guest }, { model: Room, include: [{ model: RoomType }] }]
        });
        if (!booking) return;
        
        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.payment_status = PAYMENT_STATUS.DEPOSIT;
        booking.deposit_paid = session.amount_total / 100;
        booking.remaining_balance = booking.total_amount - booking.deposit_paid;
        booking.confirmed_at = new Date();
        await booking.save();
        
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: session.amount_total / 100,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Deposit payment'
        });
        
        // This one uses new_booking because it's a deposit (partial payment)
        notifyAdmins('payment_received', {
            type: 'payment',
            title: 'Deposit Paid 📝',
            message: `${booking.Guest?.first_name || 'Guest'} - Room ${booking.Room?.room_number || 'N/A'} - Deposit: $${(session.amount_total / 100).toFixed(2)}`,
            data: {
                payment: { amount: session.amount_total / 100, payment_method: 'card' },
                booking: { id: booking.id, booking_reference: booking.booking_reference }
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function handlePaymentSuccess(paymentIntent) {
    const metadata = paymentIntent.metadata;
    if (metadata?.booking_id) {
        try {
            const booking = await Booking.findByPk(parseInt(metadata.booking_id));
            if (booking && booking.payment_status !== PAYMENT_STATUS.PAID) {
                booking.payment_status = PAYMENT_STATUS.PAID;
                booking.remaining_balance = 0;
                await booking.save();
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

module.exports = { handleWebhook };


