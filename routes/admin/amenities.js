const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/auth');
const db = require('../../models');

// List all amenities
router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        const amenities = await db.Amenity.findAll({
            order: [['category', 'ASC'], ['display_order', 'ASC']]
        });
        
        const categories = [...new Set(amenities.map(a => a.category))];
        
        res.render('admin/amenities', { amenities, categories, error: null, session: req.session });
    } catch (error) {
        console.error(error);
        res.render('admin/amenities', { amenities: [], categories: [], error: 'Failed to load amenities', session: req.session });
    }
});

// Create new amenity
router.post('/', isAdminAuthenticated, async (req, res) => {
    const { name, description, category, price, is_available } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: 'Name and category are required' });
    }

    try {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const amenity = await db.Amenity.create({
            name,
            slug,
            description: description || '',
            short_description: description?.substring(0, 255) || '',
            category,
            price: price || 0,
            is_active: is_available === 'true' ? 1 : 0,
            display_order: 0
        });

        res.json({ success: true, message: 'Amenity created successfully', id: amenity.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create amenity' });
    }
});

// Update amenity
router.put('/:id', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { name, description, category, price, is_available } = req.body;

    try {
        await db.Amenity.update({
            name,
            description,
            category,
            price: price || 0,
            is_active: is_available === 'true' ? 1 : 0
        }, { where: { id } });

        res.json({ success: true, message: 'Amenity updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update amenity' });
    }
});

// Delete amenity
router.delete('/:id', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        await db.Amenity.destroy({ where: { id } });
        res.json({ success: true, message: 'Amenity deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete amenity' });
    }
});

module.exports = router;