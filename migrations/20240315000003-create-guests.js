'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('guests', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            first_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            last_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            email: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            phone: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            address: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            city: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            country: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            id_type: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            id_number: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            total_stays: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            total_spent: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            is_blacklisted: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
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
        
        // Add index for email lookups
        await queryInterface.addIndex('guests', ['email']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('guests');
    }
};