const { sequelize } = require('./config/database');
const { Room, RoomType } = require('./models');

async function checkDatabase() {
    try {
        console.log('Checking database...\n');
        
        // Get all room types
        const roomTypes = await RoomType.findAll();
        console.log('📋 Room Types:');
        roomTypes.forEach(t => {
            console.log(`   ID: ${t.id} - ${t.name} - $${t.base_price}`);
            console.log(`      Images: ${t.images}`);
        });
        
        console.log('\n📋 Rooms:');
        const rooms = await Room.findAll({
            include: [{ model: RoomType }],
            order: [['room_number', 'ASC']]
        });
        
        rooms.forEach(room => {
            const roomType = room.RoomType;
            console.log(`   Room ${room.room_number} - Type: ${roomType ? roomType.name : 'NO TYPE'} - Price: $${roomType ? roomType.base_price : 'N/A'}`);
        });
        
        console.log(`\n📊 Total: ${rooms.length} rooms, ${roomTypes.length} room types`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkDatabase();