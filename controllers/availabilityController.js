const { AvailabilityService, PricingService } = require('../services');

class AvailabilityController {
    
    // Check room availability
    static async checkAvailability(req, res, next) {
        try {
            const { checkIn, checkOut, adults, children, roomTypeId } = req.body;
            
            let availableRooms;
            
            if (roomTypeId) {
                availableRooms = await AvailabilityService.getAvailableRoomsByType(
                    roomTypeId, checkIn, checkOut
                );
            } else {
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
    }
    
    // Calculate price
    static async calculatePrice(req, res, next) {
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
    }
    
    // Get occupancy rate
    static async getOccupancy(req, res, next) {
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
    }
}

module.exports = AvailabilityController;