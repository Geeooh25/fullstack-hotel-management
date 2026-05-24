const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Guest = sequelize.define('Guest', {
    id: {
         type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
    id_type: { type: DataTypes.STRING(50), allowNull: true },
    id_number: { type: DataTypes.STRING(100), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    total_stays: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_spent: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    is_blacklisted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'guests',
    hooks: {
        beforeCreate: async (guest) => {
            if (guest.first_name) guest.first_name = guest.first_name.charAt(0).toUpperCase() + guest.first_name.slice(1).toLowerCase();
            if (guest.last_name) guest.last_name = guest.last_name.charAt(0).toUpperCase() + guest.last_name.slice(1).toLowerCase();
        },
        beforeUpdate: async (guest) => {
            if (guest.changed('first_name') && guest.first_name) guest.first_name = guest.first_name.charAt(0).toUpperCase() + guest.first_name.slice(1).toLowerCase();
            if (guest.changed('last_name') && guest.last_name) guest.last_name = guest.last_name.charAt(0).toUpperCase() + guest.last_name.slice(1).toLowerCase();
        }
    }
});

module.exports = Guest;