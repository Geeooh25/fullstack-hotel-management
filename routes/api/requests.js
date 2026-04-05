const express = require('express');
const router = express.Router();
const { RequestSubmission, Amenity } = require('../../models');
const EmailService = require('../../services/emailService');

// Submit a request
router.post('/', async (req, res) => {
    try {
        const requestData = req.body;
        
        const request = await RequestSubmission.create(requestData);
        
        // Send email notification to hotel staff
        const amenity = await Amenity.findByPk(requestData.amenity_id);
        
        await EmailService.sendRequestNotification(request, amenity);
        
        res.json({ success: true, request });
    } catch (error) {
        console.error('Error submitting request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get requests (for admin)
router.get('/admin', async (req, res) => {
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

// Update request status (for admin)
router.put('/:id', async (req, res) => {
    try {
        const { status, admin_notes } = req.body;
        const request = await RequestSubmission.findByPk(req.params.id);
        
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        await request.update({ status, admin_notes });
        
        res.json({ success: true, request });
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;