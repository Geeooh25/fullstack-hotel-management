const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class RequestSubmission extends Model {}

RequestSubmission.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amenity_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    guest_name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    guest_email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    guest_phone: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    booking_reference: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    request_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    request_details: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    preferred_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    number_of_people: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    number_of_tickets: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    seating_preference: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tour_name: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    event_name: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'contacted', 'completed', 'cancelled'),
        defaultValue: 'pending'
    },
    admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'RequestSubmission',
    tableName: 'request_submissions',
    timestamps: true,
    underscored: true
});

module.exports = RequestSubmission;