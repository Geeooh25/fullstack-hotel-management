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
const { optionalAuthForGuests, isAdminAuthenticated } = require('./middleware/auth');

const app = express();
const server = http.createServer(app); // for Socket.io

// Initialize Socket.io for real-time updates
const { initSocket } = require('./socket');
const io = initSocket(server);
app.set('io', io);

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
    res.locals.session = req.session;
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
app.use('/admin/staff', require('./routes/admin/staff'));

// ==================== ADMIN AUTHENTICATION (SINGLE LOGIN) ====================

// Unified admin login route (supports admin, receptionist, housekeeping)
app.get('/admin/login', (req, res) => {
    res.render('admin/login', { title: 'Login', error: null });
});

app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const bcrypt = require('bcrypt');
    const { Op } = require('sequelize');
    
    try {
        // Allow admin, receptionist, housekeeping roles to login
        const user = await User.findOne({ 
            where: { 
                email: email,
                role: { [Op.ne]: 'guest' }
            }
        });
        
        if (!user) {
            return res.render('admin/login', { title: 'Login', error: 'Invalid email or password' });
        }
        
        if (!user.is_active) {
            return res.render('admin/login', { title: 'Login', error: 'Account is deactivated. Contact administrator.' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        
        if (isValid) {
            req.session.admin = {
                id: user.id,
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role
            };
            res.redirect('/admin/dashboard');
        } else {
            res.render('admin/login', { title: 'Login', error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', { title: 'Login', error: 'Login failed' });
    }
});

app.get('/admin/logout', async (req, res) => {
    if (req.session.admin) {
        // Record logout activity
        const db = require('./models');
        await db.ActivityLog.create({
            admin_id: req.session.admin.id,
            admin_username: req.session.admin.email,
            action: 'logout',
            details: JSON.stringify({ role: req.session.admin.role }),
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).catch(e => console.log('Logout log error:', e.message));
    }
    req.session.destroy();
    res.redirect('/admin/login');
});

// Dashboard
app.get('/admin/dashboard', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    
    try {
        const { Booking, Payment, Room, Guest } = require('./models');
        
        const totalBookings = await Booking.count() || 0;
        const totalRevenue = await Payment.sum('amount', { where: { status: 'completed' } }) || 0;
        const totalRooms = await Room.count() || 1;
        const occupiedRooms = await Booking.count({ 
            where: { status: ['confirmed', 'checked_in'] }
        }) || 0;
        const occupancy = Math.round((occupiedRooms / totalRooms) * 100);
        
        const recentBookings = await Booking.findAll({
            include: [{ model: Guest }, { model: Room }],
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
                password: hashedPassword,
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
            await RoomType.bulkCreate([
                { name: 'Standard Room', description: 'Comfortable standard room', capacity: 2, base_price: 129.00, is_active: true },
                { name: 'Deluxe Room', description: 'Spacious deluxe room', capacity: 2, base_price: 199.00, is_active: true },
                { name: 'Executive Suite', description: 'Luxury suite', capacity: 4, base_price: 299.00, is_active: true }
            ]);
            console.log('✅ Default room types created');
        }
        
        // Create sample rooms if none exist
        const roomCount = await Room.count();
        if (roomCount === 0) {
            const standardType = await RoomType.findOne({ where: { name: 'Standard Room' } });
            const deluxeType = await RoomType.findOne({ where: { name: 'Deluxe Room' } });
            const executiveType = await RoomType.findOne({ where: { name: 'Executive Suite' } });
            
            const rooms = [];
            if (standardType) {
                for (let i = 101; i <= 110; i++) rooms.push({ room_number: i.toString(), room_type_id: standardType.id, floor: 1, status: 'available' });
            }
            if (deluxeType) {
                for (let i = 201; i <= 208; i++) rooms.push({ room_number: i.toString(), room_type_id: deluxeType.id, floor: 2, status: 'available' });
            }
            if (executiveType) {
                for (let i = 301; i <= 304; i++) rooms.push({ room_number: i.toString(), room_type_id: executiveType.id, floor: 3, status: 'available' });
            }
            await Room.bulkCreate(rooms);
            console.log('✅ Sample rooms created');
        }
        
    } catch (error) {
        console.error('❌ Database sync error:', error.message);
    }
};

const startServer = async () => {
    try {
        await testConnection();
        await syncDatabase();
        
        server.listen(PORT, () => {
            console.log(`\n========================================`);
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`========================================`);
            console.log(`📱 Public Site: http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin/login`);
            console.log(`🔌 Socket.io enabled for real-time updates`);
            console.log(`\n🔑 Login Credentials:`);
            console.log(`   Admin: admin@mansionhotel.com / Admin123!`);
            console.log(`   Staff: Create staff from Staff Management page`);
            console.log(`========================================\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server };