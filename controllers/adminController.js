const db = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

const adminController = {
    // Login page
    getLogin: (req, res) => {
        res.render('admin/login', { title: 'Login', error: null });
    },

    // Process login
    postLogin: async (req, res) => {
        const { email, password } = req.body;
        
        try {
            const user = await db.User.findOne({ 
                where: { 
                    email: email,
                    role: 'admin'
                }
            });
            
            if (!user) {
                return res.render('admin/login', { title: 'Login', error: 'Invalid email or password' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (isValidPassword) {
                req.session.admin = {
                    id: user.id,
                    email: user.email,
                    name: `${user.first_name} ${user.last_name}`,
                    role: user.role
                };
                res.redirect('/admin/dashboard');
            } else {
                res.render('admin/login', { title: 'Login', error: 'Invalid email or password' });
            }
        } catch (error) {
            console.error('Login error:', error);
            res.render('admin/login', { title: 'Login', error: 'Login failed. Please try again.' });
        }
    },

    // Logout
    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) console.error(err);
            res.redirect('/admin/login');
        });
    },

    // Dashboard with stats
    getDashboard: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        
        try {
            const totalBookings = await db.Booking.count() || 0;
            const totalRevenue = await db.Payment.sum('amount', { where: { status: 'completed' } }) || 0;
            const totalRooms = await db.Room.count() || 1;
            
            const occupiedRooms = await db.Booking.count({ 
                where: { 
                    status: ['confirmed', 'checked_in']
                }
            }) || 0;
            
            const occupancy = Math.round((occupiedRooms / totalRooms) * 100);
            
            const recentBookings = await db.Booking.findAll({
                include: [
                    { model: db.Guest, as: 'guest' },
                    { model: db.Room }
                ],
                order: [['created_at', 'DESC']],
                limit: 5
            });
            
            res.render('admin/dashboard', {
                title: 'Dashboard',
                name: req.session.admin.name,
                stats: { totalBookings, totalRevenue, occupancy },
                recentBookings: recentBookings || [],
                session: req.session
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.render('admin/dashboard', { 
                title: 'Dashboard',
                name: req.session.admin.name, 
                stats: { totalBookings: 0, totalRevenue: 0, occupancy: 0 }, 
                recentBookings: [],
                session: req.session
            });
        }
    },

    // Booking management
    getBookings: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const status = req.query.status || 'all';
        
        try {
            const where = {};
            if (status !== 'all') where.status = status;
            
            const { count, rows: bookings } = await db.Booking.findAndCountAll({
                where,
                include: [
                    { model: db.Guest, as: 'guest' },
                    { model: db.Room, include: [{ model: db.RoomType }] },
                    { model: db.User, as: 'user' }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });
            
            res.render('admin/bookings', {
                title: 'Bookings',
                bookings: bookings || [],
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                currentStatus: status,
                totalCount: count,
                session: req.session
            });
        } catch (error) {
            console.error('Bookings error:', error);
            res.render('admin/bookings', { 
                title: 'Bookings',
                bookings: [], 
                error: 'Failed to load bookings',
                session: req.session
            });
        }
    },

    // Get booking details
    getBookingDetails: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        
        const { id } = req.params;
        
        try {
            const booking = await db.Booking.findByPk(id, {
                include: [
                    { model: db.Guest, as: 'guest' },
                    { model: db.Room, include: [{ model: db.RoomType }] },
                    { model: db.Payment },
                    { model: db.User, as: 'user' }
                ]
            });
            
            if (booking) {
                res.json(booking);
            } else {
                res.status(404).json({ error: 'Booking not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to load booking details' });
        }
    },

    // Update booking status
    updateBookingStatus: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        try {
            await db.Booking.update({ status }, { where: { id } });
            res.json({ success: true, message: 'Booking status updated successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update booking status' });
        }
    },

    // Room management
    getRooms: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        
        const status = req.query.status || 'all';
        
        try {
            const where = {};
            if (status !== 'all') where.status = status;
            
            const rooms = await db.Room.findAll({
                where,
                include: [{ model: db.RoomType }],
                order: [['room_number', 'ASC']]
            });
            
            res.render('admin/rooms', { 
                title: 'Rooms',
                rooms: rooms || [], 
                currentStatus: status,
                session: req.session
            });
        } catch (error) {
            console.error('Rooms error:', error);
            res.render('admin/rooms', { 
                title: 'Rooms',
                rooms: [], 
                error: 'Failed to load rooms',
                session: req.session
            });
        }
    },

    // Update room status
    updateRoomStatus: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['available', 'occupied', 'maintenance', 'cleaning'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        try {
            await db.Room.update({ status }, { where: { id } });
            res.json({ success: true, message: 'Room status updated successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update room status' });
        }
    },

    // ==================== AMENITIES ====================
    getAmenities: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const amenities = await db.Amenity.findAll({ order: [['display_order', 'ASC']] });
            res.render('admin/amenities', { title: 'Amenities', amenities, session: req.session });
        } catch (error) {
            console.error(error);
            res.render('admin/amenities', { title: 'Amenities', amenities: [], error: 'Failed to load amenities', session: req.session });
        }
    },

    createAmenity: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const amenity = await db.Amenity.create(req.body);
            res.json({ success: true, amenity });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateAmenity: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            await db.Amenity.update(req.body, { where: { id: req.params.id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteAmenity: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            await db.Amenity.destroy({ where: { id: req.params.id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== USERS ====================
    getUsers: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const users = await db.User.findAll({ order: [['created_at', 'DESC']] });
            res.render('admin/users', { title: 'Users', users, session: req.session });
        } catch (error) {
            res.render('admin/users', { title: 'Users', users: [], error: 'Failed to load users', session: req.session });
        }
    },

    getUserDetails: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const user = await db.User.findByPk(req.params.id, {
                include: [{ model: db.Booking, as: 'bookings' }]
            });
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateUserStatus: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            await db.User.update({ status: req.body.status }, { where: { id: req.params.id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== REQUESTS ====================
    getRequests: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const requests = await db.RequestSubmission.findAll({ order: [['created_at', 'DESC']] });
            res.render('admin/requests', { title: 'Requests', requests, session: req.session });
        } catch (error) {
            res.render('admin/requests', { title: 'Requests', requests: [], error: 'Failed to load requests', session: req.session });
        }
    },

    getRequestDetails: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const request = await db.RequestSubmission.findByPk(req.params.id);
            res.json(request);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateRequestStatus: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            await db.RequestSubmission.update({ status: req.body.status }, { where: { id: req.params.id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== MENU ====================
    getMenu: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const menuItems = await db.MenuItem.findAll({ include: [{ model: db.MenuCategory, as: 'category' }] });
            res.render('admin/menu', { title: 'Menu', menuItems, session: req.session });
        } catch (error) {
            res.render('admin/menu', { title: 'Menu', menuItems: [], error: 'Failed to load menu', session: req.session });
        }
    },

    createMenuItem: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const item = await db.MenuItem.create(req.body);
            res.json({ success: true, item });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateMenuItem: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            await db.MenuItem.update(req.body, { where: { id: req.params.id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteMenuItem: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            await db.MenuItem.destroy({ where: { id: req.params.id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== REPORTS ====================
    getReports: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const totalBookings = await db.Booking.count();
            const totalRevenue = await db.Payment.sum('amount', { where: { status: 'completed' } }) || 0;
            const recentBookings = await db.Booking.findAll({
                include: [{ model: db.Guest, as: 'guest' }],
                limit: 10,
                order: [['created_at', 'DESC']]
            });
            
            res.render('admin/reports', { 
                title: 'Reports', 
                totalBookings, 
                totalRevenue, 
                recentBookings,
                session: req.session 
            });
        } catch (error) {
            res.render('admin/reports', { title: 'Reports', error: 'Failed to load reports', session: req.session });
        }
    },

    // ==================== SETTINGS ====================
    getSettings: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const settings = await db.SystemSetting.findOne({ where: { id: 1 } }) || {};
            res.render('admin/settings', { title: 'Settings', settings, session: req.session });
        } catch (error) {
            res.render('admin/settings', { title: 'Settings', error: 'Failed to load settings', session: req.session });
        }
    },

    updateSettings: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            await db.SystemSetting.upsert(req.body, { where: { id: 1 } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== ACTIVITY LOGS ====================
    getActivityLogs: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const logs = await db.ActivityLog.findAll({ order: [['created_at', 'DESC']], limit: 100 });
            res.render('admin/activity', { title: 'Activity Logs', logs, session: req.session });
        } catch (error) {
            res.render('admin/activity', { title: 'Activity Logs', error: 'Failed to load activity logs', session: req.session });
        }
    }
};

module.exports = adminController;