const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class CartItem extends Model {}

CartItem.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    session_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    guest_email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    menu_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    special_instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    appointment_time: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    timestamps: true,
    underscored: true
});

module.exports = CartItem;