const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/auth');
const db = require('../../models');

// List all menu items with categories
router.get('/', isAdminAuthenticated, async (req, res) => {
    const category = req.query.category || 'all';

    try {
        const where = {};
        if (category !== 'all') {
            where['$category.name$'] = category;
        }

        const menuItems = await db.MenuItem.findAll({
            include: [{ model: db.MenuCategory, as: 'category' }],
            where,
            order: [[{ model: db.MenuCategory, as: 'category' }, 'display_order', 'ASC'], ['display_order', 'ASC']]
        });

        const categories = await db.MenuCategory.findAll({
            order: [['display_order', 'ASC']]
        });

        res.render('admin/menu', { 
            menuItems, 
            categories, 
            currentCategory: category,
            session: req.session
        });
    } catch (error) {
        console.error(error);
        res.render('admin/menu', { 
            menuItems: [], 
            categories: [], 
            error: 'Failed to load menu items',
            session: req.session
        });
    }
});

// Create menu item
router.post('/', isAdminAuthenticated, async (req, res) => {
    const { category_id, name, description, price, is_available, is_featured, display_order } = req.body;

    if (!category_id || !name || !price) {
        return res.status(400).json({ error: 'Category, name, and price are required' });
    }

    try {
        const menuItem = await db.MenuItem.create({
            category_id,
            name,
            description,
            price,
            is_available: is_available === 'true' ? 1 : 0,
            is_featured: is_featured === 'true' ? 1 : 0,
            display_order: display_order || 0
        });

        res.json({ success: true, message: 'Menu item created successfully', id: menuItem.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create menu item' });
    }
});

// Update menu item
router.put('/:id', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, is_available, is_featured, display_order } = req.body;

    try {
        await db.MenuItem.update({
            category_id,
            name,
            description,
            price,
            is_available: is_available === 'true' ? 1 : 0,
            is_featured: is_featured === 'true' ? 1 : 0,
            display_order: display_order || 0
        }, { where: { id } });

        res.json({ success: true, message: 'Menu item updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// Delete menu item
router.delete('/:id', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        await db.MenuItem.destroy({ where: { id } });
        res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

// Toggle availability
router.patch('/:id/toggle', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const menuItem = await db.MenuItem.findByPk(id);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        
        await menuItem.update({ is_available: !menuItem.is_available });
        res.json({ success: true, message: 'Menu item availability toggled' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to toggle availability' });
    }
});

module.exports = router;