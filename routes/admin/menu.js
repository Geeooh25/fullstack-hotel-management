const express = require('express');
const router = express.Router();
const { MenuCategory, MenuItem, Amenity } = require('../../models');
const { isAuthenticated } = require('../../middleware/auth');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const amenities = await Amenity.findAll({
            where: { category: 'paid', is_active: true }
        });
        const categories = await MenuCategory.findAll({
            include: [{ model: Amenity, as: 'amenity' }]
        });
        const items = await MenuItem.findAll({
            include: [{ model: MenuCategory, as: 'category' }]
        });
        res.render('admin/menu', { amenities, categories, items, layout: 'admin' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Category routes
router.post('/categories', async (req, res) => {
    try {
        const category = await MenuCategory.create(req.body);
        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/categories/:id', async (req, res) => {
    try {
        const category = await MenuCategory.findByPk(req.params.id);
        await category.update(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/categories/:id', async (req, res) => {
    try {
        await MenuCategory.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Item routes
router.post('/items', async (req, res) => {
    try {
        const item = await MenuItem.create(req.body);
        res.json({ success: true, item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/items/:id', async (req, res) => {
    try {
        const item = await MenuItem.findByPk(req.params.id);
        await item.update(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/items/:id', async (req, res) => {
    try {
        await MenuItem.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;