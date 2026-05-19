const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
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
const server = http.createServer(app);

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

// Stripe Webhook
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
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

// Passport initialization
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
app.use('/api', apiLimiter);

// ==================== VIEW ENGINE ====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');

// ==================== PUBLIC ROUTES ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/rooms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rooms.html')));
app.get('/room-detail', (req, res) => res.sendFile(path.join(__dirname, 'public', 'room-detail.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));
app.get('/booking-confirmation', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking-confirmation.html')));
app.get('/booking-lookup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking-lookup.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/amenities', (req, res) => res.sendFile(path.join(__dirname, 'public', 'amenities.html')));
app.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gallery.html')));

// Auth pages
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/payment-success', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment-success.html')));
app.get('/payment-failed', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment-failed.html')));
app.get('/test-layout', (req, res) => res.render('test'));
app.get('/simple-rooms', async (req, res) => {
    try {
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

// ==================== ADMIN ROUTES ====================
// All admin routes are handled by routes/admin.js
app.use('/admin', require('./routes/admin'));

// Temporary fix route - remove after using
app.get('/fix-all', async (req, res) => {
    try {
        const { sequelize } = require('./config/database');
        const { Amenity, RoomType, Room, User } = require('./models');
        const bcrypt = require('bcrypt');
        
        let results = [];
        
        // Add missing columns
        const columns = [
            'failed_login_attempts INTEGER DEFAULT 0',
            'locked_until TIMESTAMP',
            'last_login_ip VARCHAR(45)',
            'last_login_device TEXT',
            'password_reset_token VARCHAR(255)',
            'password_reset_expires TIMESTAMP'
        ];
        
        for (const col of columns) {
            try {
                await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`);
                results.push(`✅ Added column`);
            } catch (err) {
                results.push(`⚠️ ${err.message}`);
            }
        }
        
        // Create admin if not exists
        const admin = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        if (!admin) {
            await User.create({
                email: 'admin@mansionhotel.com',
                password: await bcrypt.hash('Admin123!', 10),
                first_name: 'Admin',
                last_name: 'User',
                role: 'super_admin',
                is_active: true
            });
            results.push('✅ Admin user created');
        }
        
        res.send(`<h1>Fix Results</h1><pre>${results.join('\n')}</pre><a href="/admin/login">Go to Login</a>`);
    } catch (error) {
        res.send(`<h1>Error</h1><pre>${error.message}</pre>`);
    }
});

// Add this temporary route to app.js
app.get('/run-setup', async (req, res) => {
    const { exec } = require('child_process');
    exec('node scripts/setup-db.js', (error, stdout, stderr) => {
        res.send(`<pre>${stdout}\n${stderr || ''}</pre>`);
    });
});

// Google OAuth
app.use('/auth', require('./routes/auth'));

// ==================== ERROR HANDLING ====================
app.use(notFound);
app.use(errorHandler);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');
        await sequelize.sync({ alter: false });
        console.log('✅ Database synced');
        
        server.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin/login`);
            console.log(`🔑 Admin: admin@mansionhotel.com / Admin123!\n`);
        });
    } catch (error) {
        console.error('Failed to start:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server };