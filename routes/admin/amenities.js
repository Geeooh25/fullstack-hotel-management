const express = require('express');
const router = express.Router();
const { Amenity, MenuCategory, MenuItem } = require('../../models');
const { isAuthenticated } = require('../../middleware/auth');

router.use(isAuthenticated);

// Admin amenities page
router.get('/', async (req, res) => {
    try {
        const amenities = await Amenity.findAll({
            order: [['display_order', 'ASC']]
        });
        res.render('admin/amenities', { amenities, layout: 'admin' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Create amenity
router.post('/', async (req, res) => {
    try {
        const amenity = await Amenity.create(req.body);
        res.json({ success: true, amenity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update amenity
router.put('/:id', async (req, res) => {
    try {
        const amenity = await Amenity.findByPk(req.params.id);
        if (!amenity) {
            return res.status(404).json({ success: false, error: 'Not found' });
        }
        await amenity.update(req.body);
        res.json({ success: true, amenity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete amenity
router.delete('/:id', async (req, res) => {
    try {
        const amenity = await Amenity.findByPk(req.params.id);
        if (!amenity) {
            return res.status(404).json({ success: false, error: 'Not found' });
        }
        await amenity.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;