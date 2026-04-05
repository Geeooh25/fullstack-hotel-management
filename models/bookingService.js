const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class BookingService extends Model {}

BookingService.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    menu_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    price_at_time: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    special_instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    appointment_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
        defaultValue: 'pending'
    }
}, {
    sequelize,
    modelName: 'BookingService',
    tableName: 'booking_services',
    timestamps: true,
    underscored: true
});

// ==================== ASSOCIATIONS ====================
BookingService.associate = (models) => {
    BookingService.belongsTo(models.Booking, { foreignKey: 'booking_id' });
    BookingService.belongsTo(models.MenuItem, { foreignKey: 'menu_item_id', as: 'menu_item' });
};

module.exports = BookingService;