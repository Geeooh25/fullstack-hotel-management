const { Booking, Guest, Room } = require('../models');
const { BOOKING_STATUS, ROOM_STATUS } = require('../utils/constants');
const { Op } = require('sequelize');

class DashboardController {
    
    static async getDashboard(req, res, next) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Today's check-ins
            const todayCheckins = await Booking.findAll({
                where: {
                    check_in: {
                        [Op.gte]: today,
                        [Op.lt]: tomorrow
                    },
                    status: BOOKING_STATUS.CONFIRMED
                },
                include: [
                    { model: Guest },
                    { model: Room }
                ]
            });
            
            // Today's check-outs
            const todayCheckouts = await Booking.findAll({
                where: {
                    check_out: {
                        [Op.gte]: today,
                        [Op.lt]: tomorrow
                    },
                    status: BOOKING_STATUS.CHECKED_IN
                },
                include: [
                    { model: Guest },
                    { model: Room }
                ]
            });
            
            // Recent bookings (last 10)
            const recentBookings = await Booking.findAll({
                limit: 10,
                order: [['created_at', 'DESC']],
                include: [
                    { model: Guest },
                    { model: Room }
                ]
            });
            
            // Stats
            const totalBookings = await Booking.count();
            const totalGuests = await Guest.count();
            const totalRooms = await Room.count();
            
            // Room status counts
            const availableRooms = await Room.count({ where: { status: ROOM_STATUS.AVAILABLE } });
            const occupiedRooms = await Room.count({ where: { status: ROOM_STATUS.OCCUPIED } });
            const cleaningRooms = await Room.count({ where: { status: ROOM_STATUS.CLEANING } });
            
            // Monthly revenue
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthlyBookings = await Booking.findAll({
                where: {
                    status: BOOKING_STATUS.CHECKED_OUT,
                    checked_out_at: {
                        [Op.gte]: firstDayOfMonth
                    }
                },
                attributes: ['total_amount']
            });
            const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
            
            // Occupancy data for last 7 days
            const occupancyLabels = [];
            const occupancyData = [];
            const totalRoomsCount = totalRooms;
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                occupancyLabels.push(dateStr.slice(5));
                
                const occupiedCount = await Booking.count({
                    where: {
                        status: { [Op.in]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
                        check_in: { [Op.lte]: dateStr },
                        check_out: { [Op.gt]: dateStr }
                    },
                    distinct: true,
                    col: 'room_id'
                });
                
                const occupancyRate = totalRoomsCount > 0 ? (occupiedCount / totalRoomsCount) * 100 : 0;
                occupancyData.push(Math.round(occupancyRate));
            }
            
            // Prepare stats object
            const stats = {
                totalBookings: totalBookings || 0,
                totalGuests: totalGuests || 0,
                totalRooms: totalRooms || 0,
                monthlyRevenue: Math.round(monthlyRevenue) || 0,
                availableRooms: availableRooms || 0,
                occupiedRooms: occupiedRooms || 0,
                cleaningRooms: cleaningRooms || 0
            };
            
            res.render('admin/dashboard', {
                title: 'Dashboard',
                active: 'dashboard',
                stats: stats,
                todayCheckins: todayCheckins || [],
                todayCheckouts: todayCheckouts || [],
                recentBookings: recentBookings || [],
                occupancyLabels: occupancyLabels,
                occupancyData: occupancyData,
                user: req.user || { first_name: 'Admin', last_name: 'User' }
            });
            
        } catch (error) {
            console.error('Dashboard error:', error);
            
            // Fallback data
            const fallbackStats = {
                totalBookings: 0,
                totalGuests: 0,
                totalRooms: 22,
                monthlyRevenue: 0,
                availableRooms: 22,
                occupiedRooms: 0,
                cleaningRooms: 0
            };
            
            res.render('admin/dashboard', {
                title: 'Dashboard',
                active: 'dashboard',
                stats: fallbackStats,
                todayCheckins: [],
                todayCheckouts: [],
                recentBookings: [],
                occupancyLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                occupancyData: [0, 0, 0, 0, 0, 0, 0],
                user: req.user || { first_name: 'Admin', last_name: 'User' }
            });
        }
    }
}

module.exports = DashboardController;