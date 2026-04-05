'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('guests', [
            {
                first_name: 'John',
                last_name: 'Smith',
                email: 'john.smith@email.com',
                phone: '+1 (555) 123-4567',
                address: '123 Main Street',
                city: 'Los Angeles',
                country: 'USA',
                total_stays: 3,
                total_spent: 897.00,
                is_blacklisted: false,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                first_name: 'Emily',
                last_name: 'Johnson',
                email: 'emily.j@email.com',
                phone: '+1 (555) 234-5678',
                address: '456 Oak Avenue',
                city: 'Beverly Hills',
                country: 'USA',
                total_stays: 1,
                total_spent: 299.00,
                is_blacklisted: false,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                first_name: 'Michael',
                last_name: 'Brown',
                email: 'michael.b@email.com',
                phone: '+1 (555) 345-6789',
                address: '789 Pine Street',
                city: 'Santa Monica',
                country: 'USA',
                total_stays: 2,
                total_spent: 598.00,
                is_blacklisted: false,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                first_name: 'Sarah',
                last_name: 'Davis',
                email: 'sarah.davis@email.com',
                phone: '+1 (555) 456-7890',
                address: '321 Cedar Road',
                city: 'Malibu',
                country: 'USA',
                total_stays: 1,
                total_spent: 399.00,
                is_blacklisted: false,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                first_name: 'David',
                last_name: 'Wilson',
                email: 'david.w@email.com',
                phone: '+1 (555) 567-8901',
                address: '654 Elm Street',
                city: 'Hollywood',
                country: 'USA',
                total_stays: 4,
                total_spent: 1196.00,
                is_blacklisted: false,
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('guests', null, {});
    }
};