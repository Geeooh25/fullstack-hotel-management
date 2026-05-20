const db = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

const adminController = {
    // ==================== AUTHENTICATION ====================
    getLogin: (req, res) => {
        res.render('admin/login', { title: 'Login', error: null });
    },
postLogin: async (req, res) => {
    const { email, password, remember } = req.body;
    const bcrypt = require('bcrypt');
    const { Op } = require('sequelize');
    
    try {
        const user = await db.User.findOne({ 
            where: { 
                email: email,
                role: { [Op.ne]: 'guest' }
            }
        });
        
        // Check if account is locked
        if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
            const lockedMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / (1000 * 60));
            return res.render('admin/login', { 
                title: 'Login', 
                error: `Account is locked. Please try again in ${lockedMinutes} minutes.`,
                email: email
            });
        }
        
        if (!user) {
            return res.render('admin/login', { title: 'Login', error: 'Invalid email or password', email: email });
        }
        
        if (!user.is_active) {
            return res.render('admin/login', { title: 'Login', error: 'Account is deactivated. Contact administrator.', email: email });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            // Increment failed login attempts
            const newAttempts = (user.failed_login_attempts || 0) + 1;
            const updates = { failed_login_attempts: newAttempts };
            
            // Lock account after 5 failed attempts
            if (newAttempts >= 5) {
                const lockUntil = new Date();
                lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Lock for 30 minutes
                updates.locked_until = lockUntil;
                updates.failed_login_attempts = 0;
                
                await db.ActivityLog.create({
                    admin_id: user.id,
                    admin_username: user.email,
                    action: 'account_locked',
                    details: JSON.stringify({ reason: 'Too many failed attempts', ip: req.ip }),
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                });
                
                return res.render('admin/login', { 
                    title: 'Login', 
                    error: 'Too many failed attempts. Account locked for 30 minutes.',
                    email: email
                });
            }
            
            await user.update(updates);
            
            const remainingAttempts = 5 - newAttempts;
            return res.render('admin/login', { 
                title: 'Login', 
                error: `Invalid email or password. ${remainingAttempts} attempts remaining.`,
                email: email,
                remainingAttempts: remainingAttempts
            });
        }
        
        // Successful login - reset failed attempts
        await user.update({ 
            failed_login_attempts: 0,
            locked_until: null,
            last_login: new Date(),
            last_login_ip: req.ip,
            last_login_device: req.headers['user-agent']
        });
        
        // Set session expiration based on "Remember Me"
        if (remember === '1') {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
            req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        }
        
        // Record login activity
        await db.ActivityLog.create({
            admin_id: user.id,
            admin_username: user.email,
            action: 'login',
            details: JSON.stringify({ 
                ip: req.ip, 
                user_agent: req.headers['user-agent'],
                role: user.role 
            }),
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });
        
        req.session.admin = {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`,
    email: user.email,
    role: user.role,
    last_login: user.last_login,
    last_login_ip: user.last_login_ip
};
        
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', { title: 'Login', error: 'Login failed. Please try again.' });
    }
},

    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/admin/login');
    },

    // ==================== DASHBOARD ====================
    getDashboard: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        
        try {
            const totalBookings = await db.Booking.count() || 0;
            const totalRevenue = await db.Payment.sum('amount', { where: { status: 'completed' } }) || 0;
            const totalRooms = await db.Room.count() || 1;
            
            const occupiedRooms = await db.Booking.count({ 
                where: { status: ['confirmed', 'checked_in'] }
            }) || 0;
            
            const occupancy = Math.round((occupiedRooms / totalRooms) * 100);
            
            const recentBookings = await db.Booking.findAll({
                include: [
                    { model: db.Guest },
                    { model: db.Room },
                    { model: db.User, as: 'user' }
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
    // Forgot Password - Show form
getForgotPassword: (req, res) => {
    res.render('admin/forgot-password', { title: 'Forgot Password', error: null, success: null });
},

// Forgot Password - Send reset email
postForgotPassword: async (req, res) => {
    const { email } = req.body;
    const crypto = require('crypto');
    
    try {
        const user = await db.User.findOne({ where: { email, role: { [Op.ne]: 'guest' } } });
        
        if (!user) {
            return res.render('admin/forgot-password', { 
                title: 'Forgot Password', 
                error: 'No account found with that email address.',
                success: null 
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry
        
        await user.update({
            password_reset_token: resetToken,
            password_reset_expires: resetExpires
        });
        
        // Send email with reset link
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/admin/reset-password/${resetToken}`;
        
        // Here you would send an email
        console.log('Reset link (for testing):', resetUrl);
        
        res.render('admin/forgot-password', { 
            title: 'Forgot Password', 
            success: 'Password reset link has been sent to your email address.',
            error: null 
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.render('admin/forgot-password', { 
            title: 'Forgot Password', 
            error: 'Failed to process request. Please try again.',
            success: null 
        });
    }
},

// Reset Password - Show form
getResetPassword: async (req, res) => {
    const { token } = req.params;
    
    try {
        const user = await db.User.findOne({ 
            where: { 
                password_reset_token: token,
                password_reset_expires: { [Op.gt]: new Date() }
            } 
        });
        
        if (!user) {
            return res.render('admin/reset-password', { 
                title: 'Reset Password', 
                error: 'Invalid or expired reset token.',
                token: null 
            });
        }
        
        res.render('admin/reset-password', { 
            title: 'Reset Password', 
            error: null,
            token: token 
        });
    } catch (error) {
        res.render('admin/reset-password', { 
            title: 'Reset Password', 
            error: 'Invalid request.',
            token: null 
        });
    }
},

// Reset Password - Update password
postResetPassword: async (req, res) => {
    const { token } = req.params;
    const { password, confirm_password } = req.body;
    const bcrypt = require('bcrypt');
    
    if (password !== confirm_password) {
        return res.render('admin/reset-password', { 
            title: 'Reset Password', 
            error: 'Passwords do not match.',
            token: token 
        });
    }
    
    if (password.length < 8) {
        return res.render('admin/reset-password', { 
            title: 'Reset Password', 
            error: 'Password must be at least 8 characters.',
            token: token 
        });
    }
    
    try {
        const user = await db.User.findOne({ 
            where: { 
                password_reset_token: token,
                password_reset_expires: { [Op.gt]: new Date() }
            } 
        });
        
        if (!user) {
            return res.render('admin/reset-password', { 
                title: 'Reset Password', 
                error: 'Invalid or expired reset token.',
                token: null 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await user.update({
            password: hashedPassword,
            password_reset_token: null,
            password_reset_expires: null,
            failed_login_attempts: 0,
            locked_until: null
        });
        
        res.redirect('/admin/login?reset=success');
    } catch (error) {
        console.error('Reset password error:', error);
        res.render('admin/reset-password', { 
            title: 'Reset Password', 
            error: 'Failed to reset password. Please try again.',
            token: token 
        });
    }
},

    // ==================== BOOKINGS ====================
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
                    { model: db.Guest },
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

    getBookingDetails: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        
        const { id } = req.params;
        
        try {
            const booking = await db.Booking.findByPk(id, {
                include: [
                    { model: db.Guest },
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

  updateBookingStatus: async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        // First, update the status
        await db.Booking.update({ status }, { where: { id } });
        
        // Then try to send email (don't let email failure break the update)
        try {
            // Get booking details with correct alias - use 'Guest' not 'guest'
            const booking = await db.Booking.findByPk(id, {
                include: [
                    { model: db.Guest },  // Remove the 'as' alias
                    { model: db.Room, include: [{ model: db.RoomType }] }
                ]
            });
            
            if (booking && booking.Guest && booking.Room) {
                const EmailService = require('../services/emailService');
                
                if (status === 'confirmed') {
                    await EmailService.sendBookingConfirmation(booking, booking.Guest, booking.Room, {});
                    console.log(`📧 Confirmation email sent for booking #${id}`);
                } else if (status === 'cancelled') {
                    await EmailService.sendCancellationEmail(booking, booking.Guest, 'Booking cancelled by admin');
                    console.log(`📧 Cancellation email sent for booking #${id}`);
                } else if (status === 'checked_in') {
                    await EmailService.sendCheckInReminder(booking, booking.Guest, booking.Room);
                    console.log(`📧 Check-in notification sent for booking #${id}`);
                }
            }
        } catch (emailError) {
            console.error('Email error (non-blocking):', emailError.message);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: error.message });
    }
},

    // ==================== ROOMS ====================
    getRooms: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        
        try {
            const rooms = await db.Room.findAll({
                include: [{ model: db.RoomType }],
                order: [['room_number', 'ASC']]
            });
            
            res.render('admin/rooms', { 
                title: 'Rooms',
                rooms: rooms || [], 
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
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== AMENITIES ====================
    getAmenities: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const amenities = await db.Amenity.findAll({ order: [['display_order', 'ASC']] });
            res.render('admin/amenities', { title: 'Amenities', amenities, session: req.session });
        } catch (error) {
            res.render('admin/amenities', { title: 'Amenities', amenities: [], error: 'Failed to load', session: req.session });
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
            res.render('admin/users', { title: 'Users', users: [], error: 'Failed to load', session: req.session });
        }
    },

    getUserDetails: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const user = await db.User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

updateUserStatus: async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;
    const { status } = req.body;
    const currentUserId = req.session.admin.id;
    const currentUserRole = req.session.admin.role;
    
    // Prevent self status change
    if (parseInt(id) === currentUserId) {
        return res.status(400).json({ error: 'You cannot change your own status' });
    }
    
    // Check target user role
    const targetUser = await db.User.findByPk(id);
    if (targetUser) {
        // Prevent changing super admin status
        if (targetUser.role === 'super_admin') {
            return res.status(400).json({ error: 'Cannot modify Super Admin account' });
        }
        
        // Only super admin can modify admin accounts
        if (targetUser.role === 'admin' && currentUserRole !== 'super_admin') {
            return res.status(403).json({ error: 'Only Super Admin can modify admin accounts' });
        }
    }
    
    try {
        await db.User.update({ status }, { where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
},
    // ==================== ROOM CREATION ====================
    getCreateRoom: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const roomTypes = await db.RoomType.findAll({ where: { is_active: true } });
            res.render('admin/rooms-create', { 
                title: 'Add Room', 
                roomTypes, 
                session: req.session 
            });
        } catch (error) {
            console.error(error);
            res.redirect('/admin/rooms');
        }
    },

    createRoom: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const { room_number, room_type_id, floor, status } = req.body;
            
            const existing = await db.Room.findOne({ where: { room_number } });
            if (existing) {
                return res.status(400).json({ error: 'Room number already exists' });
            }
            
            const room = await db.Room.create({
                room_number,
                room_type_id,
                floor: floor || null,
                status: status || 'available'
            });
            
            res.json({ success: true, room });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },

    getEditRoom: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const room = await db.Room.findByPk(req.params.id, {
                include: [{ model: db.RoomType }]
            });
            const roomTypes = await db.RoomType.findAll({ where: { is_active: true } });
            res.render('admin/rooms-edit', { 
                title: 'Edit Room', 
                room, 
                roomTypes, 
                session: req.session 
            });
        } catch (error) {
            res.redirect('/admin/rooms');
        }
    },

    // ==================== REQUESTS ====================
    getRequests: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const requests = await db.RequestSubmission.findAll({ 
                include: [{ model: db.Amenity, as: 'amenity' }],
                order: [['created_at', 'DESC']] 
            });
            res.render('admin/requests', { title: 'Requests', requests, session: req.session });
        } catch (error) {
            res.render('admin/requests', { title: 'Requests', requests: [], error: 'Failed to load', session: req.session });
        }
    },

    getRequestDetails: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const request = await db.RequestSubmission.findByPk(req.params.id, {
                include: [{ model: db.Amenity, as: 'amenity' }]
            });
            if (!request) return res.status(404).json({ error: 'Request not found' });
            res.json(request);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

   updateRequestStatus: async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled', 'contacted'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        // First, update the request status
        await db.RequestSubmission.update(
            { status, admin_notes, updated_at: new Date() },
            { where: { id } }
        );
        
        // Then try to send email (don't let email failure break the update)
        try {
            const request = await db.RequestSubmission.findByPk(id, {
                include: [{ model: db.Amenity, as: 'amenity' }]
            });
            
            if (request && request.guest_email) {
                const EmailService = require('../services/emailService');
                
                // Send status update email for completed or contacted status
                if (status === 'completed' || status === 'contacted') {
                    await EmailService.sendRequestStatusUpdate(request, status, admin_notes);
                    console.log(`📧 Status update email sent for request #${id}`);
                }
            }
        } catch (emailError) {
            console.error('Email error (non-blocking):', emailError.message);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Request status update error:', error);
        res.status(500).json({ error: error.message });
    }
},
    // ==================== MENU ====================
    getMenu: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const menuItems = await db.MenuItem.findAll({ 
                include: [{ model: db.MenuCategory, as: 'category' }],
                order: [['display_order', 'ASC']]
            });
            
            const categories = await db.MenuCategory.findAll({ 
                order: [['display_order', 'ASC']],
                where: { is_active: true }
            });
            
            res.render('admin/menu', { 
                title: 'Menu', 
                menuItems: menuItems || [], 
                categories: categories || [],
                session: req.session 
            });
        } catch (error) {
            console.error('Menu error:', error);
            res.render('admin/menu', { 
                title: 'Menu', 
                menuItems: [], 
                categories: [],
                error: 'Failed to load menu', 
                session: req.session 
            });
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

    // ==================== STAFF MANAGEMENT ====================
   getStaff: async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    
    // Only super admin and admin can view staff
    if (req.session.admin.role !== 'super_admin' && req.session.admin.role !== 'admin') {
        return res.status(403).render('admin/error', { 
            title: 'Access Denied', 
            message: 'You do not have permission to view staff management.',
            session: req.session 
        });
    }
    
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
        res.render('admin/staff', { 
            title: 'Staff Management', 
            staff: [], 
            error: error.message,
            session: req.session 
        });
    }
},

createStaff: async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { first_name, last_name, email, role, password } = req.body;
        
        console.log('Creating staff:', { first_name, last_name, email, role });
        
        // Check if email exists
        const existing = await db.User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const staff = await db.User.create({
            first_name: first_name,
            last_name: last_name,
            email: email,
            password: hashedPassword,
            role: role,
            is_active: true,
            status: 'active'
        });
        
        console.log('Staff created:', staff.id);
        res.json({ success: true, staff });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ error: error.message });
    }
},

    updateStaff: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const { id } = req.params;
            const { role, is_active } = req.body;
            await db.User.update({ role, is_active }, { where: { id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

deleteStaff: async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;
    const currentUserId = req.session.admin.id;
    const currentUserRole = req.session.admin.role;
    
    // Prevent self-deletion
    if (parseInt(id) === currentUserId) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    // Check if target is super admin
    const targetUser = await db.User.findByPk(id);
    if (targetUser && targetUser.role === 'super_admin') {
        return res.status(400).json({ error: 'Cannot delete Super Admin account' });
    }
    
    // Only super admin and admin can delete staff
    if (currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to delete staff' });
    }
    
    try {
        await db.User.destroy({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
},

    // ==================== COUNTER BOOKING ====================
    getCounterBooking: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const rooms = await db.Room.findAll({
                include: [{ model: db.RoomType }],
                where: { status: 'available' }
            });
            res.render('admin/counter-booking', { 
                title: 'Counter Booking', 
                rooms: rooms || [], 
                session: req.session 
            });
        } catch (error) {
            console.error('Counter booking error:', error);
            res.redirect('/admin/dashboard');
        }
    },

    // ==================== HISTORICAL BOOKING ====================
    getHistoricalBooking: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        
        // Only Super Admin can access
        if (req.session.admin.role !== 'super_admin') {
            return res.status(403).render('admin/error', { 
                title: 'Access Denied', 
                message: 'Only Super Admin can record historical bookings.',
                session: req.session 
            });
        }
        
        try {
            const rooms = await db.Room.findAll({
                include: [{ model: db.RoomType }],
                where: { status: { [Op.ne]: 'maintenance' } }
            });
            
            res.render('admin/historical-booking', { 
                title: 'Historical Booking', 
                rooms: rooms || [], 
                session: req.session 
            });
        } catch (error) {
            console.error('Historical booking page error:', error);
            res.redirect('/admin/dashboard');
        }
    },

    createHistoricalBooking: async (req, res) => {
        if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
        
        // Only Super Admin can create historical bookings
        if (req.session.admin.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only Super Admin can create historical bookings' });
        }
        
        try {
            const { 
                guest_name, guest_email, guest_phone, room_id, 
                check_in, check_out, adults, children, 
                total_amount, payment_method, special_requests,
                id_number, address 
            } = req.body;
            
            console.log('📜 Historical booking request:', { guest_name, guest_email, room_id, check_in, check_out });
            
            // Validate dates
            const checkInDate = new Date(check_in);
            const checkOutDate = new Date(check_out);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
                return res.status(400).json({ success: false, error: 'Invalid date format' });
            }
            
            if (checkOutDate <= checkInDate) {
                return res.status(400).json({ success: false, error: 'Check-out must be after check-in' });
            }
            
            // Check if historical (past date)
            const isHistorical = checkInDate < today;
            
            // Split name
            const nameParts = guest_name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Create or get guest
            let guest = await db.Guest.findOne({ where: { email: guest_email } });
            if (!guest) {
                guest = await db.Guest.create({
                    first_name: firstName,
                    last_name: lastName,
                    email: guest_email,
                    phone: guest_phone,
                    id_card_number: id_number,
                    address: address
                });
            }
            
            // Create booking with historical flag
            const booking = await db.Booking.create({
                booking_reference: 'HIST-' + Date.now(),
                guest_id: guest.id,
                room_id: parseInt(room_id),
                check_in: check_in,
                check_out: check_out,
                adults: adults || 2,
                children: children || 0,
                total_amount: total_amount,
                status: 'checked_out',
                payment_status: 'paid',
                source: 'historical',
                special_requests: special_requests || null,
                is_historical: isHistorical,
                created_by_admin_id: req.session.admin.id
            });
            
            // Create payment record
            await db.Payment.create({
                booking_id: booking.id,
                amount: total_amount,
                payment_method: payment_method || 'cash',
                status: 'completed',
                transaction_id: 'HIST-' + Date.now()
            });
            
            // Log the action
            await db.ActivityLog.create({
                admin_id: req.session.admin.id,
                admin_username: req.session.admin.email,
                action: 'historical_booking',
                details: JSON.stringify({ 
                    booking_id: booking.id,
                    guest: guest_email,
                    check_in, 
                    check_out,
                    is_historical: true,
                    warning: 'Past date booking recorded'
                }),
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });
            
            res.json({ 
                success: true, 
                booking,
                warning: isHistorical ? 'Past date booking recorded successfully' : null
            });
            
        } catch (error) {
            console.error('Historical booking error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ==================== REPORTS ====================
    getReports: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const totalBookings = await db.Booking.count();
            const totalRevenue = await db.Payment.sum('amount', { where: { status: 'completed' } }) || 0;
            const recentBookings = await db.Booking.findAll({
                include: [
                    { model: db.Guest },
                    { model: db.User, as: 'user' }
                ],
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
            console.error('Reports error:', error);
            res.render('admin/reports', { title: 'Reports', error: 'Failed to load', session: req.session });
        }
    },

    // ==================== SETTINGS ====================
    getSettings: async (req, res) => {
        if (!req.session.admin) return res.redirect('/admin/login');
        try {
            const settings = await db.SystemSetting.findOne({ where: { id: 1 } }) || {};
            res.render('admin/settings', { title: 'Settings', settings, session: req.session });
        } catch (error) {
            res.render('admin/settings', { title: 'Settings', error: 'Failed to load', session: req.session });
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
            res.render('admin/activity', { title: 'Activity Logs', error: 'Failed to load', session: req.session });
        }
    }
};

module.exports = adminController;