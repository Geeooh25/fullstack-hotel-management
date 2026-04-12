const express = require('express');
const router = express.Router();
const { contactLimiter } = require('../../middleware/rateLimiter');

// POST /api/contact - Send contact message
router.post('/', contactLimiter, async (req, res, next) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and message are required'
            });
        }

        console.log('📧 Contact form submission:', {
            name,
            email,
            phone,
            subject,
            message,
            timestamp: new Date().toISOString()
        });

        // TODO: Add email sending via Resend/SendGrid
        // For now, just log and return success
        // To enable email, uncomment the lines below after setting up email service
        /*
        const EmailService = require('../../services/emailService');
        await EmailService.sendContactEmail({ name, email, phone, subject, message });
        */

        res.json({
            success: true,
            message: 'Message received. We will contact you soon.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        next(error);
    }
});

// POST /api/contact/newsletter - Subscribe to newsletter
router.post('/newsletter', contactLimiter, async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please enter a valid email address'
            });
        }

        console.log('📧 Newsletter subscription:', {
            email,
            timestamp: new Date().toISOString()
        });

        // Here you would save to database or send to email service
        // For now, just log and return success

        res.json({
            success: true,
            message: 'Successfully subscribed to newsletter!'
        });

    } catch (error) {
        console.error('Newsletter error:', error);
        next(error);
    }
});

module.exports = router;