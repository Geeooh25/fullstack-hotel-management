const express = require('express');
const router = express.Router();
const { RequestSubmission, Amenity } = require('../../models');
const { isAuthenticated } = require('../../middleware/auth');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const requests = await RequestSubmission.findAll({
            include: [{ model: Amenity, as: 'amenity' }],
            order: [['created_at', 'DESC']]
        });
        res.render('admin/requests', { requests, layout: 'admin' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.put('/:id', async (req, res) => {
    try {
        const request = await RequestSubmission.findByPk(req.params.id);
        await request.update(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;