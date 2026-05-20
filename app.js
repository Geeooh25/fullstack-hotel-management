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

// Initialize Socket.io
const { initSocket } = require('./socket');
const io = initSocket(server);
app.set('io', io);

app.set('trust proxy', 1);

// ==================== MIDDLEWARE ====================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const { handleWebhook } = require('./webhooks/stripe');
    await handleWebhook(req, res);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

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

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.hotelName = process.env.HOTEL_NAME || 'Mansion Hotel';
    res.locals.currentYear = new Date().getFullYear();
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.session = req.session;
    next();
});

app.use('/api', optionalAuthForGuests);
app.use('/api', apiLimiter);

// ==================== VIEW ENGINE ====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');

// ==================== PUBLIC ROUTES ====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/rooms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rooms.html')));
app.get('/room-detail', (req, res) => res.sendFile(path.join(__dirname, 'public', 'room-detail.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));
app.get('/booking-confirmation', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking-confirmation.html')));
app.get('/booking-lookup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking-lookup.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/amenities', (req, res) => res.sendFile(path.join(__dirname, 'public', 'amenities.html')));
app.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gallery.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/payment-success', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment-success.html')));
app.get('/payment-failed', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment-failed.html')));
app.get('/test-layout', (req, res) => res.render('test'));

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
app.use('/admin', require('./routes/admin'));

// Google OAuth
app.use('/auth', require('./routes/auth'));

// Simple rooms test endpoint
app.get('/simple-rooms', async (req, res) => {
    try {
        const rooms = await Room.findAll();
        res.json({ success: true, count: rooms.length, rooms });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==================== ERROR HANDLING ====================
app.use(notFound);
app.use(errorHandler);
// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Auto-sync database schema on every deploy
        // This adds missing columns without deleting data
        console.log('🔄 Checking database schema...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database schema up to date');

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