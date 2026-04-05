const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const passport = require('passport'); // ADD THIS

require('dotenv').config();

// Database
const { sequelize, testConnection } = require('./config/database');
const { User, RoomType, Room } = require('./models');

// Middleware
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { optionalAuthForGuests } = require('./middleware/auth'); // ADD THIS

const app = express();

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true
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

// ==================== PASSPORT INITIALIZATION (ADD THIS) ====================
app.use(passport.initialize());
app.use(passport.session());

// Make user and flash messages available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.hotelName = process.env.HOTEL_NAME || 'Mansion Hotel';
    res.locals.currentYear = new Date().getFullYear();
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Apply optional auth for guests on API routes (ADD THIS)
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

// ADD THESE NEW ROUTES (for auth pages)
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

// API routes
app.use('/api/rooms', require('./routes/api/rooms'));
app.use('/api/availability', require('./routes/api/availability'));
app.use('/api/bookings', require('./routes/api/bookings'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/contact', require('./routes/api/contact'));

// Add new API routes
app.use('/api/amenities', require('./routes/api/amenities'));
app.use('/api/cart', require('./routes/api/cart'));
app.use('/api/menu', require('./routes/api/menu'));
app.use('/api/requests', require('./routes/api/requests'));

// Admin routes
app.use('/admin', require('./routes/admin'));
app.use('/admin/amenities', require('./routes/admin/amenities'));
app.use('/admin/menu', require('./routes/admin/menu'));
app.use('/admin/requests', require('./routes/admin/requests'));

// ADD GOOGLE OAUTH ROUTES (ADD THIS)
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
                is_active: true
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
        
    } catch (error) {
        console.error('❌ Database sync error:', error.message);
    }
};

const startServer = async () => {
    try {
        await testConnection();
        await syncDatabase();
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📁 Database file: ./database.sqlite`);
            console.log(`\n🔑 Admin Login:`);
            console.log(`   Email: admin@mansionhotel.com`);
            console.log(`   Password: Admin123!`);
            console.log(`\n📱 Public Site: http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin/login.html`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;