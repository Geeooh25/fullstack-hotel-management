const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Booking = sequelize.define('Booking', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    booking_reference: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        defaultValue: () => {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `BKG-${year}${month}-${random}`;
        }
    },
    check_in: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    check_out: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isAfterCheckIn(value) {
                if (value <= this.check_in) {
                    throw new Error('Check-out date must be after check-in date');
                }
            }
        }
    },
    adults: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    children: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    total_nights: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    tax: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    deposit_paid: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    remaining_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'),
        defaultValue: 'pending'
    },
    payment_status: {
        type: DataTypes.ENUM('unpaid', 'deposit', 'paid', 'refunded'),
        defaultValue: 'unpaid'
    },
    source: {
        type: DataTypes.ENUM('online', 'phone', 'walk_in', 'agency'),
        defaultValue: 'online'
    },
    special_requests: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    checked_in_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    checked_out_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // NEW: Link to User account
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'bookings',
    hooks: {
        beforeCreate: async (booking) => {
            // Calculate total nights
            const checkIn = new Date(booking.check_in);
            const checkOut = new Date(booking.check_out);
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            booking.total_nights = nights;
        }
    }
});

module.exports = Booking;