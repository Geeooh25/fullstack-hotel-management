const { Op } = require('sequelize');
const { Booking, Room, RoomType } = require('../models');
const { BOOKING_STATUS, ROOM_STATUS } = require('../utils/constants');
const { calculateNights, datesOverlap } = require('../utils/dateUtils');

class AvailabilityService {
    /**
     * Check if a specific room is available for given dates
     * @param {number} roomId - Room ID
     * @param {string} checkIn - YYYY-MM-DD
     * @param {string} checkOut - YYYY-MM-DD
     * @returns {Promise<boolean>} - True if available
     */
    static async isRoomAvailable(roomId, checkIn, checkOut) {
        // First check if room exists and is not in maintenance
        const room = await Room.findByPk(roomId);
        if (!room) return false;
        if (room.status === ROOM_STATUS.MAINTENANCE) return false;

        // Check for overlapping bookings
        const overlappingBookings = await Booking.findAll({
            where: {
                room_id: roomId,
                status: {
                    [Op.notIn]: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CHECKED_OUT]
                },
                [Op.and]: [
                    { check_in: { [Op.lt]: checkOut } },
                    { check_out: { [Op.gt]: checkIn } }
                ]
            }
        });

        return overlappingBookings.length === 0;
    }

    /**
     * Get all available rooms for given dates
     * @param {string} checkIn - YYYY-MM-DD
     * @param {string} checkOut - YYYY-MM-DD
     * @param {number} adults - Number of adults
     * @param {number} children - Number of children
     * @returns {Promise<Array>} - List of available rooms with details
     */
    static async getAvailableRooms(checkIn, checkOut, adults = 1, children = 0) {
        const totalGuests = adults + children;

        // Get all active rooms
        const allRooms = await Room.findAll({
            where: {
                status: {
                    [Op.notIn]: [ROOM_STATUS.MAINTENANCE]
                }
            },
            include: [{
                model: RoomType,
                where: { is_active: true }
            }]
        });

        // Filter rooms by capacity and availability
        const availableRooms = [];
        
        for (const room of allRooms) {
            // Check capacity
            if (room.RoomType.capacity < totalGuests) continue;
            
            // Check availability
            const isAvailable = await this.isRoomAvailable(room.id, checkIn, checkOut);
            if (isAvailable) {
                availableRooms.push({
                    id: room.id,
                    room_number: room.room_number,
                    floor: room.floor,
                    room_type: room.RoomType,
                    total_guests: totalGuests,
                    max_capacity: room.RoomType.capacity
                });
            }
        }

        return availableRooms;
    }

    /**
     * Check availability for a specific room type
     * @param {number} roomTypeId - Room Type ID
     * @param {string} checkIn - YYYY-MM-DD
     * @param {string} checkOut - YYYY-MM-DD
     * @returns {Promise<Array>} - List of available rooms of this type
     */
    static async getAvailableRoomsByType(roomTypeId, checkIn, checkOut) {
        const rooms = await Room.findAll({
            where: {
                room_type_id: roomTypeId,
                status: { [Op.notIn]: [ROOM_STATUS.MAINTENANCE] }
            }
        });

        const availableRooms = [];
        for (const room of rooms) {
            const isAvailable = await this.isRoomAvailable(room.id, checkIn, checkOut);
            if (isAvailable) {
                availableRooms.push(room);
            }
        }

        return availableRooms;
    }

    /**
     * Get all booked rooms for a date range
     * @param {string} checkIn - YYYY-MM-DD
     * @param {string} checkOut - YYYY-MM-DD
     * @returns {Promise<Array>} - List of booked room IDs
     */
    static async getBookedRooms(checkIn, checkOut) {
        const bookings = await Booking.findAll({
            where: {
                status: {
                    [Op.notIn]: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CHECKED_OUT]
                },
                [Op.and]: [
                    { check_in: { [Op.lt]: checkOut } },
                    { check_out: { [Op.gt]: checkIn } }
                ]
            },
            attributes: ['room_id']
        });

        return bookings.map(b => b.room_id);
    }

    /**
     * Get occupancy rate for a date range
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {Promise<number>} - Occupancy percentage
     */
    static async getOccupancyRate(startDate, endDate) {
        const totalRooms = await Room.count({
            where: { status: { [Op.ne]: ROOM_STATUS.MAINTENANCE } }
        });

        if (totalRooms === 0) return 0;

        const bookedRooms = await this.getBookedRooms(startDate, endDate);
        const uniqueBookedRooms = [...new Set(bookedRooms)];
        
        return (uniqueBookedRooms.length / totalRooms) * 100;
    }
}

module.exports = AvailabilityService;