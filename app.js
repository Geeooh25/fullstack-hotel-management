const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http'); // ADD THIS for Socket.io
const cors = require('cors');
const helmet = require('helmet');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const passport = require('passport'); 

require('dotenv').config();

// Database
const { sequelize, testConnection } = require('./config/database');
const { User, RoomType, Room } = require('./models');

// Middleware
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { optionalAuthForGuests } = require('./middleware/auth');

const app = express();
const server = http.createServer(app); //  Socket.io

// Initialize Socket.io for real-time updates
//const { initSocket } = require('./socket');
//const io = initSocket(server);
//app.set('io', io);

app.set('trust proxy', 1);

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Stripe Webhook (MUST come BEFORE express.json())
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const { handleWebhook } = require('./webhooks/stripe');
    await handleWebhook(req, res);
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Flash messages
app.use(flash());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'mansion-hotel-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// ==================== PASSPORT INITIALIZATION ====================
app.use(passport.initialize());
app.use(passport.session());

// Make user and flash messages available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.hotelName = process.env.HOTEL_NAME || 'Mansion Hotel';
    res.locals.currentYear = new Date().getFullYear();
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.session = req.session; // ADD THIS for admin panel
    next();
});

// Apply optional auth for guests on API routes
app.use('/api', optionalAuthForGuests);

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// ==================== VIEW ENGINE ====================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');

// ==================== ROUTES ====================

// Public routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/rooms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rooms.html'));
});

app.get('/room-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'room-detail.html'));
});

app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

app.get('/booking-confirmation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking-confirmation.html'));
});

app.get('/booking-lookup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking-lookup.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/amenities', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'amenities.html'));
});

app.get('/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

// Auth pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/payment-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment-success.html'));
});

app.get('/payment-failed', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment-failed.html'));
});

app.get('/test-layout', (req, res) => {
    res.render('test');
});

// Simple rooms test endpoint
app.get('/simple-rooms', async (req, res) => {
    try {
        const { Room } = require('./models');
        const rooms = await Room.findAll();
        res.json({ success: true, count: rooms.length, rooms });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==================== API ROUTES ====================
app.use('/api/rooms', require('./routes/api/rooms'));
app.use('/api/availability', require('./routes/api/availability'));
app.use('/api/bookings', require('./routes/api/bookings'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/contact', require('./routes/api/contact'));
app.use('/api/amenities', require('./routes/api/amenities'));
app.use('/api/cart', require('./routes/api/cart'));
app.use('/api/menu', require('./routes/api/menu'));
app.use('/api/requests', require('./routes/api/requests'));

// ==================== ADMIN ROUTES (EJS) ====================
app.use('/admin', require('./routes/admin'));
app.use('/admin/amenities', require('./routes/admin/amenities'));
app.use('/admin/menu', require('./routes/admin/menu'));
app.use('/admin/requests', require('./routes/admin/requests'));
app.use('/admin/users', require('./routes/admin/users'));
app.use('/admin/reports', require('./routes/admin/reports'));
app.use('/admin/settings', require('./routes/admin/settings'));
app.use('/admin/activity', require('./routes/admin/activity'));

// ==================== ADMIN EJS VIEWS (ADD THIS SECTION) ====================

// Admin authentication routes (EJS views)
app.get('/admin/login-page', (req, res) => {
    res.render('admin/login', { error: null });
});

app.post('/admin/login-page', async (req, res) => {
    const { email, password } = req.body;
    const bcrypt = require('bcrypt');
    
    try {
        const user = await User.findOne({ 
            where: { email: email, role: 'admin' }
        });
        
        if (user && await bcrypt.compare(password, user.password_hash)) {
            req.session.admin = {
                id: user.id,
                name: `${user.first_name} ${user.last_name}`,
                email: user.email
            };
            res.redirect('/admin/dashboard');
        } else {
            res.render('admin/login', { error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', { error: 'Login failed' });
    }
});

app.get('/admin/dashboard', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    
    try {
        const { Booking, Payment, Room, Guest } = require('./models');
        const { Op } = require('sequelize');
        
        const totalBookings = await Booking.count() || 0;
        const totalRevenue = await Payment.sum('amount', { where: { status: 'completed' } }) || 0;
        const totalRooms = await Room.count() || 1;
        const occupiedRooms = await Booking.count({ 
            where: { 
                status: ['confirmed', 'checked_in'],
                check_in_date: { [Op.lte]: new Date() },
                check_out_date: { [Op.gte]: new Date() }
            }
        }) || 0;
        const occupancy = Math.round((occupiedRooms / totalRooms) * 100);
        
        const recentBookings = await Booking.findAll({
            include: [{ model: Guest, as: 'guest' }, { model: Room }],
            order: [['created_at', 'DESC']],
            limit: 5
        });
        
        res.render('admin/dashboard', {
            name: req.session.admin.name,
            stats: { totalBookings, totalRevenue, occupancy },
            recentBookings,
            session: req.session
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', { 
            name: req.session.admin.name, 
            stats: { totalBookings: 0, totalRevenue: 0, occupancy: 0 }, 
            recentBookings: [],
            session: req.session
        });
    }
});

app.get('/admin/logout-page', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login-page');
});

// Bookings management view
app.get('/admin/bookings-view', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    
    try {
        const { Booking, Guest, Room, RoomType } = require('./models');
        
        const bookings = await Booking.findAll({
            include: [
                { model: Guest, as: 'guest' },
                { model: Room, include: [{ model: RoomType }] }
            ],
            order: [['created_at', 'DESC']]
        });
        
        res.render('admin/bookings', { bookings, session: req.session });
    } catch (error) {
        console.error(error);
        res.render('admin/bookings', { bookings: [], error: 'Failed to load bookings', session: req.session });
    }
});

// Rooms management view
app.get('/admin/rooms-view', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    
    try {
        const { Room, RoomType } = require('./models');
        
        const rooms = await Room.findAll({
            include: [{ model: RoomType }],
            order: [['room_number', 'ASC']]
        });
        
        res.render('admin/rooms', { rooms, session: req.session });
    } catch (error) {
        console.error(error);
        res.render('admin/rooms', { rooms: [], error: 'Failed to load rooms', session: req.session });
    }
});

// API endpoints for status updates
app.put('/admin/api/bookings/:id/status', async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;
    const { status } = req.body;
    const { Booking } = require('./models');
    
    try {
        await Booking.update({ status }, { where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/admin/api/rooms/:id/status', async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id } = req.params;
    const { status } = req.body;
    const { Room } = require('./models');
    
    try {
        await Room.update({ status }, { where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Placeholder routes for other admin pages
app.get('/admin/amenities-view', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    res.render('admin/amenities', { amenities: [], session: req.session });
});

app.get('/admin/users-view', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    res.render('admin/users', { users: [], session: req.session });
});

app.get('/admin/requests-view', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    res.render('admin/requests', { requests: [], session: req.session });
});

app.get('/admin/menu-view', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    res.render('admin/menu', { menuItems: [], session: req.session });
});

app.get('/admin/reports-view', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    res.render('admin/reports', { session: req.session });
});

app.get('/admin/settings-view', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    res.render('admin/settings', { session: req.session });
});

app.get('/admin/activity-view', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login-page');
    res.render('admin/activity', { session: req.session });
});

// Google OAuth routes
app.use('/auth', require('./routes/auth'));

// ==================== ERROR HANDLING ====================

app.use(notFound);
app.use(errorHandler);

// ==================== DATABASE SYNC & START SERVER ====================

const PORT = process.env.PORT || 3000;

const syncDatabase = async () => {
    try {
        await sequelize.sync({ alter: false });
        console.log('✅ Database synchronized');
        
        // Create default admin user if not exists
        const adminExists = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        if (!adminExists) {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            await User.create({
                email: 'admin@mansionhotel.com',
                password_hash: hashedPassword,
                first_name: 'Admin',
                last_name: 'User',
                role: 'admin',
                is_active: true,
                status: 'active'
            });
            console.log('✅ Default admin user created');
            console.log('   Email: admin@mansionhotel.com');
            console.log('   Password: Admin123!');
        }
        
        // Create default room types if none exist
        const roomTypeCount = await RoomType.count();
        if (roomTypeCount === 0) {
            await RoomType.create({
                name: 'Standard Room',
                description: 'Comfortable room with all essential amenities. Perfect for business travelers.',
                capacity: 2,
                base_price: 129.00,
                amenities: '["Free WiFi", "Flat-screen TV", "Air Conditioning", "Work Desk"]',
                is_active: true
            });
            
            await RoomType.create({
                name: 'Deluxe Room',
                description: 'Spacious room with premium amenities and city view. Ideal for couples.',
                capacity: 2,
                base_price: 199.00,
                amenities: '["Free WiFi", "55\\" Smart TV", "Air Conditioning", "Mini Bar", "City View", "King Bed"]',
                is_active: true
            });
            
            await RoomType.create({
                name: 'Executive Suite',
                description: 'Luxurious suite with separate living area and panoramic views.',
                capacity: 4,
                base_price: 299.00,
                amenities: '["Free WiFi", "65\\" Smart TV", "Air Conditioning", "Mini Bar", "Living Room", "Jacuzzi", "Work Desk"]',
                is_active: true
            });
            
            console.log('✅ Default room types created');
        }
        
        // Create sample rooms if none exist
        const roomCount = await Room.count();
        if (roomCount === 0) {
            const standardType = await RoomType.findOne({ where: { name: 'Standard Room' } });
            const deluxeType = await RoomType.findOne({ where: { name: 'Deluxe Room' } });
            const executiveType = await RoomType.findOne({ where: { name: 'Executive Suite' } });
            
            if (standardType) {
                for (let i = 101; i <= 110; i++) {
                    await Room.create({
                        room_number: i.toString(),
                        room_type_id: standardType.id,
                        floor: Math.floor(i / 100),
                        status: 'available'
                    });
                }
                console.log('✅ Standard rooms created (101-110)');
            }
            
            if (deluxeType) {
                for (let i = 201; i <= 208; i++) {
                    await Room.create({
                        room_number: i.toString(),
                        room_type_id: deluxeType.id,
                        floor: Math.floor(i / 100),
                        status: 'available'
                    });
                }
                console.log('✅ Deluxe rooms created (201-208)');
            }
            
            if (executiveType) {
                for (let i = 301; i <= 304; i++) {
                    await Room.create({
                        room_number: i.toString(),
                        room_type_id: executiveType.id,
                        floor: Math.floor(i / 100),
                        status: 'available'
                    });
                }
                console.log('✅ Executive suites created (301-304)');
            }
        }
        
        // Create default system settings if not exists
        try {
            const { SystemSetting, NotificationSetting } = require('./models');
            const [systemSetting, created] = await SystemSetting.findOrCreate({
                where: { id: 1 },
                defaults: {}
            });
            if (created) console.log('✅ Default system settings created');
            
            const [notificationSetting, notifCreated] = await NotificationSetting.findOrCreate({
                where: { id: 1 },
                defaults: {}
            });
            if (notifCreated) console.log('✅ Default notification settings created');
        } catch (err) {
            console.log('⚠️ Settings tables not yet created - run migration first');
        }
        
    } catch (error) {
        console.error('❌ Database sync error:', error.message);
    }
};

const startServer = async () => {
    try {
        await testConnection();
        await syncDatabase();
        
        // Use server.listen instead of app.listen for Socket.io
        server.listen(PORT, () => {
            console.log(`\n========================================`);
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`========================================`);
            console.log(`📱 Public Site: http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin/login-page`);
            console.log(`🔌 Socket.io enabled for real-time updates`);
            console.log(`\n🔑 Admin Credentials:`);
            console.log(`   Email: admin@mansionhotel.com`);
            console.log(`   Password: Admin123!`);
            console.log(`\n📊 Admin Pages:`);
            console.log(`   Dashboard: http://localhost:${PORT}/admin/dashboard`);
            console.log(`   Bookings: http://localhost:${PORT}/admin/bookings-view`);
            console.log(`   Rooms: http://localhost:${PORT}/admin/rooms-view`);
            console.log(`   Reports: http://localhost:${PORT}/admin/reports-view`);
            console.log(`   Settings: http://localhost:${PORT}/admin/settings-view`);
            console.log(`   Activity: http://localhost:${PORT}/admin/activity-view`);
            console.log(`========================================\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server };