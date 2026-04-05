'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('room_types', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            capacity: {
                type: Sequelize.INTEGER,
                defaultValue: 2,
                allowNull: false
            },
            base_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            amenities: {
                type: Sequelize.ARRAY(Sequelize.STRING),
                defaultValue: []
            },
            images: {
                type: Sequelize.ARRAY(Sequelize.STRING),
                defaultValue: []
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
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
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('room_types');
    }
};