const express = require('express');
const router = express.Router();
const { AvailabilityService, PricingService } = require('../../services');
const { validateAvailability } = require('../../middleware/validation');
const db = require('../../models');
const { Op } = require('sequelize');

// Check room availability (POST)
router.post('/check', async (req, res) => {
    try {
        const { check_in, check_out, room_id } = req.body;
        
        const where = {
            status: ['confirmed', 'checked_in'],
            [Op.or]: [
                {
                    check_in: { [Op.lte]: check_out },
                    check_out: { [Op.gte]: check_in }
                }
            ]
        };
        
        if (room_id) {
            where.room_id = room_id;
        }
        
        const conflictingBookings = await db.Booking.findAll({ where });
        const bookedRoomIds = [...new Set(conflictingBookings.map(b => b.room_id))];
        
        const availableRooms = await db.Room.findAll({
            where: {
                id: { [Op.notIn]: bookedRoomIds },
                status: 'available'
            },
            include: [{ model: db.RoomType }]
        });
        
        // Check if specific room is available
        if (room_id) {
            const isAvailable = availableRooms.some(r => r.id === parseInt(room_id));
            return res.json({ 
                success: true, 
                available: isAvailable,
                message: isAvailable ? 'Room is available' : 'Room is not available for selected dates'
            });
        }
        
        res.json({ success: true, availableRooms });
    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get rooms available for date range
router.post('/rooms', async (req, res) => {
    try {
        const { check_in, check_out, adults = 1, children = 0 } = req.body;
        
        if (!check_in || !check_out) {
            return res.status(400).json({ error: 'Check-in and check-out dates are required' });
        }
        
        const totalGuests = parseInt(adults) + parseInt(children);
        
        // Get all rooms that are booked for the period
        const bookedRooms = await db.Booking.findAll({
            where: {
                status: { [Op.notIn]: ['cancelled', 'checked_out'] },
                [Op.or]: [
                    { check_in: { [Op.lt]: check_out } },
                    { check_out: { [Op.gt]: check_in } }
                ]
            },
            attributes: ['room_id'],
            raw: true
        });
        
        const bookedRoomIds = [...new Set(bookedRooms.map(b => b.room_id))];
        
        const roomWhere = { status: 'available' };
        if (bookedRoomIds.length > 0) {
            roomWhere.id = { [Op.notIn]: bookedRoomIds };
        }
        
        const availableRooms = await db.Room.findAll({
            where: roomWhere,
            include: [{ 
                model: db.RoomType,
                where: { capacity: { [Op.gte]: totalGuests } }
            }],
            order: [['room_number', 'ASC']]
        });
        
        // Calculate nights
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        
        const availableRoomsWithDetails = availableRooms.map(room => ({
            id: room.id,
            room_number: room.room_number,
            floor: room.floor,
            room_type: room.RoomType,
            total_nights: nights
        }));
        
        res.json({ availableRooms: availableRoomsWithDetails });
    } catch (error) {
        console.error('Availability rooms error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get room availability status for a specific room
router.get('/room/:id', async (req, res) => {
    try {
        const room = await db.Room.findByPk(req.params.id, {
            include: [{ model: db.RoomType }]
        });
        
        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }
        
        const isAvailable = room.status === 'available';
        
        res.json({ 
            success: true, 
            room: {
                id: room.id,
                room_number: room.room_number,
                status: room.status,
                is_available: isAvailable
            }
        });
    } catch (error) {
        console.error('Room status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/availability/calculate - Calculate price (with validateAvailability middleware)
router.post('/calculate', validateAvailability, async (req, res, next) => {
    try {
        const { roomTypeId, checkIn, checkOut } = req.body;
        
        const priceDetails = await PricingService.calculatePrice(
            roomTypeId, checkIn, checkOut, new Date()
        );
        
        res.json({
            success: true,
            ...priceDetails
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/availability/occupancy - Get occupancy rate
router.get('/occupancy', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required'
            });
        }
        
        const occupancy = await AvailabilityService.getOccupancyRate(startDate, endDate);
        
        res.json({
            success: true,
            occupancy: Math.round(occupancy * 100) / 100,
            startDate,
            endDate
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;