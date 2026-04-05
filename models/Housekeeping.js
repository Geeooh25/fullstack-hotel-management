const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Housekeeping = sequelize.define('Housekeeping', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    room_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.STRING(50),
        defaultValue: 'normal'
    },
    assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'housekeepings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Housekeeping;