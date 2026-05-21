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
const EmailService = require('../services/emailService');

// Helper: Notify admins via Socket.io
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
            
            if (paymentType === 'services') {
                await handleServicePaymentComplete(session);
            } else if (paymentType === 'full') {
                await handleFullPaymentComplete(session);
            } else {
                await handleDepositPaymentComplete(session);
            }
            break;
        
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await handlePaymentSuccess(paymentIntent);
            break;
        
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
}

/**
 * Handle FULL payment (room + services combined)
 */
async function handleFullPaymentComplete(session) {
    console.log('🎉 FULL payment completed! Session ID:', session.id);
    
    const bookingId = session.metadata.booking_id;
    
    if (!bookingId) {
        console.log('❌ No booking_id in metadata');
        return;
    }
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [
                { model: Guest },
                { model: Room, include: [{ model: RoomType }] },
                { model: BookingService, as: 'services', where: { status: 'pending' }, required: false }
            ]
        });
        
        if (!booking) {
            console.log('❌ Booking not found for ID:', bookingId);
            return;
        }
        
        console.log('✅ Found booking:', booking.booking_reference);
        
        // Update all pending services to 'confirmed'
        if (booking.services && booking.services.length > 0) {
            for (const service of booking.services) {
                service.status = 'confirmed';
                await service.save();
            }
            console.log(`✅ Updated ${booking.services.length} services to confirmed`);
        }
        
        // Mark booking as fully paid
        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.payment_status = PAYMENT_STATUS.PAID;
        booking.deposit_paid = booking.total_amount;
        booking.remaining_balance = 0;
        booking.confirmed_at = new Date();
        await booking.save();
        
        console.log('✅ Booking updated to fully paid!');
        
        // Create payment record
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: booking.total_amount,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Full payment (room + services)'
        });
        
        console.log('✅ Payment record created');
        
        // 🔔 NOTIFY ADMINS VIA SOCKET.IO
        notifyAdmins('payment_received', {
            type: 'payment',
            title: 'Payment Confirmed! 💰',
            message: `${booking.Guest?.first_name || 'Guest'} paid $${booking.total_amount} for Room ${booking.Room?.room_number || 'N/A'}`,
            data: {
                payment: { amount: booking.total_amount, payment_method: 'card', status: 'succeeded' },
                booking: { id: booking.id, booking_reference: booking.booking_reference }
            },
            timestamp: new Date()
        });
        
        // Also send booking notification for admin refresh
        notifyAdmins('new_booking', {
            type: 'booking',
            title: 'Booking Confirmed ✅',
            message: `${booking.Guest?.first_name || 'Guest'} - Room ${booking.Room?.room_number || 'N/A'} - $${booking.total_amount}`,
            data: {
                id: booking.id,
                booking_reference: booking.booking_reference,
                guest_name: booking.Guest ? `${booking.Guest.first_name} ${booking.Guest.last_name}` : 'Guest',
                room_number: booking.Room?.room_number || 'N/A',
                total_amount: booking.total_amount,
                status: 'confirmed',
                source: booking.source
            },
            timestamp: new Date()
        });
        
        // Send email receipt
        try {
            const guest = booking.Guest;
            const room = booking.Room;
            const services = await BookingService.findAll({
                where: { booking_id: booking.id, status: 'confirmed' },
                include: [{ model: MenuItem, as: 'menu_item' }]
            });
            
            if (guest && EmailService) {
                await EmailService.sendCombinedReceipt(booking, guest, room, services);
                console.log('✅ Combined receipt email sent');
            }
        } catch (emailError) {
            console.error('❌ Email error:', emailError.message);
        }
        
    } catch (error) {
        console.error('❌ Error in handleFullPaymentComplete:', error.message);
    }
}

/**
 * Handle service payment
 */
async function handleServicePaymentComplete(session) {
    console.log('🎉 Service payment completed! Session ID:', session.id);
    
    const bookingId = session.metadata.booking_id;
    const servicesTotal = parseFloat(session.metadata.services_total || 0);
    
    if (!bookingId) {
        console.log('❌ No booking_id in metadata');
        return;
    }
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId), {
            include: [
                { model: Guest },
                { model: BookingService, as: 'services', where: { status: 'pending' }, required: false }
            ]
        });
        
        if (!booking) {
            console.log('❌ Booking not found for ID:', bookingId);
            return;
        }
        
        // Update pending services
        if (booking.services && booking.services.length > 0) {
            for (const service of booking.services) {
                service.status = 'confirmed';
                await service.save();
            }
        }
        
        // Update payment status
        const totalPaid = parseFloat(booking.deposit_paid || 0) + servicesTotal;
        if (totalPaid >= booking.total_amount) {
            booking.payment_status = PAYMENT_STATUS.PAID;
            booking.remaining_balance = 0;
            booking.deposit_paid = booking.total_amount;
        } else {
            booking.remaining_balance = booking.total_amount - totalPaid;
        }
        await booking.save();
        
        // Create payment record
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: servicesTotal,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Services payment'
        });
        
        // 🔔 NOTIFY ADMINS
        notifyAdmins('payment_received', {
            type: 'payment',
            title: 'Service Payment Received 💰',
            message: `$${servicesTotal} service payment for Booking #${booking.id}`,
            data: {
                payment: { amount: servicesTotal, payment_method: 'card' },
                booking: { id: booking.id, booking_reference: booking.booking_reference }
            },
            timestamp: new Date()
        });
        
        // Send email
        try {
            const guest = booking.Guest;
            const services = await BookingService.findAll({
                where: { booking_id: booking.id, status: 'confirmed' },
                include: [{ model: MenuItem, as: 'menu_item' }]
            });
            if (guest && EmailService) {
                await EmailService.sendServicePaymentReceipt(booking, guest, services, servicesTotal);
            }
        } catch (emailError) {
            console.error('❌ Email error:', emailError.message);
        }
        
    } catch (error) {
        console.error('❌ Error in handleServicePaymentComplete:', error.message);
    }
}

/**
 * Handle deposit payment
 */
async function handleDepositPaymentComplete(session) {
    console.log('🎉 Deposit payment completed! Session ID:', session.id);
    
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
        
        // 🔔 NOTIFY ADMINS
        notifyAdmins('new_booking', {
            type: 'booking',
            title: 'New Booking (Deposit Paid) 📝',
            message: `${booking.Guest?.first_name || 'Guest'} - Room ${booking.Room?.room_number || 'N/A'} - Deposit: $${(session.amount_total / 100).toFixed(2)}`,
            data: {
                id: booking.id,
                booking_reference: booking.booking_reference,
                guest_name: booking.Guest ? `${booking.Guest.first_name} ${booking.Guest.last_name}` : 'Guest',
                room_number: booking.Room?.room_number || 'N/A',
                total_amount: booking.total_amount,
                status: 'confirmed',
                source: booking.source
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('❌ Error in handleDepositPaymentComplete:', error.message);
    }
}

async function handlePaymentSuccess(paymentIntent) {
    console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
    
    const metadata = paymentIntent.metadata;
    if (metadata && metadata.booking_id) {
        try {
            const booking = await Booking.findByPk(parseInt(metadata.booking_id));
            if (booking && booking.payment_status !== PAYMENT_STATUS.PAID) {
                booking.payment_status = PAYMENT_STATUS.PAID;
                booking.remaining_balance = 0;
                await booking.save();
                console.log(`✅ Booking ${booking.booking_reference} fully paid`);
            }
        } catch (error) {
            console.error('❌ Error in handlePaymentSuccess:', error.message);
        }
    }
}

module.exports = { handleWebhook };