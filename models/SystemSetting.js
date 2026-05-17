const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: 1
    },
    hotel_name: {
        type: DataTypes.STRING,
        defaultValue: 'Mansion Hotel'
    },
    hotel_email: {
        type: DataTypes.STRING,
        defaultValue: 'info@mansionhotel.com'
    },
    hotel_phone: {
        type: DataTypes.STRING,
        defaultValue: '+1-555-123-4567'
    },
    hotel_address: {
        type: DataTypes.TEXT,
        defaultValue: '123 Hotel Street, City, Country'
    },
    tax_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 10.00
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD'
    },
    timezone: {
        type: DataTypes.STRING,
        defaultValue: 'UTC'
    },
    date_format: {
        type: DataTypes.STRING,
        defaultValue: 'MM/DD/YYYY'
    },
    booking_confirmation_subject: {
        type: DataTypes.STRING,
        defaultValue: 'Booking Confirmation'
    },
    booking_confirmation_message: {
        type: DataTypes.TEXT,
        defaultValue: 'Thank you for your booking!'
    },
    cancellation_policy: {
        type: DataTypes.TEXT,
        defaultValue: 'Free cancellation up to 24 hours before check-in'
    },
    check_in_time: {
        type: DataTypes.STRING(5),
        defaultValue: '14:00'
    },
    check_out_time: {
        type: DataTypes.STRING(5),
        defaultValue: '11:00'
    }
}, {
    tableName: 'system_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SystemSetting;