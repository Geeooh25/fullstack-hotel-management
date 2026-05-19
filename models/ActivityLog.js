const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    admin_username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT,
        get() {
            const raw = this.getDataValue('details');
            if (!raw) return {};
            try {
                return JSON.parse(raw);
            } catch (e) {
                return {};
            }
        },
        set(value) {
            this.setDataValue('details', JSON.stringify(value));
        }
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'activity_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Static methods
ActivityLog.log = async function(adminId, adminUsername, action, details, ipAddress = null, userAgent = null) {
    return await this.create({
        admin_id: adminId,
        admin_username: adminUsername,
        action: action,
        details: details,
        ip_address: ipAddress,
        user_agent: userAgent
    });
};

ActivityLog.getLogs = async function(filters = {}) {
    const { adminId, action, startDate, endDate, limit = 50, offset = 0 } = filters;
    const where = {};
    
    if (adminId) where.admin_id = adminId;
    if (action) where.action = action;
    if (startDate) where.created_at = { [Op.gte]: startDate };
    if (endDate) where.created_at = { [Op.lte]: endDate };
    
    return await this.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset
    });
};

// SQLite compatible version - no PostgreSQL specific syntax
ActivityLog.getActionsSummary = async function() {
    const sequelize = require('../config/database').sequelize;
    const [results] = await sequelize.query(`
        SELECT 
            action,
            COUNT(*) as count,
            DATE(created_at) as date
        FROM activity_logs
        WHERE created_at >= DATE('now', '-30 days')
        GROUP BY action, DATE(created_at)
        ORDER BY date DESC
    `);
    return results;
};

// SQLite compatible version
ActivityLog.getAdminStats = async function() {
    const sequelize = require('../config/database').sequelize;
    const [results] = await sequelize.query(`
        SELECT 
            admin_username,
            COUNT(*) as total_actions,
            COUNT(DISTINCT DATE(created_at)) as active_days,
            MIN(created_at) as first_action,
            MAX(created_at) as last_action
        FROM activity_logs
        GROUP BY admin_username
        ORDER BY total_actions DESC
    `);
    return results;
};

ActivityLog.cleanup = async function(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.destroy({
        where: {
            created_at: { [Op.lt]: cutoffDate }
        }
    });
};

module.exports = ActivityLog;