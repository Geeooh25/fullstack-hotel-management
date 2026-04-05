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
        
        // Here you would typically send an email
        // For now, just log and return success
        console.log('Contact form submission:', {
            name,
            email,
            phone,
            subject,
            message,
            timestamp: new Date().toISOString()
        });
        
        // TODO: Add email sending via SendGrid
        // await EmailService.sendContactEmail({ name, email, phone, subject, message });
        
        res.json({
            success: true,
            message: 'Message received. We will contact you soon.'
        });
        
    } catch (error) {
        next(error);
    }
});

module.exports = router;