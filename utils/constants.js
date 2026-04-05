// Booking Status Constants
const BOOKING_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    CHECKED_OUT: 'checked_out',
    CANCELLED: 'cancelled'
};

// Payment Status Constants
const PAYMENT_STATUS = {
    UNPAID: 'unpaid',
    DEPOSIT: 'deposit',
    PAID: 'paid',
    REFUNDED: 'refunded'
};

// Room Status Constants
const ROOM_STATUS = {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    MAINTENANCE: 'maintenance',
    CLEANING: 'cleaning'
};

// User Role Constants
const USER_ROLES = {
    ADMIN: 'admin',
    RECEPTIONIST: 'receptionist',
    HOUSEKEEPING: 'housekeeping'
};

// Booking Source Constants
const BOOKING_SOURCE = {
    ONLINE: 'online',
    PHONE: 'phone',
    WALK_IN: 'walk_in',
    AGENCY: 'agency'
};

module.exports = {
    BOOKING_STATUS,
    PAYMENT_STATUS,
    ROOM_STATUS,
    USER_ROLES,
    BOOKING_SOURCE
};