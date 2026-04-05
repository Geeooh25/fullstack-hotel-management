'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('payments', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            booking_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'bookings',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            stripe_payment_intent_id: {
                type: Sequelize.STRING(255),
                allowNull: true,
                unique: true
            },
            amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            payment_method: {
                type: Sequelize.ENUM('card', 'cash', 'bank_transfer'),
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('pending', 'succeeded', 'failed', 'refunded'),
                defaultValue: 'pending'
            },
            transaction_id: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
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
        
        await queryInterface.addIndex('payments', ['booking_id']);
        await queryInterface.addIndex('payments', ['stripe_payment_intent_id']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('payments');
    }
};