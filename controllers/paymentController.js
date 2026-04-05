const { Payment, Booking, Guest, Room } = require('../models');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../utils/constants');
const PaymentService = require('../services/paymentService');
const { Op } = require('sequelize');

class PaymentController {
    
    // Get all payments
    static async getAll(req, res, next) {
        try {
            const { booking_id, status, limit = 50, offset = 0 } = req.query;
            
            let where = {};
            if (booking_id) where.booking_id = booking_id;
            if (status) where.status = status;
            
            const payments = await Payment.findAndCountAll({
                where,
                include: [
                    { 
                        model: Booking,
                        include: [
                            { model: Guest, attributes: ['id', 'first_name', 'last_name', 'email'] },
                            { model: Room, attributes: ['id', 'room_number'] }
                        ]
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
            res.json({
                success: true,
                total: payments.count,
                payments: payments.rows
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get payment by ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            
            const payment = await Payment.findByPk(id, {
                include: [
                    { 
                        model: Booking,
                        include: [
                            { model: Guest },
                            { model: Room }
                        ]
                    }
                ]
            });
            
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }
            
            res.json({
                success: true,
                payment: payment
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Create payment (for cash payments)
    static async create(req, res, next) {
        try {
            const { booking_id, amount, payment_method, notes } = req.body;
            
            const booking = await Booking.findByPk(booking_id);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }
            
            const payment = await Payment.create({
                booking_id,
                amount,
                payment_method,
                status: 'succeeded',
                notes
            });
            
            // Update booking payment status
            const totalPaid = await Payment.sum('amount', {
                where: { booking_id, status: 'succeeded' }
            });
            
            if (totalPaid >= booking.total_amount) {
                booking.payment_status = PAYMENT_STATUS.PAID;
                booking.remaining_balance = 0;
            } else if (totalPaid > 0) {
                booking.payment_status = PAYMENT_STATUS.DEPOSIT;
                booking.remaining_balance = booking.total_amount - totalPaid;
            }
            
            booking.deposit_paid = totalPaid;
            await booking.save();
            
            res.status(201).json({
                success: true,
                payment: payment
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Process Stripe payment
    static async processStripePayment(req, res, next) {
        try {
            const { amount, bookingReference, guestEmail, successUrl, cancelUrl } = req.body;
            
            const result = await PaymentService.createCheckoutSession(
                amount,
                bookingReference,
                guestEmail,
                successUrl,
                cancelUrl
            );
            
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
            
            res.json({
                success: true,
                url: result.url,
                sessionId: result.sessionId
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Refund payment
    static async refund(req, res, next) {
        try {
            const { id } = req.params;
            const { amount, reason } = req.body;
            
            const payment = await Payment.findByPk(id);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }
            
            if (payment.status === 'refunded') {
                return res.status(400).json({
                    success: false,
                    error: 'Payment already refunded'
                });
            }
            
            let refundResult;
            
            if (payment.stripe_payment_intent_id) {
                // Stripe refund
                refundResult = await PaymentService.refundPayment(
                    payment.stripe_payment_intent_id,
                    amount
                );
                
                if (!refundResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: refundResult.error
                    });
                }
            }
            
            payment.status = amount && amount < payment.amount ? 'partially_refunded' : 'refunded';
            await payment.save();
            
            // Update booking payment status
            const booking = await Booking.findByPk(payment.booking_id);
            if (booking) {
                const totalPaid = await Payment.sum('amount', {
                    where: { 
                        booking_id: booking.id, 
                        status: { [Op.in]: ['succeeded', 'pending'] }
                    }
                });
                
                booking.deposit_paid = totalPaid || 0;
                booking.remaining_balance = booking.total_amount - (totalPaid || 0);
                
                if (booking.remaining_balance <= 0) {
                    booking.payment_status = PAYMENT_STATUS.PAID;
                } else if (totalPaid > 0) {
                    booking.payment_status = PAYMENT_STATUS.DEPOSIT;
                } else {
                    booking.payment_status = PAYMENT_STATUS.UNPAID;
                }
                
                await booking.save();
            }
            
            res.json({
                success: true,
                payment: payment,
                refund: refundResult?.refund
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get payment statistics
    static async getStats(req, res, next) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            
            // Today's payments
            const todayPayments = await Payment.sum('amount', {
                where: {
                    status: 'succeeded',
                    created_at: { [Op.gte]: today }
                }
            });
            
            const todayCount = await Payment.count({
                where: {
                    status: 'succeeded',
                    created_at: { [Op.gte]: today }
                }
            });
            
            // This month's payments
            const monthlyPayments = await Payment.sum('amount', {
                where: {
                    status: 'succeeded',
                    created_at: { [Op.gte]: firstDayOfMonth }
                }
            });
            
            const monthlyCount = await Payment.count({
                where: {
                    status: 'succeeded',
                    created_at: { [Op.gte]: firstDayOfMonth }
                }
            });
            
            // This year's payments
            const yearlyPayments = await Payment.sum('amount', {
                where: {
                    status: 'succeeded',
                    created_at: { [Op.gte]: firstDayOfYear }
                }
            });
            
            // Payment method breakdown
            const cardPayments = await Payment.sum('amount', {
                where: { payment_method: 'card', status: 'succeeded' }
            });
            
            const cashPayments = await Payment.sum('amount', {
                where: { payment_method: 'cash', status: 'succeeded' }
            });
            
            const bankPayments = await Payment.sum('amount', {
                where: { payment_method: 'bank_transfer', status: 'succeeded' }
            });
            
            // Failed payments
            const failedPayments = await Payment.count({
                where: { status: 'failed' }
            });
            
            res.json({
                success: true,
                stats: {
                    today: {
                        amount: todayPayments || 0,
                        count: todayCount
                    },
                    monthly: {
                        amount: monthlyPayments || 0,
                        count: monthlyCount
                    },
                    yearly: {
                        amount: yearlyPayments || 0
                    },
                    methodBreakdown: {
                        card: cardPayments || 0,
                        cash: cashPayments || 0,
                        bank_transfer: bankPayments || 0
                    },
                    failedPayments
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = PaymentController;