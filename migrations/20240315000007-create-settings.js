'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('settings', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            key: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true
            },
            value: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            type: {
                type: Sequelize.STRING(50),
                defaultValue: 'string'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
        
        // Insert default settings
        await queryInterface.bulkInsert('settings', [
            { key: 'hotel_name', value: 'Mansion Hotel', type: 'string' },
            { key: 'hotel_phone', value: '+1 (555) 123-4567', type: 'string' },
            { key: 'hotel_email', value: 'info@mansionhotel.com', type: 'string' },
            { key: 'hotel_address', value: '123 Luxury Avenue, Beverly Hills, CA 90210', type: 'string' },
            { key: 'tax_rate', value: '12.5', type: 'decimal' },
            { key: 'currency', value: 'USD', type: 'string' },
            { key: 'check_in_time', value: '15:00', type: 'string' },
            { key: 'check_out_time', value: '11:00', type: 'string' }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('settings');
    }
};