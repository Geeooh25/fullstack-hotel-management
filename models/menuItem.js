const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class MenuItem extends Model {}

MenuItem.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    requires_appointment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: 'MenuItem',
    tableName: 'menu_items',
    timestamps: true,
    underscored: true
});

module.exports = MenuItem;