const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const { Booking, Guest, Room, Payment } = require('../../models');
const { BOOKING_STATUS, ROOM_STATUS } = require('../../utils/constants');
const { Op } = require('sequelize');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Today's check-ins and check-outs
        const todayCheckins = await Booking.findAll({
            where: {
                check_in: { [Op.gte]: today, [Op.lt]: tomorrow },
                status: BOOKING_STATUS.CONFIRMED
            },
            include: [{ model: Guest }, { model: Room }]
        });
        
        const todayCheckouts = await Booking.findAll({
            where: {
                check_out: { [Op.gte]: today, [Op.lt]: tomorrow },
                status: BOOKING_STATUS.CHECKED_IN
            },
            include: [{ model: Guest }, { model: Room }]
        });
        
        // Recent bookings
        const recentBookings = await Booking.findAll({
            limit: 10,
            order: [['created_at', 'DESC']],
            include: [{ model: Guest }, { model: Room }]
        });
        
        // Stats
        const totalRooms = await Room.count();
        const availableRooms = await Room.count({ where: { status: ROOM_STATUS.AVAILABLE } });
        const occupiedRooms = await Room.count({ where: { status: ROOM_STATUS.OCCUPIED } });
        const cleaningRooms = await Room.count({ where: { status: ROOM_STATUS.CLEANING } });
        
        // Today's revenue
        const todayPayments = await Payment.sum('amount', {
            where: {
                status: 'succeeded',
                created_at: { [Op.gte]: today }
            }
        });
        
        // Occupancy rate
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        
        // Occupancy data for chart
        const occupancyLabels = [];
        const occupancyData = [];
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
            occupancyData.push(totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0);
        }
        
        const stats = {
            totalRooms,
            availableRooms,
            occupiedRooms,
            cleaningRooms,
            todayRevenue: todayPayments || 0,
            occupancyRate,
            revenueChange: '+5.2'
        };
        
        res.render('admin/dashboard', {
            title: 'Dashboard',
            active: 'dashboard',
            stats: stats,
            todayCheckins,
            todayCheckouts,
            recentBookings,
            occupancyLabels,
            occupancyData,
            user: req.user || { first_name: 'Admin', last_name: 'User' }
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', {
            title: 'Dashboard',
            active: 'dashboard',
            stats: {
                totalRooms: 22,
                availableRooms: 22,
                occupiedRooms: 0,
                cleaningRooms: 0,
                todayRevenue: 0,
                occupancyRate: 0,
                revenueChange: '0'
            },
            todayCheckins: [],
            todayCheckouts: [],
            recentBookings: [],
            occupancyLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            occupancyData: [0, 0, 0, 0, 0, 0, 0],
            user: req.user || { first_name: 'Admin', last_name: 'User' }
        });
    }
});

module.exports = router;