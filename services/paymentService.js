require('dotenv').config();

let stripeInstance = null;

try {
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') {
        const Stripe = require('stripe');
        stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);
        console.log('✅ Stripe initialized for payments');
    } else {
        console.warn('⚠️ Stripe not configured. Payments will be simulated.');
    }
} catch (error) {
    console.error('❌ Failed to initialize Stripe:', error.message);
}

class PaymentService {
    
    /**
     * Create checkout session for deposit payment (room booking)
     */
    static async createCheckoutSession(amount, bookingReference, guestEmail, bookingId, successUrl, cancelUrl) {
        console.log('🔑 createCheckoutSession called');
        console.log('🔑 Amount (deposit only):', amount);
        console.log('🔑 Booking Reference:', bookingReference);
        
        if (!stripeInstance) {
            console.log('⚠️ Simulating checkout');
            return {
                success: true,
                url: `${successUrl}&simulated=true`,
                sessionId: `simulated_${Date.now()}`
            };
        }
        
        try {
            const depositAmount = Math.round(amount * 100);
            
            console.log('🔑 Charging deposit amount in cents:', depositAmount);
            
            const session = await stripeInstance.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Geeooh Hotel Booking',
                                description: `Booking Reference: ${bookingReference} - Deposit Only`,
                            },
                            unit_amount: depositAmount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: guestEmail,
                metadata: {
                    booking_id: bookingId.toString(),
                    booking_reference: bookingReference,
                    payment_type: 'deposit'
                },
            });
            
            console.log('✅ Stripe session created for deposit:', depositAmount);
            console.log('✅ Checkout URL:', session.url);
            
            return {
                success: true,
                url: session.url,
                sessionId: session.id,
            };
        } catch (error) {
            console.error('❌ Stripe checkout error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    
    /**
     * Create checkout session for FULL payment (room + services combined)
     */
    static async createFullPaymentSession(amount, bookingReference, guestEmail, bookingId, successUrl, cancelUrl) {
        console.log('🔑 createFullPaymentSession called');
        console.log('🔑 Amount (FULL):', amount);
        console.log('🔑 Booking Reference:', bookingReference);
        
        if (!stripeInstance) {
            console.log('⚠️ Simulating full payment checkout');
            return {
                success: true,
                url: `${successUrl}&simulated=true`,
                sessionId: `simulated_full_${Date.now()}`
            };
        }
        
        try {
            const amountInCents = Math.round(amount * 100);
            
            console.log('🔑 Charging full amount in cents:', amountInCents);
            
            const session = await stripeInstance.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Geeooh Hotel',
                                description: `Booking Reference: ${bookingReference} - Full Payment`,
                            },
                            unit_amount: amountInCents,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: guestEmail,
                metadata: {
                    booking_id: bookingId.toString(),
                    booking_reference: bookingReference,
                    payment_type: 'full'
                },
            });
            
            console.log('✅ Stripe session created for full payment:', amountInCents);
            console.log('✅ Checkout URL:', session.url);
            
            return {
                success: true,
                url: session.url,
                sessionId: session.id,
            };
        } catch (error) {
            console.error('❌ Stripe full payment error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    
    /**
     * Create checkout session for service-only payment (full amount)
     */
    static async createServicePaymentSession(servicesTotal, bookingReference, guestEmail, bookingId, successUrl, cancelUrl) {
        console.log('🔑 createServicePaymentSession called');
        console.log('🔑 Services Total (full amount):', servicesTotal);
        console.log('🔑 Booking Reference:', bookingReference);
        
        if (!stripeInstance) {
            console.log('⚠️ Simulating service payment checkout');
            return {
                success: true,
                url: `${successUrl}&simulated=true`,
                sessionId: `simulated_service_${Date.now()}`
            };
        }
        
        try {
            const totalAmountCents = Math.round(servicesTotal * 100);
            
            console.log('🔑 Charging services amount in cents:', totalAmountCents);
            
            const session = await stripeInstance.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Geeooh Hotel - Additional Services',
                                description: `Booking Reference: ${bookingReference} - Services Payment`,
                            },
                            unit_amount: totalAmountCents,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: guestEmail,
                metadata: {
                    booking_id: bookingId.toString(),
                    booking_reference: bookingReference,
                    payment_type: 'services',
                    services_total: servicesTotal.toString()
                },
            });
            
            console.log('✅ Stripe session created for services:', totalAmountCents);
            console.log('✅ Checkout URL:', session.url);
            
            return {
                success: true,
                url: session.url,
                sessionId: session.id,
            };
        } catch (error) {
            console.error('❌ Stripe service payment error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    
    /**
     * Create payment intent (for future use)
     */
    static async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        console.log('🔑 createPaymentIntent called');
        console.log('🔑 Amount:', amount);
        console.log('🔑 Stripe instance exists?', !!stripeInstance);
        
        if (!stripeInstance) {
            console.log('⚠️ Simulating payment intent (Stripe not configured)');
            return {
                success: true,
                clientSecret: 'simulated_client_secret',
                paymentIntentId: `simulated_${Date.now()}`,
            };
        }
        
        try {
            const paymentIntent = await stripeInstance.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency: currency,
                metadata: metadata,
            });
            
            console.log('✅ Payment intent created:', paymentIntent.id);
            
            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            };
        } catch (error) {
            console.error('❌ Stripe payment intent error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    
    /**
     * Refund payment
     */
    static async refundPayment(paymentIntentId, amount = null) {
        console.log('🔑 refundPayment called');
        console.log('🔑 Payment Intent ID:', paymentIntentId);
        
        if (!stripeInstance) {
            console.log('⚠️ Simulating refund (Stripe not configured)');
            return { success: true, refund: { id: 'simulated_refund' } };
        }
        
        try {
            const refundParams = { payment_intent: paymentIntentId };
            if (amount) {
                refundParams.amount = Math.round(amount * 100);
            }
            const refund = await stripeInstance.refunds.create(refundParams);
            console.log('✅ Refund created:', refund.id);
            return { success: true, refund };
        } catch (error) {
            console.error('❌ Refund failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = PaymentService;