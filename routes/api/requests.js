const express = require('express');
const router = express.Router();
const { RequestSubmission, Amenity } = require('../../models');
const EmailService = require('../../services/emailService');

// Submit a request
router.post('/', async (req, res) => {
    try {
        const requestData = req.body;

        // FIRST: Save the request to database (always succeeds)
        const request = await RequestSubmission.create(requestData);
        
        // SECOND: Try to send email notification (don't block if fails)
        try {
            const amenity = await Amenity.findByPk(requestData.amenity_id);
            await EmailService.sendRequestNotification(request, amenity);
            console.log(`📧 Email notification sent for request #${request.id}`);
        } catch (emailError) {
            // Email failed, but request is already saved - just log the error
            console.log(`⚠️ Email notification failed for request #${request.id}:`, emailError.message);
        }
        
        console.log(`✅ New request #${request.id} saved from ${requestData.guest_name}`);
        
        res.json({ 
            success: true, 
            message: 'Request submitted successfully! We will contact you soon.',
            request 
        });
    } catch (error) {
        console.error('Error submitting request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get requests (for admin)
router.get('/', async (req, res) => {
    try {
        const requests = await RequestSubmission.findAll({
            include: [{
                model: Amenity,
                as: 'amenity'
            }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single request
router.get('/:id', async (req, res) => {
    try {
        const request = await RequestSubmission.findByPk(req.params.id, {
            include: [{ model: Amenity, as: 'amenity' }]
        });
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        res.json({ success: true, request });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get requests by email (for users to check their status)
router.get('/user/:email', async (req, res) => {
    try {
        const requests = await RequestSubmission.findAll({
            where: { guest_email: req.params.email },
            include: [{ model: Amenity, as: 'amenity' }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/// Update request status (for admin) - add email notification
router.put('/:id', async (req, res) => {
    try {
        const { status, admin_notes } = req.body;
        const request = await RequestSubmission.findByPk(req.params.id, {
            include: [{ model: Amenity, as: 'amenity' }]
        });

        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }

        const oldStatus = request.status;
        await request.update({ status, admin_notes });

        // Send email notification when status changes to completed or contacted
        if ((status === 'completed' || status === 'contacted') && oldStatus !== status) {
            try {
                await EmailService.sendRequestStatusUpdate(request, status);
                console.log(`📧 Status update email sent for request #${request.id}`);
            } catch (emailError) {
                console.log(`⚠️ Could not send email: ${emailError.message}`);
            }
        }

        res.json({ success: true, request });
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;