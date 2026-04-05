'use strict';
const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        
        await queryInterface.bulkInsert('users', [
            {
                email: 'admin@mansionhotel.com',
                password_hash: hashedPassword,
                first_name: 'John',
                last_name: 'Admin',
                role: 'admin',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                email: 'reception@mansionhotel.com',
                password_hash: hashedPassword,
                first_name: 'Sarah',
                last_name: 'Reception',
                role: 'receptionist',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                email: 'housekeeping@mansionhotel.com',
                password_hash: hashedPassword,
                first_name: 'Mike',
                last_name: 'Clean',
                role: 'housekeeping',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('users', null, {});
    }
};