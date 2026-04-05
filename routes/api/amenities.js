const express = require('express');
const router = express.Router();
const { Amenity, MenuCategory, MenuItem } = require('../../models');

// Get all amenities
router.get('/', async (req, res) => {
    try {
        const amenities = await Amenity.findAll({
            where: { is_active: true },
            order: [['display_order', 'ASC']]
        });
        
        res.json({ success: true, amenities });
    } catch (error) {
        console.error('Error fetching amenities:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single amenity with menu (for paid services)
router.get('/:id', async (req, res) => {
    try {
        const amenity = await Amenity.findByPk(req.params.id, {
            include: [{
                model: MenuCategory,
                as: 'menu_categories',
                where: { is_active: true },
                required: false,
                include: [{
                    model: MenuItem,
                    as: 'items',
                    where: { is_available: true },
                    required: false,
                    order: [['display_order', 'ASC']]
                }],
                order: [['display_order', 'ASC']]
            }]
        });
        
        if (!amenity) {
            return res.status(404).json({ success: false, error: 'Amenity not found' });
        }
        
        res.json({ success: true, amenity });
    } catch (error) {
        console.error('Error fetching amenity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get menu items for restaurant/spa
router.get('/:id/menu', async (req, res) => {
    try {
        const categories = await MenuCategory.findAll({
            where: { amenity_id: req.params.id, is_active: true },
            include: [{
                model: MenuItem,
                as: 'items',
                where: { is_available: true },
                required: false,
                order: [['display_order', 'ASC']]
            }],
            order: [['display_order', 'ASC']]
        });
        
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;