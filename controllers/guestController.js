const { Guest, Booking, Room, RoomType } = require('../models');
const { Op } = require('sequelize');

class GuestController {
    
    // Get all guests
    static async getAll(req, res, next) {
        try {
            const { search, limit = 50, offset = 0 } = req.query;
            
            let where = {};
            
            if (search) {
                where = {
                    [Op.or]: [
                        { first_name: { [Op.iLike]: `%${search}%` } },
                        { last_name: { [Op.iLike]: `%${search}%` } },
                        { email: { [Op.iLike]: `%${search}%` } },
                        { phone: { [Op.iLike]: `%${search}%` } }
                    ]
                };
            }
            
            const guests = await Guest.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
            res.json({
                success: true,
                total: guests.count,
                guests: guests.rows
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get guest by ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            
            const guest = await Guest.findByPk(id);
            
            if (!guest) {
                return res.status(404).json({
                    success: false,
                    error: 'Guest not found'
                });
            }
            
            // Get guest's booking history
            const bookings = await Booking.findAll({
                where: { guest_id: id },
                include: [
                    { model: Room, include: [{ model: RoomType }] }
                ],
                order: [['created_at', 'DESC']]
            });
            
            res.json({
                success: true,
                guest: guest,
                bookings: bookings
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Create new guest
    static async create(req, res, next) {
        try {
            const {
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                country,
                id_type,
                id_number,
                notes
            } = req.body;
            
            // Check if guest already exists
            const existingGuest = await Guest.findOne({ where: { email } });
            if (existingGuest) {
                return res.status(400).json({
                    success: false,
                    error: 'Guest with this email already exists'
                });
            }
            
            const guest = await Guest.create({
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                country,
                id_type,
                id_number,
                notes
            });
            
            res.status(201).json({
                success: true,
                guest: guest
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Update guest
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            
            const guest = await Guest.findByPk(id);
            
            if (!guest) {
                return res.status(404).json({
                    success: false,
                    error: 'Guest not found'
                });
            }
            
            await guest.update(req.body);
            
            res.json({
                success: true,
                guest: guest
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Toggle blacklist status
    static async toggleBlacklist(req, res, next) {
        try {
            const { id } = req.params;
            const { blacklisted } = req.body;
            
            const guest = await Guest.findByPk(id);
            
            if (!guest) {
                return res.status(404).json({
                    success: false,
                    error: 'Guest not found'
                });
            }
            
            guest.is_blacklisted = blacklisted;
            await guest.save();
            
            res.json({
                success: true,
                guest: guest
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Add note to guest
    static async addNote(req, res, next) {
        try {
            const { id } = req.params;
            const { note } = req.body;
            
            const guest = await Guest.findByPk(id);
            
            if (!guest) {
                return res.status(404).json({
                    success: false,
                    error: 'Guest not found'
                });
            }
            
            const timestamp = new Date().toLocaleString();
            const currentNotes = guest.notes || '';
            guest.notes = currentNotes + `\n[${timestamp}] ${note}`;
            await guest.save();
            
            res.json({
                success: true,
                guest: guest
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get guest statistics
    static async getStats(req, res, next) {
        try {
            const totalGuests = await Guest.count();
            const returningGuests = await Guest.count({
                where: { total_stays: { [Op.gt]: 1 } }
            });
            const blacklistedGuests = await Guest.count({
                where: { is_blacklisted: true }
            });
            
            // Get top guests by total spent
            const topGuests = await Guest.findAll({
                order: [['total_spent', 'DESC']],
                limit: 10,
                attributes: ['id', 'first_name', 'last_name', 'email', 'total_stays', 'total_spent']
            });
            
            // Get guests joined this month
            const firstDayOfMonth = new Date();
            firstDayOfMonth.setDate(1);
            firstDayOfMonth.setHours(0, 0, 0, 0);
            
            const newGuestsThisMonth = await Guest.count({
                where: {
                    created_at: { [Op.gte]: firstDayOfMonth }
                }
            });
            
            res.json({
                success: true,
                stats: {
                    totalGuests,
                    returningGuests,
                    blacklistedGuests,
                    newGuestsThisMonth,
                    returningPercentage: totalGuests > 0 ? (returningGuests / totalGuests * 100).toFixed(1) : 0
                },
                topGuests
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = GuestController;