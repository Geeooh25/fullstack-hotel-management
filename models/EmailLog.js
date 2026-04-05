const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailLog = sequelize.define('EmailLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    to_email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    subject: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    sendgrid_message_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'email_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = EmailLog;