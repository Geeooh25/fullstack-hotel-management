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
 * Handle deposit payment (room booking deposit only)
 */
async function handleDepositPaymentComplete(session) {
    console.log('🎉 Deposit payment completed! Session ID:', session.id);
    console.log('Metadata:', session.metadata);
    
    const bookingId = session.metadata.booking_id;
    
    if (!bookingId) {
        console.log('❌ No booking_id in metadata');
        return;
    }
    
    console.log('Looking for booking ID:', bookingId);
    
    try {
        const booking = await Booking.findByPk(parseInt(bookingId));
        
        if (!booking) {
            console.log('❌ Booking not found for ID:', bookingId);
            return;
        }
        
        console.log('✅ Found booking:', booking.booking_reference);
        console.log('Current status:', booking.status);
        console.log('Current deposit_paid:', booking.deposit_paid);
        
        const depositAmount = booking.total_amount * 0.2;
        
        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.payment_status = PAYMENT_STATUS.DEPOSIT;
        booking.deposit_paid = depositAmount;
        booking.remaining_balance = booking.total_amount - depositAmount;
        booking.confirmed_at = new Date();
        await booking.save();
        
        console.log('✅ Booking updated!');
        console.log('   New status:', booking.status);
        console.log('   Deposit paid:', booking.deposit_paid);
        console.log('   Remaining balance:', booking.remaining_balance);
        
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: depositAmount,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Deposit payment'
        });
        
        console.log('✅ Payment record created');
        
        try {
            const guest = await Guest.findByPk(booking.guest_id);
            const room = await Room.findByPk(booking.room_id, {
                include: [{ model: RoomType }]
            });
            
            const priceDetails = {
                total: booking.total_amount,
                deposit_required: booking.deposit_paid,
                remaining_balance: booking.remaining_balance,
                subtotal: booking.subtotal,
                tax: booking.tax,
                nights: booking.total_nights
            };
            
            if (guest && room && EmailService) {
                await EmailService.sendBookingConfirmation(booking, guest, room, priceDetails);
                console.log('✅ Confirmation email sent');
            }
        } catch (emailError) {
            console.error('❌ Email error:', emailError.message);
        }
        
    } catch (error) {
        console.error('❌ Error in handleDepositPaymentComplete:', error.message);
        console.error('Stack:', error.stack);
    }
}

/**
 * Handle FULL payment (room + services combined)
 */
async function handleFullPaymentComplete(session) {
    console.log('🎉 FULL payment completed! Session ID:', session.id);
    console.log('Metadata:', session.metadata);
    
    const bookingId = session.metadata.booking_id;
    
    if (!bookingId) {
        console.log('❌ No booking_id in metadata');
        return;
    }
    
    console.log('Looking for booking ID:', bookingId);
    
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
        
        console.log('✅ Found booking:', booking.booking_reference);
        console.log('Pending services:', booking.services ? booking.services.length : 0);
        
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
        booking.deposit_paid = booking.total_amount; // Full amount paid
        booking.remaining_balance = 0;
        booking.confirmed_at = new Date();
        await booking.save();
        
        console.log('✅ Booking updated to fully paid!');
        
        // Create payment record for full amount
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
        
        // Send combined receipt email
        try {
            const guest = await Guest.findByPk(booking.guest_id);
            const room = await Room.findByPk(booking.room_id, {
                include: [{ model: RoomType }]
            });
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
        console.error('Stack:', error.stack);
    }
}

/**
 * Handle service payment (existing booking + services)
 */
async function handleServicePaymentComplete(session) {
    console.log('🎉 Service payment completed! Session ID:', session.id);
    console.log('Metadata:', session.metadata);
    
    const bookingId = session.metadata.booking_id;
    const servicesTotal = parseFloat(session.metadata.services_total);
    
    if (!bookingId) {
        console.log('❌ No booking_id in metadata');
        return;
    }
    
    console.log('Looking for booking ID:', bookingId);
    console.log('Services total paid:', servicesTotal);
    
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
        
        console.log('✅ Found booking:', booking.booking_reference);
        console.log('Pending services:', booking.services ? booking.services.length : 0);
        
        // Update all pending services to 'confirmed'
        if (booking.services && booking.services.length > 0) {
            for (const service of booking.services) {
                service.status = 'confirmed';
                await service.save();
            }
            console.log(`✅ Updated ${booking.services.length} services to confirmed`);
        }
        
        // Update booking payment status if fully paid
        // Check if deposit + services = total
        const totalPaid = parseFloat(booking.deposit_paid) + servicesTotal;
        if (totalPaid >= booking.total_amount) {
            booking.payment_status = PAYMENT_STATUS.PAID;
            booking.remaining_balance = 0;
            await booking.save();
            console.log('✅ Booking marked as fully paid');
        } else {
            booking.remaining_balance = booking.total_amount - totalPaid;
            await booking.save();
            console.log('✅ Booking remaining balance updated:', booking.remaining_balance);
        }
        
        // Create payment record for services
        await Payment.create({
            booking_id: booking.id,
            stripe_payment_intent_id: session.payment_intent,
            amount: servicesTotal,
            payment_method: 'card',
            status: 'succeeded',
            transaction_id: session.id,
            notes: 'Services payment (full amount)'
        });
        
        console.log('✅ Service payment record created');
        
        // Send service payment receipt email
        try {
            const guest = await Guest.findByPk(booking.guest_id);
            const services = await BookingService.findAll({
                where: { booking_id: booking.id, status: 'confirmed' },
                include: [{ model: MenuItem, as: 'menu_item' }]
            });
            
            if (guest && EmailService) {
                await EmailService.sendServicePaymentReceipt(booking, guest, services, servicesTotal);
                console.log('✅ Service payment receipt email sent');
            }
        } catch (emailError) {
            console.error('❌ Email error:', emailError.message);
        }
        
    } catch (error) {
        console.error('❌ Error in handleServicePaymentComplete:', error.message);
        console.error('Stack:', error.stack);
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