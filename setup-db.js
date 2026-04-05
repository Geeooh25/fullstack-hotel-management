const { sequelize } = require('./config/database');
const { User, RoomType, Room } = require('./models');
const bcrypt = require('bcrypt');

async function setupDatabase() {
    try {
        console.log('Setting up database...');
        
        // Sync all models (force: true will drop existing tables)
        await sequelize.sync({ force: true });
        console.log('✅ Database synced');
        
        // Create admin user
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        const admin = await User.create({
            email: 'admin@mansionhotel.com',
            password_hash: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_active: true
        });
        console.log('✅ Admin user created');
        
        // Create room types
        const standard = await RoomType.create({
            name: 'Standard Room',
            description: 'Comfortable room with all essential amenities. Perfect for business travelers and solo adventurers.',
            capacity: 2,
            base_price: 129,
            amenities: JSON.stringify(['Free WiFi', 'Flat-screen TV', 'Air Conditioning', 'Work Desk', 'Coffee Maker']),
            images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800']
        });
        console.log('✅ Standard Room type created');
        
        const deluxe = await RoomType.create({
            name: 'Deluxe Room',
            description: 'Spacious room with premium amenities and city view. Ideal for couples seeking extra comfort.',
            capacity: 2,
            base_price: 199,
            amenities: JSON.stringify(['Free WiFi', '55" Smart TV', 'Air Conditioning', 'Mini Bar', 'City View', 'King Bed']),
            images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800']
        });
        console.log('✅ Deluxe Room type created');
        
        const executive = await RoomType.create({
            name: 'Executive Suite',
            description: 'Luxurious suite with separate living area and panoramic views. Perfect for business executives.',
            capacity: 4,
            base_price: 299,
            amenities: JSON.stringify(['Free WiFi', '65" Smart TV', 'Air Conditioning', 'Mini Bar', 'Living Room', 'Jacuzzi', 'Work Desk']),
            images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800']
        });
        console.log('✅ Executive Suite type created');
        
        // Create rooms
        // Standard rooms (101-110)
        for (let i = 101; i <= 110; i++) {
            await Room.create({
                room_number: i.toString(),
                room_type_id: standard.id,
                floor: 1,
                status: 'available'
            });
        }
        console.log('✅ 10 Standard rooms created');
        
        // Deluxe rooms (201-208)
        for (let i = 201; i <= 208; i++) {
            await Room.create({
                room_number: i.toString(),
                room_type_id: deluxe.id,
                floor: 2,
                status: 'available'
            });
        }
        console.log('✅ 8 Deluxe rooms created');
        
        // Executive suites (301-304)
        for (let i = 301; i <= 304; i++) {
            await Room.create({
                room_number: i.toString(),
                room_type_id: executive.id,
                floor: 3,
                status: 'available'
            });
        }
        console.log('✅ 4 Executive suites created');
        
        console.log('\n🎉 Database setup complete!');
        console.log(`📊 Total Rooms: ${await Room.count()}`);
        console.log('\n🔑 Admin Login:');
        console.log('   Email: admin@mansionhotel.com');
        console.log('   Password: Admin123!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();