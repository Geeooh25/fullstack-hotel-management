const express = require('express');
const router = express.Router();
const { AvailabilityService, PricingService } = require('../../services');
const { validateAvailability } = require('../../middleware/validation');

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