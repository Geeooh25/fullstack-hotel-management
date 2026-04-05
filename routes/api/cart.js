const express = require('express');
const router = express.Router();
const { MenuItem } = require('../../models');

// Get cart (from localStorage on frontend, this endpoint validates prices)
router.post('/validate', async (req, res) => {
    try {
        const { items } = req.body;
        const validatedItems = [];
        
        for (const item of items) {
            const menuItem = await MenuItem.findByPk(item.menu_item_id);
            if (menuItem && menuItem.is_available) {
                validatedItems.push({
                    ...item,
                    price: menuItem.price,
                    name: menuItem.name
                });
            }
        }
        
        res.json({ success: true, items: validatedItems });
    } catch (error) {
        console.error('Error validating cart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;