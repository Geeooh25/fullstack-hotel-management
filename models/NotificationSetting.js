const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationSetting = sequelize.define('NotificationSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: 1
    },
    email_notifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    new_booking_email: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    new_request_email: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    daily_summary_email: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    low_occupancy_alert: {
        type: DataTypes.INTEGER,
        defaultValue: 70
    },
    auto_response_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    auto_response_message: {
        type: DataTypes.TEXT,
        defaultValue: 'Thank you for your request. Our team will get back to you shortly.'
    }
}, {
    tableName: 'notification_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = NotificationSetting;