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
const ServiceOrder = require('./serviceOrder');
// Stage 3 Models
const SystemSetting = require('./SystemSetting');
const NotificationSetting = require('./NotificationSetting');
const ActivityLog = require('./ActivityLog');
const TimeSlot = require('./timeSlot');
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
    ServiceOrder,
    MenuItem,
    CartItem,
    BookingService,
    RequestSubmission,
    SystemSetting,
    NotificationSetting,
    ActivityLog
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

// MenuItem to BookingService
models.BookingService.belongsTo(models.MenuItem, { foreignKey: 'menu_item_id', as: 'menu_item' });
models.MenuItem.hasMany(models.BookingService, { foreignKey: 'menu_item_id', as: 'booking_services' });

// MenuItem to CartItem
models.MenuItem.hasMany(models.CartItem, { foreignKey: 'menu_item_id', as: 'cart_items' });
models.CartItem.belongsTo(models.MenuItem, { foreignKey: 'menu_item_id', as: 'menu_item' });


MenuItem.hasMany(TimeSlot, { foreignKey: 'menu_item_id' });
TimeSlot.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });
// ==================== REQUEST SUBMISSION ASSOCIATIONS ====================
// Amenity to RequestSubmission (This works - table has amenity_id column)
models.Amenity.hasMany(models.RequestSubmission, { foreignKey: 'amenity_id', as: 'requests' });
models.RequestSubmission.belongsTo(models.Amenity, { foreignKey: 'amenity_id', as: 'amenity' });

// NOTE: User and Booking associations are commented out because the request_submissions table 
// does not have user_id or booking_id columns. If needed later, add those columns first.

// models.User.hasMany(models.RequestSubmission, { foreignKey: 'user_id', as: 'requests' });
// models.RequestSubmission.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

// models.Booking.hasMany(models.RequestSubmission, { foreignKey: 'booking_id', as: 'requests' });
// models.RequestSubmission.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });

// ==================== ACTIVITY LOG ASSOCIATIONS ====================
models.ActivityLog.belongsTo(models.User, { foreignKey: 'admin_id', as: 'admin' });
models.User.hasMany(models.ActivityLog, { foreignKey: 'admin_id', as: 'activity_logs' });

module.exports = models;