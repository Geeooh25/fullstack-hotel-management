const { Housekeeping, Room, RoomType, User } = require('../models');
const { ROOM_STATUS } = require('../utils/constants');
const { Op } = require('sequelize');

class HousekeepingController {
    
    // Get all housekeeping tasks
    static async getAll(req, res, next) {
        try {
            const { status, assigned_to } = req.query;
            
            let where = {};
            if (status) where.status = status;
            if (assigned_to) where.assigned_to = assigned_to;
            
            const tasks = await Housekeeping.findAll({
                where,
                include: [
                    { model: Room, include: [{ model: RoomType }] },
                    { model: User, as: 'assigned_staff', attributes: ['id', 'first_name', 'last_name'] },
                    { model: User, as: 'created_by_user', attributes: ['id', 'first_name', 'last_name'] }
                ],
                order: [
                    ['priority', 'ASC'],
                    ['created_at', 'ASC']
                ]
            });
            
            res.json({
                success: true,
                tasks: tasks
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get task by ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            
            const task = await Housekeeping.findByPk(id, {
                include: [
                    { model: Room, include: [{ model: RoomType }] },
                    { model: User, as: 'assigned_staff', attributes: ['id', 'first_name', 'last_name'] }
                ]
            });
            
            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }
            
            res.json({
                success: true,
                task: task
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Create housekeeping task
    static async create(req, res, next) {
        try {
            const { room_id, priority, notes } = req.body;
            
            // Check if room exists
            const room = await Room.findByPk(room_id);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    error: 'Room not found'
                });
            }
            
            // Check if there's already a pending task for this room
            const existingTask = await Housekeeping.findOne({
                where: {
                    room_id: room_id,
                    status: { [Op.in]: ['pending', 'in_progress'] }
                }
            });
            
            if (existingTask) {
                return res.status(400).json({
                    success: false,
                    error: 'There is already a pending task for this room'
                });
            }
            
            const task = await Housekeeping.create({
                room_id,
                priority: priority || 'normal',
                notes,
                status: 'pending',
                created_by: req.user ? req.user.id : null
            });
            
            // Update room status to cleaning
            await room.update({ status: ROOM_STATUS.CLEANING });
            
            res.status(201).json({
                success: true,
                task: task
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Assign task to staff
    static async assign(req, res, next) {
        try {
            const { id } = req.params;
            const { assigned_to } = req.body;
            
            const task = await Housekeeping.findByPk(id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }
            
            // Check if staff exists
            const staff = await User.findByPk(assigned_to);
            if (!staff || staff.role !== 'housekeeping') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid staff member'
                });
            }
            
            task.assigned_to = assigned_to;
            await task.save();
            
            res.json({
                success: true,
                task: task
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Start task
    static async startTask(req, res, next) {
        try {
            const { id } = req.params;
            
            const task = await Housekeeping.findByPk(id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }
            
            if (task.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: `Cannot start task with status: ${task.status}`
                });
            }
            
            task.status = 'in_progress';
            task.started_at = new Date();
            await task.save();
            
            res.json({
                success: true,
                task: task
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Complete task
    static async completeTask(req, res, next) {
        try {
            const { id } = req.params;
            
            const task = await Housekeeping.findByPk(id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }
            
            if (task.status !== 'in_progress') {
                return res.status(400).json({
                    success: false,
                    error: `Cannot complete task with status: ${task.status}`
                });
            }
            
            task.status = 'completed';
            task.completed_at = new Date();
            await task.save();
            
            // Update room status to available
            await Room.update(
                { status: ROOM_STATUS.AVAILABLE },
                { where: { id: task.room_id } }
            );
            
            res.json({
                success: true,
                task: task
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Cancel/Delete task
    static async cancelTask(req, res, next) {
        try {
            const { id } = req.params;
            
            const task = await Housekeeping.findByPk(id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }
            
            await task.destroy();
            
            // Update room status back to previous (or available)
            await Room.update(
                { status: ROOM_STATUS.AVAILABLE },
                { where: { id: task.room_id } }
            );
            
            res.json({
                success: true,
                message: 'Task cancelled successfully'
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get dashboard stats
    static async getStats(req, res, next) {
        try {
            const pendingTasks = await Housekeeping.count({
                where: { status: 'pending' }
            });
            
            const inProgressTasks = await Housekeeping.count({
                where: { status: 'in_progress' }
            });
            
            const completedToday = await Housekeeping.count({
                where: {
                    status: 'completed',
                    completed_at: {
                        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            });
            
            // Get rooms needing cleaning (occupied rooms that checked out today)
            const roomsToClean = await Room.count({
                where: { status: ROOM_STATUS.CLEANING }
            });
            
            // Get tasks by priority
            const urgentTasks = await Housekeeping.count({
                where: { priority: 'urgent', status: { [Op.ne]: 'completed' } }
            });
            
            const highTasks = await Housekeeping.count({
                where: { priority: 'high', status: { [Op.ne]: 'completed' } }
            });
            
            res.json({
                success: true,
                stats: {
                    pendingTasks,
                    inProgressTasks,
                    completedToday,
                    roomsToClean,
                    urgentTasks,
                    highTasks
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = HousekeepingController;