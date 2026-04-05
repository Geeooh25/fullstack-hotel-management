const { sequelize } = require('./config/database');
const { Room, RoomType } = require('./models');

async function fixRooms() {
    try {
        console.log('🔧 Fixing room types...\n');
        
        // Get all room types
        const roomTypes = await RoomType.findAll();
        console.log('Room Types found:');
        roomTypes.forEach(t => {
            console.log(`   ID ${t.id}: ${t.name} - $${t.base_price}`);
        });
        
        // Find the correct IDs
        const standardType = roomTypes.find(t => t.name === 'Standard Room');
        const deluxeType = roomTypes.find(t => t.name === 'Deluxe Room');
        const executiveType = roomTypes.find(t => t.name === 'Executive Suite');
        
        if (!standardType || !deluxeType || !executiveType) {
            console.log('❌ Missing room types! Run setup-db.js first.');
            process.exit(1);
        }
        
        console.log('\n📝 Updating rooms...');
        
        // Update standard rooms (101-110)
        let count = 0;
        for (let i = 101; i <= 110; i++) {
            await Room.update(
                { room_type_id: standardType.id },
                { where: { room_number: i.toString() } }
            );
            count++;
        }
        console.log(`   ✅ Updated ${count} rooms to Standard (ID: ${standardType.id}) - Rooms 101-110`);
        
        // Update deluxe rooms (201-208)
        count = 0;
        for (let i = 201; i <= 208; i++) {
            await Room.update(
                { room_type_id: deluxeType.id },
                { where: { room_number: i.toString() } }
            );
            count++;
        }
        console.log(`   ✅ Updated ${count} rooms to Deluxe (ID: ${deluxeType.id}) - Rooms 201-208`);
        
        // Update executive suites (301-304)
        count = 0;
        for (let i = 301; i <= 304; i++) {
            await Room.update(
                { room_type_id: executiveType.id },
                { where: { room_number: i.toString() } }
            );
            count++;
        }
        console.log(`   ✅ Updated ${count} rooms to Executive (ID: ${executiveType.id}) - Rooms 301-304`);
        
        // Verify the fix
        console.log('\n🔍 Verifying fix...');
        const updatedRooms = await Room.findAll({
            include: [{ model: RoomType }],
            order: [['room_number', 'ASC']]
        });
        
        console.log('\n📊 Final Room List:');
        let standardCount = 0, deluxeCount = 0, executiveCount = 0;
        updatedRooms.forEach(room => {
            const roomType = room.RoomType;
            if (roomType) {
                if (roomType.name === 'Standard Room') standardCount++;
                if (roomType.name === 'Deluxe Room') deluxeCount++;
                if (roomType.name === 'Executive Suite') executiveCount++;
            }
            console.log(`   Room ${room.room_number} - ${roomType ? roomType.name : 'NO TYPE'} - $${roomType ? roomType.base_price : 0}`);
        });
        
        console.log('\n✅ Fix complete!');
        console.log(`   Standard Rooms: ${standardCount}`);
        console.log(`   Deluxe Rooms: ${deluxeCount}`);
        console.log(`   Executive Suites: ${executiveCount}`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixRooms();