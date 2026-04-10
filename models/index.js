const { sequelize } = require('../config/database');
const User = require('./User');
const RoomType = require('./RoomType');
const Room = require('./Room');
const Guest = require('./Guest');
const Booking = require('./Booking');
const Payment = require('./Payment');
const Housekeeping = require('./Housekeeping');
const Setting = require('./Setting');
const EmailLog = require('./EmailLog');

// New models
const Amenity = require('./amenity');
const MenuCategory = require('./menuCategory');
const MenuItem = require('./menuItem');
const CartItem = require('./cartItem');
const BookingService = require('./bookingService');
const RequestSubmission = require('./requestSubmission');

const models = {
    User,
    RoomType,
    Room,
    Guest,
    Booking,
    Payment,
    Housekeeping,
    Setting,
    EmailLog,
    Amenity,
    MenuCategory,
    MenuItem,
    CartItem,
    BookingService,
    RequestSubmission
};

// ==================== ASSOCIATIONS ====================

// Room Type to Room
models.RoomType.hasMany(models.Room, { foreignKey: 'room_type_id' });
models.Room.belongsTo(models.RoomType, { foreignKey: 'room_type_id' });

// Room to Booking
models.Room.hasMany(models.Booking, { foreignKey: 'room_id' });
models.Booking.belongsTo(models.Room, { foreignKey: 'room_id' });

// Guest to Booking
models.Guest.hasMany(models.Booking, { foreignKey: 'guest_id', as: 'bookings' });
models.Booking.belongsTo(models.Guest, { foreignKey: 'guest_id' });

// Booking to Payment
models.Booking.hasMany(models.Payment, { foreignKey: 'booking_id' });
models.Payment.belongsTo(models.Booking, { foreignKey: 'booking_id' });

// User to Booking
models.User.hasMany(models.Booking, { foreignKey: 'user_id', as: 'bookings' });
models.Booking.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

// Amenity to MenuCategory
models.Amenity.hasMany(models.MenuCategory, { foreignKey: 'amenity_id', as: 'menu_categories' });
models.MenuCategory.belongsTo(models.Amenity, { foreignKey: 'amenity_id', as: 'amenity' });

// MenuCategory to MenuItem
models.MenuCategory.hasMany(models.MenuItem, { foreignKey: 'category_id', as: 'items' });
models.MenuItem.belongsTo(models.MenuCategory, { foreignKey: 'category_id', as: 'category' });

// Booking to BookingService
models.Booking.hasMany(models.BookingService, { foreignKey: 'booking_id', as: 'services' });
models.BookingService.belongsTo(models.Booking, { foreignKey: 'booking_id' });

// ===== CRITICAL FIX: MenuItem to BookingService =====
models.BookingService.belongsTo(models.MenuItem, { foreignKey: 'menu_item_id', as: 'menu_item' });
models.MenuItem.hasMany(models.BookingService, { foreignKey: 'menu_item_id', as: 'booking_services' });

// MenuItem to CartItem
models.MenuItem.hasMany(models.CartItem, { foreignKey: 'menu_item_id', as: 'cart_items' });
models.CartItem.belongsTo(models.MenuItem, { foreignKey: 'menu_item_id', as: 'menu_item' });

// Amenity to RequestSubmission
models.Amenity.hasMany(models.RequestSubmission, { foreignKey: 'amenity_id', as: 'requests' });
models.RequestSubmission.belongsTo(models.Amenity, { foreignKey: 'amenity_id', as: 'amenity' });

module.exports = models;