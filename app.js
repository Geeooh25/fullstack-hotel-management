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

// ==================== FIX ROUTES (KEEP THESE FOR NOW) ====================

// Fix all tables - add missing columns
app.get('/fix-all-tables', async (req, res) => {
    try {
        const { sequelize } = require('./config/database');
        const results = [];
        
        // Fix users table
        const userColumns = [
            'failed_login_attempts INTEGER DEFAULT 0',
            'locked_until TIMESTAMP',
            'last_login_ip VARCHAR(45)',
            'last_login_device TEXT',
            'password_reset_token VARCHAR(255)',
            'password_reset_expires TIMESTAMP',
            'permissions TEXT'
        ];
        
        for (const col of userColumns) {
            try {
                await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`);
                results.push(`✅ Users: Added ${col.split(' ')[0]}`);
            } catch (err) {
                results.push(`⚠️ Users: ${err.message}`);
            }
        }
        
        // Fix bookings table
        const bookingColumns = [
            'is_historical BOOLEAN DEFAULT FALSE',
            'created_by_admin_id INTEGER'
        ];
        
        for (const col of bookingColumns) {
            try {
                await sequelize.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ${col}`);
                results.push(`✅ Bookings: Added ${col.split(' ')[0]}`);
            } catch (err) {
                results.push(`⚠️ Bookings: ${err.message}`);
            }
        }
        
        // Fix rooms table
        try {
            await sequelize.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS notes TEXT`);
            results.push(`✅ Rooms: Added notes`);
        } catch (err) {
            results.push(`⚠️ Rooms: ${err.message}`);
        }
        
        // Fix guests table
        try {
            await sequelize.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 0`);
            results.push(`✅ Guests: Added total_stays`);
        } catch (err) {
            results.push(`⚠️ Guests: ${err.message}`);
        }
        
        try {
            await sequelize.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0`);
            results.push(`✅ Guests: Added total_spent`);
        } catch (err) {
            results.push(`⚠️ Guests: ${err.message}`);
        }
        
        try {
            await sequelize.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE`);
            results.push(`✅ Guests: Added is_blacklisted`);
        } catch (err) {
            results.push(`⚠️ Guests: ${err.message}`);
        }
        
        res.send(`
            <html><body style="padding:20px;font-family:monospace;">
            <h1>🔧 Fix All Tables Results</h1>
            <pre>${results.join('\n')}</pre>
            <hr>
            <p><a href="/create-amenities">Create Amenities</a></p>
            <p><a href="/admin/login">Go to Admin Login</a></p>
            </body></html>
        `);
    } catch (error) {
        res.send(`Error: ${error.message}`);
    }
});

// Create amenities
app.get('/create-amenities', async (req, res) => {
    try {
        const { Amenity } = require('./models');
        const count = await Amenity.count();
        
        if (count > 0) {
            return res.json({ message: `Amenities already exist (${count} amenities)` });
        }
        
        const amenities = await Amenity.bulkCreate([
            { name: 'High Speed WiFi', slug: 'wifi', category: 'free', description: 'Free high-speed WiFi throughout the hotel', short_description: 'Free WiFi', icon: 'fas fa-wifi', is_active: true, display_order: 1 },
            { name: 'Fitness Center', slug: 'fitness', category: 'free', description: 'Modern gym with premium equipment', short_description: 'Fitness Center', icon: 'fas fa-dumbbell', is_active: true, display_order: 2 },
            { name: 'Swimming Pool', slug: 'pool', category: 'free', description: 'Outdoor pool with cabanas', short_description: 'Swimming Pool', icon: 'fas fa-swimming-pool', is_active: true, display_order: 3 },
            { name: 'Restaurant & Bar', slug: 'restaurant', category: 'paid', description: 'Fine dining with international cuisine', short_description: 'Restaurant', icon: 'fas fa-utensils', is_active: true, display_order: 4 },
            { name: 'Spa & Wellness', slug: 'spa', category: 'paid', description: 'Luxury spa treatments', short_description: 'Spa', icon: 'fas fa-spa', is_active: true, display_order: 5 },
            { name: 'Parking', slug: 'parking', category: 'paid', description: 'Secure parking with valet', short_description: 'Parking', icon: 'fas fa-parking', is_active: true, display_order: 6 },
            { name: 'Business Center', slug: 'business-center', category: 'paid', description: 'Meeting rooms and business services', short_description: 'Business Center', icon: 'fas fa-business-time', is_active: true, display_order: 7 },
            { name: 'Concierge Service', slug: 'concierge', category: 'request', description: '24/7 personalized concierge service', short_description: 'Concierge', icon: 'fas fa-concierge-bell', is_active: true, display_order: 8 }
        ]);
        
        res.json({ success: true, message: `${amenities.length} amenities created` });
    } catch (error) {
        res.json({ error: error.message });
    }
});
// Create menu categories and items
app.get('/create-menu', async (req, res) => {
    try {
        const { MenuCategory, MenuItem, Amenity } = require('./models');
        const results = [];
        
        // Get restaurant amenity
        const restaurant = await Amenity.findOne({ where: { slug: 'restaurant' } });
        const spa = await Amenity.findOne({ where: { slug: 'spa' } });
        
        if (!restaurant) {
            return res.json({ error: 'Restaurant amenity not found. Run /create-amenities first.' });
        }
        
        // Check if menu categories already exist
        const categoryCount = await MenuCategory.count();
        if (categoryCount > 0) {
            return res.json({ message: `Menu categories already exist (${categoryCount} categories)` });
        }
        
        // Create Menu Categories for Restaurant
        const categories = await MenuCategory.bulkCreate([
            { amenity_id: restaurant.id, name: 'Breakfast', display_order: 1, is_active: true },
            { amenity_id: restaurant.id, name: 'Lunch', display_order: 2, is_active: true },
            { amenity_id: restaurant.id, name: 'Dinner', display_order: 3, is_active: true },
            { amenity_id: restaurant.id, name: 'Beverages', display_order: 4, is_active: true },
            { amenity_id: restaurant.id, name: 'Desserts', display_order: 5, is_active: true }
        ]);
        results.push(`✅ Created ${categories.length} menu categories`);
        
        // Get category IDs
        const breakfast = categories.find(c => c.name === 'Breakfast');
        const lunch = categories.find(c => c.name === 'Lunch');
        const dinner = categories.find(c => c.name === 'Dinner');
        const beverages = categories.find(c => c.name === 'Beverages');
        const desserts = categories.find(c => c.name === 'Desserts');
        
        // Create Menu Items
        const menuItems = [];
        
        // Breakfast items
        menuItems.push({ category_id: breakfast.id, name: 'Continental Breakfast', description: 'Fresh pastries, fruits, yogurt, and coffee', price: 15.99, is_available: true, display_order: 1 });
        menuItems.push({ category_id: breakfast.id, name: 'American Breakfast', description: 'Eggs, bacon, sausage, toast, and hash browns', price: 22.99, is_available: true, display_order: 2 });
        menuItems.push({ category_id: breakfast.id, name: 'Eggs Benedict', description: 'Poached eggs, ham, hollandaise on English muffin', price: 19.99, is_available: true, display_order: 3 });
        
        // Lunch items
        menuItems.push({ category_id: lunch.id, name: 'Caesar Salad', description: 'Romaine lettuce, parmesan, croutons, Caesar dressing', price: 14.99, is_available: true, display_order: 1 });
        menuItems.push({ category_id: lunch.id, name: 'Club Sandwich', description: 'Triple-decker with turkey, bacon, lettuce, tomato', price: 16.99, is_available: true, display_order: 2 });
        menuItems.push({ category_id: lunch.id, name: 'Grilled Salmon', description: 'Fresh salmon with seasonal vegetables', price: 28.99, is_available: true, display_order: 3 });
        
        // Dinner items
        menuItems.push({ category_id: dinner.id, name: 'Ribeye Steak', description: '12oz ribeye with mashed potatoes and vegetables', price: 42.99, is_available: true, display_order: 1 });
        menuItems.push({ category_id: dinner.id, name: 'Lobster Tail', description: 'Grilled lobster tail with drawn butter', price: 49.99, is_available: true, display_order: 2 });
        menuItems.push({ category_id: dinner.id, name: 'Lamb Chops', description: 'Grilled lamb chops with rosemary sauce', price: 38.99, is_available: true, display_order: 3 });
        
        // Beverages
        menuItems.push({ category_id: beverages.id, name: 'Fresh Orange Juice', description: 'Freshly squeezed', price: 5.99, is_available: true, display_order: 1 });
        menuItems.push({ category_id: beverages.id, name: 'Soft Drinks', description: 'Coke, Sprite, Fanta', price: 3.99, is_available: true, display_order: 2 });
        menuItems.push({ category_id: beverages.id, name: 'Cappuccino', description: 'Rich espresso with steamed milk', price: 4.99, is_available: true, display_order: 3 });
        menuItems.push({ category_id: beverages.id, name: 'House Wine', description: 'Red or white', price: 8.99, is_available: true, display_order: 4 });
        
        // Desserts
        menuItems.push({ category_id: desserts.id, name: 'New York Cheesecake', description: 'Classic cheesecake with berry sauce', price: 9.99, is_available: true, display_order: 1 });
        menuItems.push({ category_id: desserts.id, name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 10.99, is_available: true, display_order: 2 });
        menuItems.push({ category_id: desserts.id, name: 'Tiramisu', description: 'Italian coffee-flavored dessert', price: 8.99, is_available: true, display_order: 3 });
        
        await MenuItem.bulkCreate(menuItems);
        results.push(`✅ Created ${menuItems.length} menu items`);
        
        // Create Spa category if spa exists
        if (spa) {
            const spaCategory = await MenuCategory.create({
                amenity_id: spa.id,
                name: 'Spa Treatments',
                display_order: 10,
                is_active: true
            });
            results.push(`✅ Created Spa category`);
            
            const spaItems = [
                { category_id: spaCategory.id, name: 'Swedish Massage', description: 'Relaxing full-body massage', price: 89.99, duration_minutes: 60, requires_appointment: true, is_available: true, display_order: 1 },
                { category_id: spaCategory.id, name: 'Deep Tissue Massage', description: 'Intense muscle relief', price: 109.99, duration_minutes: 60, requires_appointment: true, is_available: true, display_order: 2 },
                { category_id: spaCategory.id, name: 'Hot Stone Massage', description: 'Warm stones for deep relaxation', price: 129.99, duration_minutes: 75, requires_appointment: true, is_available: true, display_order: 3 },
                { category_id: spaCategory.id, name: 'Facial Treatment', description: 'Deep cleansing and hydration', price: 79.99, duration_minutes: 45, requires_appointment: true, is_available: true, display_order: 4 },
                { category_id: spaCategory.id, name: 'Couples Massage', description: 'Massage for two in a private room', price: 199.99, duration_minutes: 60, requires_appointment: true, is_available: true, display_order: 5 }
            ];
            
            await MenuItem.bulkCreate(spaItems);
            results.push(`✅ Created ${spaItems.length} spa menu items`);
        }
        
        res.json({ success: true, results });
    } catch (error) {
        res.json({ error: error.message });
    }
});
// Add parking and business center menus
app.get('/add-parking-business', async (req, res) => {
    try {
        const { MenuCategory, MenuItem, Amenity } = require('./models');
        const results = [];
        
        // Get amenities
        const parking = await Amenity.findOne({ where: { slug: 'parking' } });
        const business = await Amenity.findOne({ where: { slug: 'business-center' } });
        
        if (!parking) {
            results.push('❌ Parking amenity not found');
        }
        if (!business) {
            results.push('❌ Business Center amenity not found');
        }
        
        // Create Parking category if parking exists
        if (parking) {
            let parkingCategory = await MenuCategory.findOne({ 
                where: { amenity_id: parking.id, name: 'Parking Options' }
            });
            
            if (!parkingCategory) {
                parkingCategory = await MenuCategory.create({
                    amenity_id: parking.id,
                    name: 'Parking Options',
                    display_order: 1,
                    is_active: true
                });
                results.push('✅ Created Parking Options category');
            } else {
                results.push('⚠️ Parking Options category already exists');
            }
            
            // Check if parking items already exist
            const existingItems = await MenuItem.count({ where: { category_id: parkingCategory.id } });
            
            if (existingItems === 0) {
                const parkingItems = [
                    { category_id: parkingCategory.id, name: 'Self Parking - Daily', description: 'Self-parking for 24 hours', price: 15.00, is_available: true, display_order: 1 },
                    { category_id: parkingCategory.id, name: 'Valet Parking - Daily', description: 'Valet parking service for 24 hours', price: 25.00, is_available: true, display_order: 2 },
                    { category_id: parkingCategory.id, name: 'Electric Vehicle Charging', description: 'EV charging station access', price: 10.00, is_available: true, display_order: 3 },
                    { category_id: parkingCategory.id, name: 'Weekly Parking Pass', description: '7 days of parking access', price: 80.00, is_available: true, display_order: 4 }
                ];
                await MenuItem.bulkCreate(parkingItems);
                results.push(`✅ Added ${parkingItems.length} parking options`);
            } else {
                results.push(`⚠️ Parking items already exist (${existingItems} items)`);
            }
        }
        
        // Create Business Center category if business exists
        if (business) {
            let businessCategory = await MenuCategory.findOne({ 
                where: { amenity_id: business.id, name: 'Business Services' }
            });
            
            if (!businessCategory) {
                businessCategory = await MenuCategory.create({
                    amenity_id: business.id,
                    name: 'Business Services',
                    display_order: 1,
                    is_active: true
                });
                results.push('✅ Created Business Services category');
            } else {
                results.push('⚠️ Business Services category already exists');
            }
            
            // Check if business items already exist
            const existingItems = await MenuItem.count({ where: { category_id: businessCategory.id } });
            
            if (existingItems === 0) {
                const businessItems = [
                    { category_id: businessCategory.id, name: 'Meeting Room - Small', description: 'Small meeting room for up to 6 people', price: 150.00, duration_minutes: 120, requires_appointment: true, is_available: true, display_order: 1 },
                    { category_id: businessCategory.id, name: 'Meeting Room - Large', description: 'Large meeting room for up to 20 people', price: 300.00, duration_minutes: 240, requires_appointment: true, is_available: true, display_order: 2 },
                    { category_id: businessCategory.id, name: 'Secretarial Services', description: 'Printing, scanning, copying, and document preparation', price: 50.00, duration_minutes: 60, requires_appointment: true, is_available: true, display_order: 3 },
                    { category_id: businessCategory.id, name: 'Video Conferencing', description: 'Professional video conferencing setup', price: 75.00, duration_minutes: 60, requires_appointment: true, is_available: true, display_order: 4 },
                    { category_id: businessCategory.id, name: 'Workstation Rental', description: 'Private desk with monitor and high-speed internet', price: 35.00, duration_minutes: 240, requires_appointment: true, is_available: true, display_order: 5 }
                ];
                await MenuItem.bulkCreate(businessItems);
                results.push(`✅ Added ${businessItems.length} business services`);
            } else {
                results.push(`⚠️ Business items already exist (${existingItems} items)`);
            }
        }
        
        res.json({ success: true, results });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Debug amenities
app.get('/debug-amenities', async (req, res) => {
    try {
        const { Amenity } = require('./models');
        const amenities = await Amenity.findAll();
        res.json({ count: amenities.length, amenities });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Fix admin password
app.get('/fix-admin-password', async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const { sequelize } = require('./config/database');
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        
        await sequelize.query(
            `UPDATE users SET password = :password, role = 'super_admin' WHERE email = 'admin@mansionhotel.com'`,
            { replacements: { password: hashedPassword } }
        );
        
        res.json({ success: true, message: 'Admin password reset', password: 'Admin123!' });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Check admin
app.get('/check-admin', async (req, res) => {
    try {
        const { User } = require('./models');
        const admin = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        res.json({ exists: !!admin, email: admin?.email, has_password: !!admin?.password });
    } catch (error) {
        res.json({ error: error.message });
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
        
        server.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin/login`);
            console.log(`🔧 Fix URLs:`);
            console.log(`   http://localhost:${PORT}/fix-all-tables`);
            console.log(`   http://localhost:${PORT}/create-amenities`);
            console.log(`   http://localhost:${PORT}/fix-admin-password`);
        });
    } catch (error) {
        console.error('Failed to start:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server };