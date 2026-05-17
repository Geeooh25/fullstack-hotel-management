const db = require('../models');
const { Op } = require('sequelize');

const reportController = {
    // Get reports page
    getReports: async (req, res) => {
        try {
            const range = req.query.range || '30';
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(range));
            
            // Get booking trends
            const bookingTrends = await db.Booking.findAll({
                attributes: [
                    [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'bookings'],
                    [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue'],
                    [db.sequelize.fn('SUM', db.sequelize.literal(`CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END`)), 'confirmed'],
                    [db.sequelize.fn('SUM', db.sequelize.literal(`CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END`)), 'cancelled']
                ],
                where: {
                    created_at: { [Op.gte]: startDate }
                },
                group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
                order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']],
                raw: true
            });
            
            // Get revenue by room type
            const revenueByRoomType = await db.Booking.findAll({
                attributes: [
                    [db.sequelize.col('Room.RoomType.name'), 'room_type'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('Booking.id')), 'bookings'],
                    [db.sequelize.fn('SUM', db.sequelize.col('Booking.total_amount')), 'revenue'],
                    [db.sequelize.fn('AVG', db.sequelize.col('Booking.total_amount')), 'avg_booking_value']
                ],
                include: [
                    {
                        model: db.Room,
                        include: [{ model: db.RoomType }]
                    }
                ],
                where: {
                    created_at: { [Op.gte]: startDate },
                    status: { [Op.ne]: 'cancelled' }
                },
                group: ['Room.RoomType.name'],
                raw: true
            });
            
            // Get top performing rooms
            const topRooms = await db.Booking.findAll({
                attributes: [
                    [db.sequelize.col('Room.room_number'), 'room_number'],
                    [db.sequelize.col('Room.RoomType.name'), 'room_type'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('Booking.id')), 'total_bookings'],
                    [db.sequelize.fn('SUM', db.sequelize.col('Booking.total_amount')), 'total_revenue']
                ],
                include: [
                    {
                        model: db.Room,
                        include: [{ model: db.RoomType }]
                    }
                ],
                where: {
                    created_at: { [Op.gte]: startDate },
                    status: { [Op.ne]: 'cancelled' }
                },
                group: ['Room.id', 'Room.room_number', 'Room.RoomType.name'],
                order: [[db.sequelize.fn('SUM', db.sequelize.col('Booking.total_amount')), 'DESC']],
                limit: 10,
                raw: true
            });
            
            // Get cancellation rate
            const totalBookings = await db.Booking.count({
                where: { created_at: { [Op.gte]: startDate } }
            });
            
            const cancelledBookings = await db.Booking.count({
                where: {
                    created_at: { [Op.gte]: startDate },
                    status: 'cancelled'
                }
            });
            
            const cancellationRate = {
                cancelled: cancelledBookings,
                total: totalBookings,
                rate: totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(2) : 0
            };
            
            // Get repeat customers (users with multiple bookings)
            const repeatCustomers = await db.Booking.findAll({
                attributes: [
                    [db.sequelize.col('User.email'), 'email'],
                    [db.sequelize.col('User.first_name'), 'first_name'],
                    [db.sequelize.col('User.last_name'), 'last_name'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('Booking.id')), 'booking_count'],
                    [db.sequelize.fn('SUM', db.sequelize.col('Booking.total_amount')), 'total_spent']
                ],
                include: [{ model: db.User, as: 'user' }],
                where: {
                    created_at: { [Op.gte]: startDate },
                    user_id: { [Op.not]: null }
                },
                group: ['User.id', 'User.email', 'User.first_name', 'User.last_name'],
                having: db.sequelize.literal('COUNT(Booking.id) > 1'),
                order: [[db.sequelize.fn('COUNT', db.sequelize.col('Booking.id')), 'DESC']],
                limit: 10,
                raw: true
            });
            
            res.render('admin/reports', {
                range,
                bookingTrends: JSON.stringify(bookingTrends),
                revenueByRoomType: revenueByRoomType || [],
                topRooms: topRooms || [],
                cancellationRate,
                repeatCustomers: repeatCustomers || [],
                session: req.session
            });
        } catch (error) {
            console.error(error);
            res.render('admin/reports', { 
                error: 'Failed to load reports',
                bookingTrends: '[]',
                session: req.session
            });
        }
    },
    
    // Export report as CSV
    exportReport: async (req, res) => {
        const { type, format, startDate, endDate } = req.query;
        
        try {
            let data = [];
            let filename = '';
            
            switch(type) {
                case 'bookings':
                    data = await db.Booking.findAll({
                        include: [
                            { model: db.User, as: 'user', attributes: ['email'] },
                            { model: db.Room, attributes: ['room_number'] }
                        ],
                        where: {
                            created_at: {
                                [Op.between]: [new Date(startDate), new Date(endDate)]
                            }
                        },
                        order: [['created_at', 'DESC']],
                        raw: true
                    });
                    filename = `bookings_${startDate}_to_${endDate}.csv`;
                    break;
                    
                case 'payments':
                    data = await db.Payment.findAll({
                        include: [
                            { model: db.Booking, include: [{ model: db.User, attributes: ['email'] }] }
                        ],
                        where: {
                            created_at: {
                                [Op.between]: [new Date(startDate), new Date(endDate)]
                            }
                        },
                        order: [['created_at', 'DESC']],
                        raw: true
                    });
                    filename = `payments_${startDate}_to_${endDate}.csv`;
                    break;
            }
            
            if (format === 'json') {
                res.json(data);
            } else {
                if (data.length === 0) {
                    return res.status(404).json({ error: 'No data found' });
                }
                
                const headers = Object.keys(data[0]);
                const csvRows = [
                    headers.join(','),
                    ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
                ];
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
                res.send(csvRows.join('\n'));
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to export report' });
        }
    }
};

module.exports = reportController;