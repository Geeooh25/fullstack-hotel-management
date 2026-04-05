'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('room_types', [
            {
                name: 'Deluxe Ocean View',
                description: 'Luxurious room with stunning ocean views, king-size bed, and private balcony. Perfect for couples seeking a romantic getaway.',
                capacity: 2,
                base_price: 299.00,
                amenities: ['Free WiFi', 'Flat-screen TV', 'Mini Bar', 'Air Conditioning', 'Ocean View Balcony', 'King Bed', 'Rain Shower'],
                images: ['/images/rooms/deluxe-ocean.jpg'],
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: 'Executive Suite',
                description: 'Spacious suite with separate living area, perfect for business travelers or families. Includes work desk and premium amenities.',
                capacity: 4,
                base_price: 399.00,
                amenities: ['Free WiFi', '65" Smart TV', 'Mini Bar', 'Air Conditioning', 'Living Room', 'Work Desk', 'Jacuzzi Tub'],
                images: ['/images/rooms/executive-suite.jpg'],
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: 'Standard Room',
                description: 'Comfortable and cozy room with all essential amenities. Perfect for solo travelers or business trips.',
                capacity: 2,
                base_price: 159.00,
                amenities: ['Free WiFi', '42" TV', 'Air Conditioning', 'Queen Bed', 'Work Desk'],
                images: ['/images/rooms/standard.jpg'],
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: 'Family Suite',
                description: 'Large suite designed for families, with two bedrooms and a shared living area. Includes kids amenities.',
                capacity: 6,
                base_price: 499.00,
                amenities: ['Free WiFi', 'Two TVs', 'Mini Bar', 'Air Conditioning', 'Two Bedrooms', 'Living Room', 'Kitchenette', 'Kids Play Area'],
                images: ['/images/rooms/family-suite.jpg'],
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: 'Presidential Suite',
                description: 'Our most luxurious offering with panoramic views, private butler service, and premium amenities throughout.',
                capacity: 4,
                base_price: 899.00,
                amenities: ['Free WiFi', '85" Smart TV', 'Premium Mini Bar', 'Air Conditioning', 'Private Butler', 'Jacuzzi', 'Private Terrace', 'Dining Area'],
                images: ['/images/rooms/presidential.jpg'],
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('room_types', null, {});
    }
};