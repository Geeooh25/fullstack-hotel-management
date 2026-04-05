'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('housekeepings', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            room_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'rooms',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            status: {
                type: Sequelize.ENUM('pending', 'in_progress', 'completed'),
                defaultValue: 'pending'
            },
            priority: {
                type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
                defaultValue: 'normal'
            },
            assigned_to: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            started_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            completed_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            created_by: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
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
        
        await queryInterface.addIndex('housekeepings', ['room_id']);
        await queryInterface.addIndex('housekeepings', ['status']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('housekeepings');
    }
};