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

// ==================== FIX DATABASE ROUTES ====================

// Complete database fix - add all missing columns
app.get('/fix-all-columns', async (req, res) => {
    try {
        const { sequelize } = require('./config/database');
        const results = [];
        
        // List of all columns that might be missing
        const columnsToAdd = [
            { name: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
            { name: 'locked_until', type: 'TIMESTAMP' },
            { name: 'last_login_ip', type: 'VARCHAR(45)' },
            { name: 'last_login_device', type: 'TEXT' },
            { name: 'password_reset_token', type: 'VARCHAR(255)' },
            { name: 'password_reset_expires', type: 'TIMESTAMP' },
            { name: 'permissions', type: 'TEXT' }
        ];
        
        for (const col of columnsToAdd) {
            try {
                await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                results.push(`✅ Added column: ${col.name}`);
            } catch (err) {
                if (err.message.includes('duplicate column')) {
                    results.push(`⚠️ Column ${col.name} already exists`);
                } else {
                    results.push(`❌ Could not add ${col.name}: ${err.message}`);
                }
            }
        }
        
        // Also update the role enum if needed
        try {
            await sequelize.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'guest'`);
            results.push(`✅ Set role default to guest`);
        } catch (err) {
            results.push(`⚠️ Could not set role default: ${err.message}`);
        }
        
        // Verify final columns
        const [columns] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        const columnNames = columns.map(c => c.column_name);
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Complete Database Fix</title></head>
            <body style="font-family: monospace; padding: 20px;">
                <h1>🔧 Complete Database Fix Results</h1>
                <h3>Actions taken:</h3>
                <pre>${results.join('\n')}</pre>
                <h3>All columns in users table (${columnNames.length} columns):</h3>
                <pre>${columnNames.join('\n')}</pre>
                <hr>
                <p><a href="/check-admin">Check Admin User →</a></p>
                <p><a href="/create-admin">Create Admin User →</a></p>
                <p><a href="/admin/login">Go to Admin Login →</a></p>
            </body>
            </html>
        `);
    } catch (error) {
        res.send(`<h1>Error</h1><pre>${error.message}</pre>`);
    }
});

// Reset admin password using raw SQL
app.get('/reset-admin-password', async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const { sequelize } = require('./config/database');
        
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        
        await sequelize.query(
            `UPDATE users SET password = :password, role = 'super_admin' WHERE email = 'admin@mansionhotel.com'`,
            { replacements: { password: hashedPassword } }
        );
        
        res.json({ 
            success: true, 
            message: 'Admin password reset successfully',
            email: 'admin@mansionhotel.com',
            password: 'Admin123!'
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Check admin user
app.get('/check-admin', async (req, res) => {
    try {
        const admin = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        
        if (admin) {
            res.json({
                exists: true,
                email: admin.email,
                role: admin.role,
                is_active: admin.is_active,
                has_password: !!admin.password
            });
        } else {
            res.json({ exists: false, message: 'Admin user not found' });
        }
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Create admin user
app.get('/create-admin', async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        
        const existing = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        if (existing) {
            return res.json({ message: 'Admin already exists', email: existing.email });
        }
        
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        const admin = await User.create({
            email: 'admin@mansionhotel.com',
            password: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'super_admin',
            is_active: true,
            status: 'active'
        });
        
        res.json({ success: true, message: 'Admin created', email: admin.email });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Debug login test
app.post('/debug-login', async (req, res) => {
    const { email, password } = req.body;
    const bcrypt = require('bcrypt');
    
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.json({ success: false, error: 'User not found', email });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        res.json({
            success: true,
            user_exists: true,
            password_valid: isValid,
            user_role: user.role,
            user_active: user.is_active,
            email: user.email
        });
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
app.use('/admin', require('./routes/admin'));

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
        
        // Don't sync tables - just verify
        console.log('✅ Database ready');
        
        server.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin/login`);
            console.log(`🔑 Admin: admin@mansionhotel.com / Admin123!\n`);
            console.log(`🔧 Debug URLs:`);
            console.log(`   Check Admin: http://localhost:${PORT}/check-admin`);
            console.log(`   Create Admin: http://localhost:${PORT}/create-admin`);
            console.log(`   Fix Columns: http://localhost:${PORT}/fix-columns`);
        });
    } catch (error) {
        console.error('Failed to start:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server };