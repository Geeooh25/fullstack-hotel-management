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

const { Booking, Guest, Room, Payment, RoomType, BookingService, MenuItem, RequestSubmission } = require('../models');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const EmailService = require('../services/emailService');

function notifyAdmins(event, data) {
    try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
            io.to('admin_room').emit(event, data);
            console.log('📡 Admin notified: ' + event);
        }
    } catch (e) {
        console.log('Socket skipped:', e.message);
    }
}

async function handleWebhook(req, res) {
    if (!stripeWebhookInstance) {
        return res.json({ received: true, simulated: true });
    }
    
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripeWebhookInstance.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send('Webhook Error: ' + err.message);
    }

    console.log('📨 Webhook:', event.type);

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const paymentType = session.metadata.payment_type || 'deposit';
            console.log('💰 Payment type:', paymentType);
            
            if (paymentType === 'services-only') {
                await handleStandaloneServicePayment(session);
            } else if (paymentType === 'services') {
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
    }

    res.json({ received: true });
}

// Standalone service payment (no room)
async function handleStandaloneServicePayment(session) {
    console.log('🎉 Standalone service payment!');
    const ref = session.metadata.booking_reference;
    const pending = global.pendingServices && global.pendingServices[ref];
    if (!pending) { console.log('No pending services found for:', ref); return; }
    
    try {
        const ServiceOrder = require('../models/serviceOrder');
        await ServiceOrder.create({
            reference: ref,
            guest_name: pending.guest_name || 'Guest',
            guest_email: pending.guest_email,
            services: JSON.stringify(pending.services),
            total_amount: pending.total,
            status: 'pending',
            payment_status: 'paid'
        });
        console.log('✅ Service order saved:', ref);
    } catch (e) { console.error('Save error:', e.message); }
    
    notifyAdmins('new_request', {
        type: 'request',
        title: 'Service Order Paid 🛎️',
        message: (pending.guest_name || 'Guest') + ' paid $' + pending.total.toFixed(2),
        data: pending,
        timestamp: new Date()
    });
    
    delete global.pendingServices[ref];
}

// Full payment (room + services)
async function handleFullPaymentComplete(session) {
    const bookingId = session.metadata.booking_id;
    if (!bookingId) return;
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [{ model: Guest }, { model: Room, include: [{ model: RoomType }] }]
        });
        if (!booking) return;
        
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
            notes: 'Full payment'
        });
        
        notifyAdmins('payment_received', {
            type: 'payment',
            title: 'Payment Confirmed ✅',
            message: 'Room ' + (booking.Room?.room_number || 'N/A') + ' - $' + booking.total_amount,
            data: { payment: { amount: booking.total_amount }, booking: { id: booking.id, booking_reference: booking.booking_reference } },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Service payment (added to existing booking)
async function handleServicePaymentComplete(session) {
    const bookingId = session.metadata.booking_id;
    const servicesTotal = parseFloat(session.metadata.services_total || 0);
    if (!bookingId) return;
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId));
        if (!booking) return;
        
        const totalPaid = parseFloat(booking.deposit_paid || 0) + servicesTotal;
        if (totalPaid >= booking.total_amount) {
            booking.payment_status = PAYMENT_STATUS.PAID;
            booking.remaining_balance = 0;
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
            message: '$' + servicesTotal + ' services for Booking ' + booking.booking_reference,
            data: { payment: { amount: servicesTotal }, booking: { id: booking.id, booking_reference: booking.booking_reference } },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Deposit payment
async function handleDepositPaymentComplete(session) {
    const bookingId = session.metadata.booking_id;
    if (!bookingId) return;
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId));
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
        
        notifyAdmins('payment_received', {
            type: 'payment',
            title: 'Deposit Paid 📝',
            message: '$' + (session.amount_total / 100).toFixed(2) + ' for Booking ' + booking.booking_reference,
            data: { payment: { amount: session.amount_total / 100 }, booking: { id: booking.id, booking_reference: booking.booking_reference } },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function handlePaymentSuccess(paymentIntent) {
    const metadata = paymentIntent.metadata;
    if (metadata && metadata.booking_id) {
        try {
            const booking = await Booking.findByPk(parseInt(metadata.booking_id));
            if (booking && booking.payment_status !== PAYMENT_STATUS.PAID) {
                booking.payment_status = PAYMENT_STATUS.PAID;
                booking.remaining_balance = 0;
                await booking.save();
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

module.exports = { handleWebhook };