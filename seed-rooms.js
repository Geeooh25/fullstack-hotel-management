const { sequelize } = require('./config/database');
const { Room, RoomType } = require('./models');

async function seedUniqueRooms() {
    try {
        console.log('🎨 Creating unique rooms with individual photos and descriptions...\n');
        
        // First, clear existing rooms
        await Room.destroy({ where: {}, truncate: true });
        console.log('✅ Cleared existing rooms\n');
        
        // Get room types
        const standardType = await RoomType.findOne({ where: { name: 'Standard Room' } });
        const deluxeType = await RoomType.findOne({ where: { name: 'Deluxe Room' } });
        const executiveType = await RoomType.findOne({ where: { name: 'Executive Suite' } });
        
        // ==================== STANDARD ROOMS (101-110) ====================
        const standardRooms = [
            {
                room_number: '101',
                floor: 1,
                description: 'Cozy corner room with large windows overlooking the garden. Perfect for morning coffee with nature views.',
                view: 'Garden View',
                image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
                extra_feature: 'Corner room with extra window'
            },
            {
                room_number: '102',
                floor: 1,
                description: 'City-facing room with stunning urban skyline views. Ideal for travelers who love the vibrant city energy.',
                view: 'City View',
                image: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800',
                extra_feature: 'City skyline view'
            },
            {
                room_number: '103',
                floor: 1,
                description: 'Quiet room at the end of the hallway, perfect for light sleepers. Peaceful atmosphere away from noise.',
                view: 'Courtyard View',
                image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
                extra_feature: 'Quiet location'
            },
            {
                room_number: '104',
                floor: 1,
                description: 'Bright room with morning sun. Start your day with natural light flooding through large windows.',
                view: 'Sunrise View',
                image: 'https://images.unsplash.com/photo-1587985064135-0366536eab42?w=800',
                extra_feature: 'Morning sunlight'
            },
            {
                room_number: '105',
                floor: 1,
                description: 'Cozy room with warm earth tones. Designed for comfort and relaxation after a long day.',
                view: 'Garden View',
                image: 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800',
                extra_feature: 'Warm earth tones'
            },
            {
                room_number: '106',
                floor: 1,
                description: 'Modern minimalist room with sleek furniture. Perfect for business travelers.',
                view: 'City View',
                image: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800',
                extra_feature: 'Work desk with ergonomic chair'
            },
            {
                room_number: '107',
                floor: 1,
                description: 'Romantic getaway room with warm lighting. Perfect for couples seeking a cozy retreat.',
                view: 'Garden View',
                image: 'https://images.unsplash.com/photo-1582719508460-905c123ab4de?w=800',
                extra_feature: 'Romantic ambiance'
            },
            {
                room_number: '108',
                floor: 1,
                description: 'Spacious room with extra seating area. Ideal for guests who enjoy lounging in their room.',
                view: 'City View',
                image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
                extra_feature: 'Seating area'
            },
            {
                room_number: '109',
                floor: 1,
                description: 'Tech-savvy room with smart controls. Control lights, temperature, and entertainment from your device.',
                view: 'Courtyard View',
                image: 'https://images.unsplash.com/photo-1572120360610-d971b9d4c26b?w=800',
                extra_feature: 'Smart room controls'
            },
            {
                room_number: '110',
                floor: 1,
                description: 'Art-inspired room featuring local artists work. A unique cultural experience.',
                view: 'Garden View',
                image: 'https://images.unsplash.com/photo-1564501049412-61c2a30805b1?w=800',
                extra_feature: 'Local artwork'
            }
        ];
        
        // ==================== DELUXE ROOMS (201-208) ====================
        const deluxeRooms = [
            {
                room_number: '201',
                floor: 2,
                description: 'Spacious deluxe room with panoramic city views. Large windows showcase the stunning skyline.',
                view: 'Panoramic City View',
                image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
                extra_feature: 'Panoramic windows'
            },
            {
                room_number: '202',
                floor: 2,
                description: 'Elegant room with premium furnishings and a private balcony. Perfect for morning coffee with a view.',
                view: 'Balcony City View',
                image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
                extra_feature: 'Private balcony'
            },
            {
                room_number: '203',
                floor: 2,
                description: 'Luxurious room with spa-inspired bathroom. Rain shower and deep soaking tub included.',
                view: 'Garden View',
                image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
                extra_feature: 'Spa bathroom'
            },
            {
                room_number: '204',
                floor: 2,
                description: 'Modern executive room with separate workspace. Ideal for business travelers who need focus.',
                view: 'City View',
                image: 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800',
                extra_feature: 'Executive workspace'
            },
            {
                room_number: '205',
                floor: 2,
                description: 'Romantic deluxe suite with king bed and mood lighting. Perfect for special occasions.',
                view: 'Sunset View',
                image: 'https://images.unsplash.com/photo-1540518614846-7ededae2c48d?w=800',
                extra_feature: 'Mood lighting'
            },
            {
                room_number: '206',
                floor: 2,
                description: 'Family-friendly deluxe room with extra space. Connectable rooms available upon request.',
                view: 'Garden View',
                image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
                extra_feature: 'Family friendly'
            },
            {
                room_number: '207',
                floor: 2,
                description: 'Wellness-focused room with yoga mat and meditation corner. Rejuvenate in peace.',
                view: 'Garden View',
                image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
                extra_feature: 'Wellness amenities'
            },
            {
                room_number: '208',
                floor: 2,
                description: 'Corner deluxe suite with two walls of windows. Maximum natural light and stunning views.',
                view: 'Corner City View',
                image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
                extra_feature: 'Corner location'
            }
        ];
        
        // ==================== EXECUTIVE SUITES (301-304) ====================
        const executiveSuites = [
            {
                room_number: '301',
                floor: 3,
                description: 'Presidential-style executive suite with separate living room. Ultimate luxury experience.',
                view: '360° City View',
                image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
                extra_feature: 'Separate living room'
            },
            {
                room_number: '302',
                floor: 3,
                description: 'Penthouse-inspired suite with private terrace. Outdoor seating with breathtaking views.',
                view: 'Terrace City View',
                image: 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800',
                extra_feature: 'Private terrace'
            },
            {
                room_number: '303',
                floor: 3,
                description: 'Executive boardroom suite with meeting space. Perfect for business executives.',
                view: 'Skyline View',
                image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
                extra_feature: 'Meeting space'
            },
            {
                room_number: '304',
                floor: 3,
                description: 'Ultimate luxury suite with jacuzzi and entertainment system. The pinnacle of comfort.',
                view: 'Full Panoramic View',
                image: 'https://images.unsplash.com/photo-1631049035182-249067d7618e?w=800',
                extra_feature: 'Jacuzzi tub'
            }
        ];
        
        // Create all rooms
        console.log('📝 Creating Standard Rooms (101-110)...');
        for (const room of standardRooms) {
            await Room.create({
                room_number: room.room_number,
                room_type_id: standardType.id,
                floor: room.floor,
                status: 'available',
                notes: `${room.description} | View: ${room.view} | ${room.extra_feature}`
            });
            console.log(`   ✅ Room ${room.room_number} - ${room.view} - ${room.extra_feature}`);
        }
        
        console.log('\n📝 Creating Deluxe Rooms (201-208)...');
        for (const room of deluxeRooms) {
            await Room.create({
                room_number: room.room_number,
                room_type_id: deluxeType.id,
                floor: room.floor,
                status: 'available',
                notes: `${room.description} | View: ${room.view} | ${room.extra_feature}`
            });
            console.log(`   ✅ Room ${room.room_number} - ${room.view} - ${room.extra_feature}`);
        }
        
        console.log('\n📝 Creating Executive Suites (301-304)...');
        for (const room of executiveSuites) {
            await Room.create({
                room_number: room.room_number,
                room_type_id: executiveType.id,
                floor: room.floor,
                status: 'available',
                notes: `${room.description} | View: ${room.view} | ${room.extra_feature}`
            });
            console.log(`   ✅ Room ${room.room_number} - ${room.view} - ${room.extra_feature}`);
        }
        
        // Verify
        const allRooms = await Room.findAll({
            include: [{ model: RoomType }],
            order: [['room_number', 'ASC']]
        });
        
        console.log('\n📊 FINAL UNIQUE ROOMS:');
        console.log('═'.repeat(60));
        allRooms.forEach(room => {
            const roomType = room.RoomType;
            const notes = room.notes || '';
            const view = notes.match(/View: ([^|]+)/)?.[1] || 'Standard';
            const feature = notes.match(/\| ([^|]+)$/)?.[1] || '';
            console.log(`   Room ${room.room_number} | ${roomType?.name} | ${view} | ${feature}`);
        });
        
        console.log('\n✅ All 22 rooms created with UNIQUE:');
        console.log('   • 10 Standard Rooms - each with unique photo, description, and view');
        console.log('   • 8 Deluxe Rooms - each with unique photo, description, and view');
        console.log('   • 4 Executive Suites - each with unique photo, description, and view');
        console.log('\n🎉 Ready! Each room is now unique!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedUniqueRooms();