const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    room_number: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true
    },
    room_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'room_types',
            key: 'id'
        }
    },
    floor: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'available'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Stores unique room description, view type, and special features'
    }
}, {
    tableName: 'rooms',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Room;