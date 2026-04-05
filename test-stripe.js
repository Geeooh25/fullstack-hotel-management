require('dotenv').config();
console.log('STRIPE_SECRET_KEY exists?', !!process.env.STRIPE_SECRET_KEY);
console.log('STRIPE_SECRET_KEY starts with sk_test?', process.env.STRIPE_SECRET_KEY?.startsWith('sk_test'));

if (process.env.STRIPE_SECRET_KEY) {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe object created');
} else {
    console.log('❌ No Stripe key found');
}