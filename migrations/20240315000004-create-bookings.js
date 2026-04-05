'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('bookings', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            booking_reference: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true
            },
            guest_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'guests',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            room_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'rooms',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            check_in: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            check_out: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            adults: {
                type: Sequelize.INTEGER,
                defaultValue: 1,
                allowNull: false
            },
            children: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            total_nights: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            subtotal: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            tax: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            total_amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            deposit_paid: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            remaining_balance: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            status: {
                type: Sequelize.ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'),
                defaultValue: 'pending'
            },
            payment_status: {
                type: Sequelize.ENUM('unpaid', 'deposit', 'paid', 'refunded'),
                defaultValue: 'unpaid'
            },
            source: {
                type: Sequelize.ENUM('online', 'phone', 'walk_in', 'agency'),
                defaultValue: 'online'
            },
            special_requests: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            confirmed_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            checked_in_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            checked_out_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            cancelled_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            cancellation_reason: {
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
        
        // Add indexes for faster queries
        await queryInterface.addIndex('bookings', ['booking_reference']);
        await queryInterface.addIndex('bookings', ['guest_id']);
        await queryInterface.addIndex('bookings', ['room_id']);
        await queryInterface.addIndex('bookings', ['check_in', 'check_out']);
        await queryInterface.addIndex('bookings', ['status']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('bookings');
    }
};