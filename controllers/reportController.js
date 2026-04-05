const { Booking, Guest, Room, Payment, RoomType } = require('../models');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { Op, Sequelize } = require('sequelize');

class ReportController {
    
    // Occupancy report
    static async getOccupancyReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Start date and end date are required'
                });
            }
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            const totalRooms = await Room.count();
            
            const dates = [];
            const details = [];
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                dates.push(dateStr);
                
                // Count occupied rooms for this date
                const occupiedRooms = await Booking.count({
                    where: {
                        status: { [Op.in]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
                        check_in: { [Op.lte]: dateStr },
                        check_out: { [Op.gt]: dateStr }
                    },
                    distinct: true,
                    col: 'room_id'
                });
                
                const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
                
                details.push({
                    date: dateStr,
                    occupancy: Math.round(occupancyRate),
                    occupied: occupiedRooms,
                    total: totalRooms
                });
            }
            
            // Summary statistics
            const avgOccupancy = details.reduce((sum, d) => sum + d.occupancy, 0) / details.length;
            const peakOccupancy = Math.max(...details.map(d => d.occupancy));
            const totalRoomNights = details.reduce((sum, d) => sum + d.occupied, 0);
            
            res.json({
                success: true,
                reportType: 'occupancy',
                labels: dates,
                values: details.map(d => d.occupancy),
                details: details,
                summary: {
                    averageOccupancy: Math.round(avgOccupancy),
                    peakOccupancy: peakOccupancy,
                    totalRoomNights: totalRoomNights
                }
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Revenue report
    static async getRevenueReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Start date and end date are required'
                });
            }
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            const dates = [];
            const details = [];
            let totalRevenue = 0;
            let totalBookings = 0;
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const nextDay = new Date(d);
                nextDay.setDate(nextDay.getDate() + 1);
                
                // Get bookings that ended on this date (check-outs)
                const bookings = await Booking.findAll({
                    where: {
                        status: BOOKING_STATUS.CHECKED_OUT,
                        checked_out_at: {
                            [Op.gte]: d,
                            [Op.lt]: nextDay
                        }
                    },
                    attributes: ['total_amount', 'id']
                });
                
                const dailyRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
                const dailyBookings = bookings.length;
                
                dates.push(dateStr);
                totalRevenue += dailyRevenue;
                totalBookings += dailyBookings;
                
                details.push({
                    date: dateStr,
                    revenue: Math.round(dailyRevenue),
                    bookings: dailyBookings,
                    avgValue: dailyBookings > 0 ? Math.round(dailyRevenue / dailyBookings) : 0
                });
            }
            
            res.json({
                success: true,
                reportType: 'revenue',
                labels: dates,
                values: details.map(d => d.revenue),
                details: details,
                totalRevenue: Math.round(totalRevenue),
                totalBookings: totalBookings,
                averageValue: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Room performance report
    static async getRoomPerformanceReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Start date and end date are required'
                });
            }
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            const rooms = await Room.findAll({
                include: [{ model: RoomType }]
            });
            
            const roomPerformance = [];
            let totalRevenue = 0;
            let totalBookings = 0;
            let totalNights = 0;
            
            for (const room of rooms) {
                const bookings = await Booking.findAll({
                    where: {
                        room_id: room.id,
                        status: BOOKING_STATUS.CHECKED_OUT,
                        checked_out_at: {
                            [Op.gte]: start,
                            [Op.lte]: end
                        }
                    }
                });
                
                const revenue = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
                const bookingCount = bookings.length;
                const nightsBooked = bookings.reduce((sum, b) => sum + b.total_nights, 0);
                
                totalRevenue += revenue;
                totalBookings += bookingCount;
                totalNights += nightsBooked;
                
                roomPerformance.push({
                    room_id: room.id,
                    room_number: room.room_number,
                    room_type: room.RoomType ? room.RoomType.name : 'N/A',
                    bookings: bookingCount,
                    nights: nightsBooked,
                    revenue: Math.round(revenue),
                    avgNightlyRate: nightsBooked > 0 ? Math.round(revenue / nightsBooked) : 0,
                    utilization: nightsBooked > 0 ? (nightsBooked / ((end - start) / (1000 * 60 * 60 * 24))) * 100 : 0
                });
            }
            
            // Sort by revenue
            roomPerformance.sort((a, b) => b.revenue - a.revenue);
            
            res.json({
                success: true,
                reportType: 'room_performance',
                roomPerformance: roomPerformance,
                topRooms: roomPerformance.slice(0, 5),
                summary: {
                    totalRevenue: Math.round(totalRevenue),
                    totalBookings: totalBookings,
                    totalNights: totalNights,
                    averageDailyRate: totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0
                }
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Guest statistics report
    static async getGuestReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            
            const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
            const end = endDate ? new Date(endDate) : new Date();
            
            // New guests in period
            const newGuests = await Guest.count({
                where: {
                    created_at: {
                        [Op.gte]: start,
                        [Op.lte]: end
                    }
                }
            });
            
            // Returning guests (more than 1 stay)
            const returningGuests = await Guest.count({
                where: {
                    total_stays: { [Op.gt]: 1 }
                }
            });
            
            // Total guests
            const totalGuests = await Guest.count();
            
            // Guest acquisition by month (last 6 months)
            const monthlyAcquisition = [];
            for (let i = 5; i >= 0; i--) {
                const monthStart = new Date();
                monthStart.setMonth(monthStart.getMonth() - i);
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                
                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                monthEnd.setDate(0);
                monthEnd.setHours(23, 59, 59, 999);
                
                const count = await Guest.count({
                    where: {
                        created_at: {
                            [Op.gte]: monthStart,
                            [Op.lte]: monthEnd
                        }
                    }
                });
                
                monthlyAcquisition.push({
                    month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                    count: count
                });
            }
            
            // Top guests by spending
            const topGuests = await Guest.findAll({
                order: [['total_spent', 'DESC']],
                limit: 10,
                attributes: ['id', 'first_name', 'last_name', 'email', 'total_stays', 'total_spent']
            });
            
            // Guest retention
            const oneTimeGuests = await Guest.count({ where: { total_stays: 1 } });
            const repeatGuests = await Guest.count({ where: { total_stays: { [Op.gt]: 1 } } });
            
            res.json({
                success: true,
                reportType: 'guest',
                summary: {
                    newGuests,
                    returningGuests,
                    totalGuests,
                    oneTimeGuests,
                    repeatGuests,
                    retentionRate: totalGuests > 0 ? (repeatGuests / totalGuests * 100).toFixed(1) : 0
                },
                topGuests,
                monthlyAcquisition
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Payment summary report
    static async getPaymentReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            
            const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
            const end = endDate ? new Date(endDate) : new Date();
            
            // Payment method breakdown
            const paymentMethodBreakdown = await Payment.findAll({
                where: {
                    status: 'succeeded',
                    created_at: {
                        [Op.gte]: start,
                        [Op.lte]: end
                    }
                },
                attributes: [
                    'payment_method',
                    [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_amount'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                group: ['payment_method']
            });
            
            // Daily payment totals
            const dailyPayments = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const nextDay = new Date(d);
                nextDay.setDate(nextDay.getDate() + 1);
                
                const total = await Payment.sum('amount', {
                    where: {
                        status: 'succeeded',
                        created_at: {
                            [Op.gte]: d,
                            [Op.lt]: nextDay
                        }
                    }
                });
                
                const count = await Payment.count({
                    where: {
                        status: 'succeeded',
                        created_at: {
                            [Op.gte]: d,
                            [Op.lt]: nextDay
                        }
                    }
                });
                
                dailyPayments.push({
                    date: dateStr,
                    amount: total || 0,
                    count: count
                });
            }
            
            // Refunds
            const refunds = await Payment.sum('amount', {
                where: {
                    status: 'refunded',
                    created_at: {
                        [Op.gte]: start,
                        [Op.lte]: end
                    }
                }
            });
            
            const refundCount = await Payment.count({
                where: {
                    status: 'refunded',
                    created_at: {
                        [Op.gte]: start,
                        [Op.lte]: end
                    }
                }
            });
            
            res.json({
                success: true,
                reportType: 'payment',
                paymentMethodBreakdown: paymentMethodBreakdown.map(p => ({
                    method: p.payment_method,
                    total: parseFloat(p.dataValues.total_amount),
                    count: parseInt(p.dataValues.count)
                })),
                dailyPayments,
                refunds: {
                    total: refunds || 0,
                    count: refundCount
                }
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Export report as CSV
    static async exportReport(req, res, next) {
        try {
            const { type, startDate, endDate } = req.query;
            
            if (!type || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Report type, start date, and end date are required'
                });
            }
            
            let data;
            let headers;
            let filename;
            
            switch(type) {
                case 'occupancy':
                    const occupancyReport = await this.getOccupancyReportData(startDate, endDate);
                    data = occupancyReport.details;
                    headers = ['Date', 'Occupancy Rate (%)', 'Occupied Rooms', 'Total Rooms'];
                    filename = `occupancy_report_${startDate}_to_${endDate}.csv`;
                    break;
                    
                case 'revenue':
                    const revenueReport = await this.getRevenueReportData(startDate, endDate);
                    data = revenueReport.details;
                    headers = ['Date', 'Revenue ($)', 'Bookings', 'Average Booking Value ($)'];
                    filename = `revenue_report_${startDate}_to_${endDate}.csv`;
                    break;
                    
                case 'room_performance':
                    const roomReport = await this.getRoomPerformanceData(startDate, endDate);
                    data = roomReport.roomPerformance;
                    headers = ['Room Number', 'Room Type', 'Bookings', 'Nights Booked', 'Revenue ($)', 'Average Nightly Rate ($)'];
                    filename = `room_performance_report_${startDate}_to_${endDate}.csv`;
                    break;
                    
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid report type'
                    });
            }
            
            // Generate CSV
            const csvRows = [headers];
            for (const row of data) {
                const values = headers.map(header => {
                    const key = header.toLowerCase().replace(/ /g, '_').replace(/[\(\)\$]/g, '');
                    let value = row[key] !== undefined ? row[key] : row[header.split(' ')[0].toLowerCase()];
                    if (typeof value === 'string' && value.includes(',')) {
                        value = `"${value}"`;
                    }
                    return value;
                });
                csvRows.push(values.join(','));
            }
            
            const csvContent = csvRows.join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send(csvContent);
            
        } catch (error) {
            next(error);
        }
    }
    
    // Helper methods for export
    static async getOccupancyReportData(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalRooms = await Room.count();
        
        const details = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            const occupiedRooms = await Booking.count({
                where: {
                    status: { [Op.in]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
                    check_in: { [Op.lte]: dateStr },
                    check_out: { [Op.gt]: dateStr }
                },
                distinct: true,
                col: 'room_id'
            });
            
            const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
            
            details.push({
                date: dateStr,
                occupancy_rate: Math.round(occupancyRate),
                occupied_rooms: occupiedRooms,
                total_rooms: totalRooms
            });
        }
        
        return { details };
    }
    
    static async getRevenueReportData(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const details = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const bookings = await Booking.findAll({
                where: {
                    status: BOOKING_STATUS.CHECKED_OUT,
                    checked_out_at: {
                        [Op.gte]: d,
                        [Op.lt]: nextDay
                    }
                },
                attributes: ['total_amount', 'id']
            });
            
            const dailyRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
            const dailyBookings = bookings.length;
            
            details.push({
                date: dateStr,
                revenue: Math.round(dailyRevenue),
                bookings: dailyBookings,
                avg_value: dailyBookings > 0 ? Math.round(dailyRevenue / dailyBookings) : 0
            });
        }
        
        return { details };
    }
    
    static async getRoomPerformanceData(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const rooms = await Room.findAll({
            include: [{ model: RoomType }]
        });
        
        const roomPerformance = [];
        
        for (const room of rooms) {
            const bookings = await Booking.findAll({
                where: {
                    room_id: room.id,
                    status: BOOKING_STATUS.CHECKED_OUT,
                    checked_out_at: {
                        [Op.gte]: start,
                        [Op.lte]: end
                    }
                }
            });
            
            const revenue = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
            const bookingCount = bookings.length;
            const nightsBooked = bookings.reduce((sum, b) => sum + b.total_nights, 0);
            
            roomPerformance.push({
                room_number: room.room_number,
                room_type: room.RoomType ? room.RoomType.name : 'N/A',
                bookings: bookingCount,
                nights_booked: nightsBooked,
                revenue: Math.round(revenue),
                avg_nightly_rate: nightsBooked > 0 ? Math.round(revenue / nightsBooked) : 0
            });
        }
        
        return { roomPerformance };
    }
}

module.exports = ReportController;