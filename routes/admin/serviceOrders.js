const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/auth');

router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        const ServiceOrder = require('../../models/serviceOrder');
        const orders = await ServiceOrder.findAll({
            order: [['created_at', 'DESC']]
        });
        
        res.render('admin/serviceOrders', {
            title: 'Service Orders',
            orders: orders.map(o => o.toJSON()),
            session: req.session
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('admin/serviceOrders', {
            title: 'Service Orders',
            orders: [],
            error: error.message,
            session: req.session
        });
    }
});

router.post('/:id/status', isAdminAuthenticated, async (req, res) => {
    try {
        const ServiceOrder = require('../../models/serviceOrder');
        await ServiceOrder.update(
            { status: req.body.status },
            { where: { id: req.params.id } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;