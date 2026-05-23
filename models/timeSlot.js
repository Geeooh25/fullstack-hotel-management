const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TimeSlot = sequelize.define('TimeSlot', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    menu_item_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING(10), allowNull: false },
    is_booked: { type: DataTypes.BOOLEAN, defaultValue: false },
    booking_service_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'time_slots', timestamps: true, underscored: true });

module.exports = TimeSlot;