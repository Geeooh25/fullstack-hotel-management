const express = require('express');
const router = express.Router();
const { MenuItem, MenuCategory } = require('../../models');

// Get all menu items (for admin)
router.get('/items', async (req, res) => {
    try {
        const items = await MenuItem.findAll({
            include: [{
                model: MenuCategory,
                as: 'category'
            }],
            order: [['display_order', 'ASC']]
        });
        
        res.json({ success: true, items });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single menu item
router.get('/items/:id', async (req, res) => {
    try {
        const item = await MenuItem.findByPk(req.params.id, {
            include: [{
                model: MenuCategory,
                as: 'category'
            }]
        });
        
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        
        res.json({ success: true, item });
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;