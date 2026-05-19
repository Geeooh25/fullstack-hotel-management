const express = require('express');
const router = express.Router();
const { AvailabilityService, PricingService } = require('../../services');
const { validateAvailability } = require('../../middleware/validation');
const db = require('../../models');
const { Op } = require('sequelize');

// Check room availability
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
        
        res.json({ success: true, availableRooms });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get room availability status for a specific date
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
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/availability/check - Check room availability
router.post('/check', validateAvailability, async (req, res, next) => {
    try {
        const { checkIn, checkOut, adults, children, roomTypeId } = req.body;
        
        let availableRooms;
        
        if (roomTypeId) {
            // Check specific room type
            availableRooms = await AvailabilityService.getAvailableRoomsByType(
                roomTypeId, checkIn, checkOut
            );
        } else {
            // Check all rooms
            availableRooms = await AvailabilityService.getAvailableRooms(
                checkIn, checkOut, adults || 1, children || 0
            );
        }
        
        res.json({
            success: true,
            available: availableRooms.length > 0,
            count: availableRooms.length,
            rooms: availableRooms
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/availability/calculate - Calculate price
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