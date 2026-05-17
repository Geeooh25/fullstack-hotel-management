const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/auth');
const db = require('../../models');
const { Op } = require('sequelize');

// List all users
router.get('/', isAdminAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    try {
        const where = {};
        if (search) {
            where[Op.or] = [
                { email: { [Op.like]: `%${search}%` } },
                { first_name: { [Op.like]: `%${search}%` } },
                { last_name: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows: users } = await db.User.findAndCountAll({
            where,
            attributes: { include: [[db.sequelize.literal(`(
                SELECT COUNT(*) FROM bookings WHERE bookings.user_id = "User".id
            )`), 'total_bookings']] },
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        res.render('admin/users', {
            users,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search,
            totalCount: count,
            session: req.session
        });
    } catch (error) {
        console.error(error);
        res.render('admin/users', { 
            users: [], 
            error: 'Failed to load users',
            session: req.session
        });
    }
});

// Get user details with bookings
router.get('/:id', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const user = await db.User.findByPk(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const bookings = await db.Booking.findAll({
            where: { user_id: id },
            include: [
                { model: db.Room, include: [{ model: db.RoomType }] },
                { model: db.Payment }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ user, bookings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load user details' });
    }
});

// Update user status
router.put('/:id/status', isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'banned'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        await db.User.update({ status }, { where: { id } });
        res.json({ success: true, message: 'User status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

module.exports = router;