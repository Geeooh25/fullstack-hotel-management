const db = require('../models');
const ActivityLog = require('../models/ActivityLog');

const activityController = {
    // Get activity logs page
    getActivityLogs: async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        const action = req.query.action || '';
        const startDate = req.query.start_date || '';
        const endDate = req.query.end_date || '';
        
        try {
            const where = {};
            if (action) where.action = action;
            if (startDate) where.created_at = { [Op.gte]: startDate };
            if (endDate) where.created_at = { [Op.lte]: endDate };
            
            const { count, rows: logs } = await ActivityLog.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit,
                offset
            });
            
            // Get unique actions for filter
            const uniqueActions = await ActivityLog.findAll({
                attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('action')), 'action']],
                raw: true
            });
            
            // Get admin stats
            const adminStats = await ActivityLog.findAll({
                attributes: [
                    'admin_username',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_actions'],
                    [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('DATE(created_at)'))), 'active_days'],
                    [db.sequelize.fn('MIN', db.sequelize.col('created_at')), 'first_action'],
                    [db.sequelize.fn('MAX', db.sequelize.col('created_at')), 'last_action']
                ],
                group: ['admin_username'],
                order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
                raw: true
            });
            
            res.render('admin/activity', {
                logs,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                uniqueActions: uniqueActions.map(a => a.action),
                adminStats,
                filters: { action, startDate, endDate },
                session: req.session
            });
        } catch (error) {
            console.error(error);
            res.render('admin/activity', { 
                error: 'Failed to load activity logs',
                logs: [],
                session: req.session
            });
        }
    },
    
    // Clear old logs
    clearLogs: async (req, res) => {
        const { days } = req.body;
        
        try {
            const deleted = await ActivityLog.destroy({
                where: {
                    created_at: {
                        [Op.lt]: new Date(Date.now() - (days || 90) * 24 * 60 * 60 * 1000)
                    }
                }
            });
            
            res.json({ success: true, message: `${deleted} old logs cleared successfully` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to clear logs' });
        }
    }
};

module.exports = activityController;