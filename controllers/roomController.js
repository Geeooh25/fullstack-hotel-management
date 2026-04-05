const { Room, RoomType } = require('../models');
const { Op } = require('sequelize');

class RoomController {
    
    // Get all rooms
    static async getAll(req, res, next) {
        try {
            const rooms = await Room.findAll({
                include: [{
                    model: RoomType,
                    where: { is_active: true }
                }],
                order: [['room_number', 'ASC']]
            });
            
            res.json({
                success: true,
                count: rooms.length,
                rooms: rooms
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get single room by ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            const room = await Room.findByPk(id, {
                include: [{ model: RoomType }]
            });
            
            if (!room) {
                return res.status(404).json({
                    success: false,
                    error: 'Room not found'
                });
            }
            
            res.json({
                success: true,
                room: room
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get all room types
    static async getRoomTypes(req, res, next) {
        try {
            const roomTypes = await RoomType.findAll({
                where: { is_active: true },
                order: [['base_price', 'ASC']]
            });
            
            res.json({
                success: true,
                roomTypes: roomTypes
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Admin: Create room
    static async create(req, res, next) {
        try {
            const { room_number, room_type_id, floor, status, notes } = req.body;
            
            const existingRoom = await Room.findOne({ where: { room_number } });
            if (existingRoom) {
                return res.status(400).json({
                    success: false,
                    error: 'Room number already exists'
                });
            }
            
            const room = await Room.create({
                room_number,
                room_type_id,
                floor,
                status,
                notes
            });
            
            res.status(201).json({
                success: true,
                room: room
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Admin: Update room
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const room = await Room.findByPk(id);
            
            if (!room) {
                return res.status(404).json({
                    success: false,
                    error: 'Room not found'
                });
            }
            
            await room.update(req.body);
            
            res.json({
                success: true,
                room: room
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Admin: Delete room
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            const room = await Room.findByPk(id);
            
            if (!room) {
                return res.status(404).json({
                    success: false,
                    error: 'Room not found'
                });
            }
            
            await room.destroy();
            
            res.json({
                success: true,
                message: 'Room deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = RoomController;