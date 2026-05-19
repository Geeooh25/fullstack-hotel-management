const { sequelize } = require('../config/database');
const { User, Amenity, RoomType, Room, Booking, Guest, Payment } = require('../models');
const bcrypt = require('bcrypt');

async function setupDatabase() {
    console.log('🔧 Setting up database...\n');
    
    try {
        // Don't sync with alter - just check and create missing tables
        await sequelize.sync({ alter: false });
        console.log('✅ Database tables verified');
        
        // Add missing columns to users table if needed (for PostgreSQL/SQLite compatibility)
        const columnsToAdd = [
            { name: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
            { name: 'locked_until', type: 'TIMESTAMP' },
            { name: 'last_login_ip', type: 'VARCHAR(45)' },
            { name: 'last_login_device', type: 'TEXT' },
            { name: 'password_reset_token', type: 'VARCHAR(255)' },
            { name: 'password_reset_expires', type: 'TIMESTAMP' }
        ];
        
        for (const col of columnsToAdd) {
            try {
                await sequelize.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added column: ${col.name}`);
            } catch (err) {
                // Column likely already exists
                if (!err.message.includes('duplicate column')) {
                    console.log(`⚠️ Could not add ${col.name}: ${err.message}`);
                }
            }
        }
        
        // Check if admin exists
        let admin = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        if (!admin) {
            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            admin = await User.create({
                email: 'admin@mansionhotel.com',
                password: hashedPassword,
                first_name: 'Admin',
                last_name: 'User',
                role: 'super_admin',
                is_active: true,
                status: 'active'
            });
            console.log('✅ Admin user created');
        } else {
            console.log('✅ Admin user already exists');
        }
        
        // Check if amenities exist
        const amenityCount = await Amenity.count();
        if (amenityCount === 0) {
            await Amenity.bulkCreate([
                { name: 'High Speed WiFi', slug: 'wifi', category: 'free', description: 'Free high-speed WiFi throughout the hotel', short_description: 'Free WiFi', icon: 'fas fa-wifi', is_active: true, display_order: 1 },
                { name: 'Fitness Center', slug: 'fitness', category: 'free', description: 'Modern gym with premium equipment', short_description: 'Fitness Center', icon: 'fas fa-dumbbell', is_active: true, display_order: 2 },
                { name: 'Swimming Pool', slug: 'pool', category: 'free', description: 'Outdoor pool with cabanas', short_description: 'Swimming Pool', icon: 'fas fa-swimming-pool', is_active: true, display_order: 3 },
                { name: 'Restaurant & Bar', slug: 'restaurant', category: 'paid', description: 'Fine dining with international cuisine', short_description: 'Restaurant', icon: 'fas fa-utensils', is_active: true, display_order: 4 },
                { name: 'Spa & Wellness', slug: 'spa', category: 'paid', description: 'Luxury spa treatments', short_description: 'Spa', icon: 'fas fa-spa', is_active: true, display_order: 5 },
                { name: 'Parking', slug: 'parking', category: 'paid', description: 'Secure parking with valet', short_description: 'Parking', icon: 'fas fa-parking', is_active: true, display_order: 6 },
                { name: 'Business Center', slug: 'business-center', category: 'paid', description: 'Meeting rooms and business services', short_description: 'Business Center', icon: 'fas fa-business-time', is_active: true, display_order: 7 },
                { name: 'Concierge Service', slug: 'concierge', category: 'request', description: '24/7 personalized concierge service', short_description: 'Concierge', icon: 'fas fa-concierge-bell', is_active: true, display_order: 8 }
            ]);
            console.log('✅ Default amenities created');
        } else {
            console.log('✅ Amenities already exist');
        }
        
        // Check if room types exist
        const roomTypeCount = await RoomType.count();
        if (roomTypeCount === 0) {
            await RoomType.bulkCreate([
                { name: 'Standard Room', capacity: 2, base_price: 129.99, is_active: true },
                { name: 'Deluxe Room', capacity: 2, base_price: 199.99, is_active: true },
                { name: 'Executive Suite', capacity: 4, base_price: 299.99, is_active: true }
            ]);
            console.log('✅ Room types created');
        } else {
            console.log('✅ Room types already exist');
        }
        
        // Check if rooms exist
        const roomCount = await Room.count();
        if (roomCount === 0) {
            const standard = await RoomType.findOne({ where: { name: 'Standard Room' } });
            const deluxe = await RoomType.findOne({ where: { name: 'Deluxe Room' } });
            const suite = await RoomType.findOne({ where: { name: 'Executive Suite' } });
            
            const rooms = [];
            if (standard) {
                for (let i = 101; i <= 110; i++) rooms.push({ room_number: i.toString(), room_type_id: standard.id, floor: 1, status: 'available' });
            }
            if (deluxe) {
                for (let i = 201; i <= 208; i++) rooms.push({ room_number: i.toString(), room_type_id: deluxe.id, floor: 2, status: 'available' });
            }
            if (suite) {
                for (let i = 301; i <= 304; i++) rooms.push({ room_number: i.toString(), room_type_id: suite.id, floor: 3, status: 'available' });
            }
            
            if (rooms.length > 0) {
                await Room.bulkCreate(rooms);
                console.log('✅ Sample rooms created');
            }
        } else {
            console.log('✅ Rooms already exist');
        }
        
        console.log('\n🎉 Database setup complete!');
        console.log('========================================');
        console.log('🔑 Admin Login:');
        console.log('   Email: admin@mansionhotel.com');
        console.log('   Password: Admin123!');
        console.log('========================================\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup error:', error);
        process.exit(1);
    }
}

setupDatabase();