const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceOrder = sequelize.define('ServiceOrder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    reference: { type: DataTypes.STRING(50), allowNull: false },
    guest_name: { type: DataTypes.STRING(200), allowNull: false },
    guest_email: { type: DataTypes.STRING(255), allowNull: false },
    services: { type: DataTypes.TEXT, allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
    payment_status: { type: DataTypes.STRING(20), defaultValue: 'paid' }
}, { tableName: 'service_orders', timestamps: true, underscored: true });

module.exports = ServiceOrder;