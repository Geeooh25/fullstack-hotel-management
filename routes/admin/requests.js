const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/auth');
const db = require('../../models');
const { Op } = require('sequelize');

// List all requests
router.get('/', isAdminAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    const type = req.query.type || 'all';
    const status = req.query.status || 'all';

    try {
        const where = {};
        if (type !== 'all') where.request_type = type;
        if (status !== 'all') where.status = status;

        const { count, rows: requests } = await db.RequestSubmission.findAndCountAll({
            where,
            include: [
                { model: db.Amenity, as: 'amenity' },
                { model: db.User, as: 'user' }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const requestTypes = await db.RequestSubmission.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('request_type')), 'request_type']],
            raw: true
        });

        res.render('admin/requests', {
            requests,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            currentType: type,
            currentStatus: status,
            requestTypes: requestTypes.map(r => r.request_type),
            totalCount: count,
            session: req.session
        });
    } catch (error) {
        console.error(error);
        res.render('admin/requests', { 
            requests: [], 
            error: 'Failed to load requests',
            session: req.session
        });
    }
});

// Get request details
router.get('/:id', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const request = await db.RequestSubmission.findByPk(id, {
            include: [
                { model: db.Amenity, as: 'amenity' },
                { model: db.User, as: 'user' }
            ]
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load request details' });
    }
});

// Update request status
router.put('/:id/status', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        await db.RequestSubmission.update({
            status,
            admin_notes: admin_notes || null,
            updated_at: new Date()
        }, { where: { id } });

        res.json({ success: true, message: 'Request status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update request status' });
    }
});

module.exports = router;