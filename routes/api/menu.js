const express = require('express');
const router = express.Router();
const { MenuItem, MenuCategory } = require('../../models');
const TimeSlot = require('../../models/timeSlot');
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
// GET /api/menu/time-slots/:menuItemId?date=2026-05-25
router.get('/time-slots/:menuItemId', async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const { date } = req.query;
        
        const menuItem = await MenuItem.findByPk(menuItemId);
        if (!menuItem) return res.status(404).json({ error: 'Service not found' });
        
        // Default time slots based on duration
        const duration = menuItem.duration_minutes || 60;
        const slots = [];
        const startHour = 9; // 9 AM
        const endHour = 17; // 5 PM
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let min = 0; min < 60; min += duration) {
                const time = String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0');
                
                // Check if slot is booked
                const existing = await TimeSlot.findOne({
                    where: { menu_item_id: menuItemId, date, time, is_booked: true }
                });
                
                slots.push({
                    time,
                    available: !existing,
                    booked: !!existing
                });
            }
        }
        
        res.json({ success: true, slots, duration });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;