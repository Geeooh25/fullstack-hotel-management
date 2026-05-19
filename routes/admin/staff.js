const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/auth');
const db = require('../../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

// Get all staff members
router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        const staff = await db.User.findAll({
            where: { role: { [Op.ne]: 'guest' } },
            order: [['created_at', 'DESC']]
        });
        res.render('admin/staff', { 
            title: 'Staff Management', 
            staff: staff || [], 
            session: req.session 
        });
    } catch (error) {
        console.error('Staff error:', error);
        res.render('admin/staff', { 
            title: 'Staff Management', 
            staff: [], 
            error: error.message,
            session: req.session 
        });
    }
});

// Create new staff member
router.post('/', isAdminAuthenticated, async (req, res) => {
    try {
        const { first_name, last_name, email, role, password } = req.body;
        
        // Check if email exists
        const existing = await db.User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const staff = await db.User.create({
            first_name,
            last_name,
            email,
            password: hashedPassword,
            role: role,
            is_active: true,
            status: 'active'
        });
        
        res.json({ success: true, staff });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update staff member
router.put('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_active } = req.body;
        await db.User.update({ role, is_active }, { where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete staff member
router.delete('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        await db.User.destroy({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;