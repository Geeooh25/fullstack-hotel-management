const { body, validationResult } = require('express-validator');

// Validate booking request
const validateBooking = [
    body('roomId').isInt().withMessage('Valid room ID is required'),
    body('checkIn').isDate().withMessage('Valid check-in date is required'),
    body('checkOut').isDate().withMessage('Valid check-out date is required')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.checkIn)) {
                throw new Error('Check-out must be after check-in');
            }
            return true;
        }),
    body('adults').optional().isInt({ min: 1 }).withMessage('At least 1 adult required'),
    body('guest').isObject().withMessage('Guest information required'),
    body('guest.firstName').notEmpty().withMessage('First name is required'),
    body('guest.lastName').notEmpty().withMessage('Last name is required'),
    body('guest.email').isEmail().withMessage('Valid email is required'),
    body('guest.phone').optional().isString(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validate availability check
const validateAvailability = [
    body('checkIn').isDate().withMessage('Valid check-in date is required'),
    body('checkOut').isDate().withMessage('Valid check-out date is required')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.checkIn)) {
                throw new Error('Check-out must be after check-in');
            }
            return true;
        }),
    body('adults').optional().isInt({ min: 1 }).withMessage('At least 1 adult required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validate login
const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validate room creation/update
const validateRoom = [
    body('room_number').notEmpty().withMessage('Room number is required'),
    body('room_type_id').isInt().withMessage('Valid room type is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.xhr || req.headers.accept === 'application/json') {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }
            req.flash('errors', errors.array());
            return res.redirect('back');
        }
        next();
    }
];

// Validate guest creation/update
const validateGuest = [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateBooking,
    validateAvailability,
    validateLogin,
    validateRoom,
    validateGuest
};