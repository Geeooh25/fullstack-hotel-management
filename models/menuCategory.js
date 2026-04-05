const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class MenuCategory extends Model {}

MenuCategory.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amenity_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: 'MenuCategory',
    tableName: 'menu_categories',
    timestamps: true,
    underscored: true
});

module.exports = MenuCategory;