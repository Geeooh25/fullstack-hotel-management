const db = require('../models'); 
const db = require('../models');
const { sequelize } = require('../config/database');
const { Op, QueryTypes } = require('sequelize');
const reportController = {
    // Get reports page
    getReports: async (req, res) => {
        try {
            const range = req.query.range || '30';
            const filter = req.query.filter || 'all'; // day, week, month, all
            const endDate = new Date();
            const startDate = new Date();
            
            // Handle filters
            if (filter === 'day') {
                startDate.setHours(0, 0, 0, 0);
            } else if (filter === 'week') {
                startDate.setDate(startDate.getDate() - 7);
            } else if (filter === 'month') {
                startDate.setMonth(startDate.getMonth() - 1);
            } else {
                startDate.setDate(startDate.getDate() - parseInt(range));
            }

            // Get recent bookings with guest info (FIXED: N/A guests)
            const recentBookings = await db.Booking.findAll({
                include: [
                    { model: db.Guest },
                    { model: db.Room, include: [{ model: db.RoomType }] }
                ],
                where: { created_at: { [Op.gte]: startDate } },
                order: [['created_at', 'DESC']],
                limit: 50
            });

            // Get total stats
            const totalBookings = await db.Booking.count({
                where: { created_at: { [Op.gte]: startDate } }
            });

            const totalRevenue = await db.Booking.sum('total_amount', {
                where: { 
                    created_at: { [Op.gte]: startDate },
                    status: { [Op.ne]: 'cancelled' }
                }
            });

            // Revenue by room type
            const revenueByRoomType = await sequelize.query(
                `SELECT rt.name as room_type, COUNT(b.id) as bookings, 
                        COALESCE(SUM(b.total_amount), 0) as revenue,
                        COALESCE(AVG(b.total_amount), 0) as avg_booking_value
                 FROM bookings b
                 JOIN rooms r ON b.room_id = r.id
                 JOIN room_types rt ON r.room_type_id = rt.id
                 WHERE b.created_at >= :startDate AND b.status != 'cancelled'
                 GROUP BY rt.name
                 ORDER BY revenue DESC`,
                { replacements: { startDate }, type: sequelize.QueryTypes.SELECT }
            );

            // Top rooms
            const topRooms = await sequelize.query(
                `SELECT r.room_number, rt.name as room_type, 
                        COUNT(b.id) as total_bookings,
                        COALESCE(SUM(b.total_amount), 0) as total_revenue
                 FROM bookings b
                 JOIN rooms r ON b.room_id = r.id
                 JOIN room_types rt ON r.room_type_id = rt.id
                 WHERE b.created_at >= :startDate AND b.status != 'cancelled'
                 GROUP BY r.id, r.room_number, rt.name
                 ORDER BY total_revenue DESC
                 LIMIT 10`,
                { replacements: { startDate }, type: sequelize.QueryTypes.SELECT }
            );

            // Cancellation rate
            const cancelledBookings = await db.Booking.count({
                where: { created_at: { [Op.gte]: startDate }, status: 'cancelled' }
            });

            const cancellationRate = {
                cancelled: cancelledBookings,
                total: totalBookings,
                rate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0
            };

            // Occupancy
            const totalRooms = await db.Room.count();
            const occupiedRooms = await db.Room.count({ where: { status: 'occupied' } });
            const occupancy = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

                     res.render('admin/reports', {
                title: 'Reports',
                range,
                filter,
                recentBookings: recentBookings || [],
                totalBookings,
                totalRevenue: totalRevenue || 0,
                revenueByRoomType: revenueByRoomType || [],
                topRooms: topRooms || [],
                cancellationRate,
                occupancy,
                totalRooms,
                occupiedRooms,
                session: req.session
            });
        } catch (error) {
            console.error('Report error:', error);
            res.render('admin/reports', {
                title: 'Reports',
                error: 'Failed to load reports: ' + error.message,
                recentBookings: [],
                totalBookings: 0,
                totalRevenue: 0,
                revenueByRoomType: [],
                topRooms: [],
                cancellationRate: { cancelled: 0, total: 0, rate: 0 },
                occupancy: 0,
                totalRooms: 0,
                occupiedRooms: 0,
                filter: 'all',
                range: '30',
                session: req.session
            });
        }
    },

    // Export report
    exportReport: async (req, res) => {
        const { type, startDate, endDate } = req.query;

        try {
            let data = [];
            let filename = 'report.csv';

            if (type === 'bookings') {
                const bookings = await db.Booking.findAll({
                    include: [
                        { model: db.Guest },
                        { model: db.Room, include: [{ model: db.RoomType }] }
                    ],
                    where: {
                        created_at: { [Op.between]: [new Date(startDate), new Date(endDate)] }
                    },
                    order: [['created_at', 'DESC']]
                });

                data = bookings.map(b => ({
                    Reference: b.booking_reference,
                    Guest: b.Guest ? `${b.Guest.first_name} ${b.Guest.last_name}` : 'N/A',
                    Email: b.Guest?.email || 'N/A',
                    Room: b.Room?.room_number || 'N/A',
                    Type: b.Room?.RoomType?.name || 'N/A',
                    CheckIn: b.check_in,
                    CheckOut: b.check_out,
                    Amount: b.total_amount,
                    Status: b.status,
                    Date: new Date(b.created_at).toLocaleDateString()
                }));
                filename = `bookings_report_${startDate}_to_${endDate}.csv`;
            } else if (type === 'revenue') {
                const payments = await db.Payment.findAll({
                    include: [{ model: db.Booking, include: [{ model: db.Guest }] }],
                    where: { created_at: { [Op.between]: [new Date(startDate), new Date(endDate)] }, status: 'completed' },
                    order: [['created_at', 'DESC']]
                });
                data = payments.map(p => ({
                    Transaction: p.transaction_id || 'N/A',
                    Booking: p.Booking?.booking_reference || 'N/A',
                    Guest: p.Booking?.Guest ? `${p.Booking.Guest.first_name} ${p.Booking.Guest.last_name}` : 'N/A',
                    Amount: p.amount,
                    Method: p.payment_method,
                    Date: new Date(p.created_at).toLocaleDateString()
                }));
                filename = `revenue_report_${startDate}_to_${endDate}.csv`;
            }

            if (data.length === 0) {
                return res.status(404).json({ error: 'No data found for selected period' });
            }

            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','),
                ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
            ];

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send(csvRows.join('\n'));
        } catch (error) {
            console.error('Export error:', error);
            res.status(500).json({ error: 'Failed to export report' });
        }
    }
};


module.exports = reportController;
