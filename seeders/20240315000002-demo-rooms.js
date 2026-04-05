'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // First get room type IDs
        const roomTypes = await queryInterface.sequelize.query(
            `SELECT id, name FROM room_types;`
        );
        
        const typeMap = {};
        roomTypes[0].forEach(type => {
            typeMap[type.name] = type.id;
        });
        
        await queryInterface.bulkInsert('rooms', [
            // Deluxe Ocean View Rooms (4 rooms)
            { room_number: '301', room_type_id: typeMap['Deluxe Ocean View'], floor: 3, status: 'available', notes: 'Best ocean view', created_at: new Date(), updated_at: new Date() },
            { room_number: '302', room_type_id: typeMap['Deluxe Ocean View'], floor: 3, status: 'available', notes: 'Corner room with extra window', created_at: new Date(), updated_at: new Date() },
            { room_number: '303', room_type_id: typeMap['Deluxe Ocean View'], floor: 3, status: 'available', notes: 'Quiet end of hallway', created_at: new Date(), updated_at: new Date() },
            { room_number: '304', room_type_id: typeMap['Deluxe Ocean View'], floor: 3, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            
            // Executive Suites (3 rooms)
            { room_number: '401', room_type_id: typeMap['Executive Suite'], floor: 4, status: 'available', notes: 'Large corner suite', created_at: new Date(), updated_at: new Date() },
            { room_number: '402', room_type_id: typeMap['Executive Suite'], floor: 4, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            { room_number: '403', room_type_id: typeMap['Executive Suite'], floor: 4, status: 'available', notes: 'City view side', created_at: new Date(), updated_at: new Date() },
            
            // Standard Rooms (8 rooms)
            { room_number: '101', room_type_id: typeMap['Standard Room'], floor: 1, status: 'available', notes: 'Near lobby', created_at: new Date(), updated_at: new Date() },
            { room_number: '102', room_type_id: typeMap['Standard Room'], floor: 1, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            { room_number: '103', room_type_id: typeMap['Standard Room'], floor: 1, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            { room_number: '104', room_type_id: typeMap['Standard Room'], floor: 1, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            { room_number: '201', room_type_id: typeMap['Standard Room'], floor: 2, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            { room_number: '202', room_type_id: typeMap['Standard Room'], floor: 2, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            { room_number: '203', room_type_id: typeMap['Standard Room'], floor: 2, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            { room_number: '204', room_type_id: typeMap['Standard Room'], floor: 2, status: 'available', notes: '', created_at: new Date(), updated_at: new Date() },
            
            // Family Suites (2 rooms)
            { room_number: '501', room_type_id: typeMap['Family Suite'], floor: 5, status: 'available', notes: 'Great for families with kids', created_at: new Date(), updated_at: new Date() },
            { room_number: '502', room_type_id: typeMap['Family Suite'], floor: 5, status: 'available', notes: 'Extra space for crib', created_at: new Date(), updated_at: new Date() },
            
            // Presidential Suite (1 room)
            { room_number: '601', room_type_id: typeMap['Presidential Suite'], floor: 6, status: 'available', notes: 'VIP only - requires manager approval', created_at: new Date(), updated_at: new Date() }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('rooms', null, {});
    }
};