const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Amenity extends Model {}

Amenity.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    category: {
        type: DataTypes.ENUM('free', 'paid', 'request'),
        allowNull: false,
        defaultValue: 'free'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    short_description: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    icon: {
        type: DataTypes.STRING(100),
        defaultValue: 'fas fa-star'
    },
    hours: {
        type: DataTypes.STRING(200),
        defaultValue: '24/7'
    },
    location: {
        type: DataTypes.STRING(255),
        defaultValue: 'Main Building'
    },
    additional_info: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: 'Amenity',
    tableName: 'amenities',
    timestamps: true,
    underscored: true
});

module.exports = Amenity;