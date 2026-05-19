const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminAuthenticated, isAdminGuest, hasRole, isSuperAdmin, canDelete } = require('../middleware/auth');

// ==================== AUTHENTICATION ====================
router.get('/login', isAdminGuest, adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', isAdminAuthenticated, adminController.logout);

// ==================== DASHBOARD ====================
// Everyone can see dashboard
router.get('/dashboard', isAdminAuthenticated, adminController.getDashboard);

// ==================== BOOKINGS ====================
// Admin, Super Admin, Receptionist can manage bookings
router.get('/bookings', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getBookings);
router.get('/bookings/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getBookingDetails);
router.put('/bookings/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.updateBookingStatus);

// ==================== ROOMS ====================
// Everyone can view rooms, only Super Admin and Admin can create/edit
router.get('/rooms', isAdminAuthenticated, adminController.getRooms);
router.get('/rooms/create', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getCreateRoom);
router.post('/rooms/create', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.createRoom);
router.get('/rooms/edit/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getEditRoom);
router.put('/rooms/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'housekeeping']), adminController.updateRoomStatus);

// Forgot Password
router.get('/forgot-password', isAdminGuest, adminController.getForgotPassword);
router.post('/forgot-password', adminController.postForgotPassword);
router.get('/reset-password/:token', isAdminGuest, adminController.getResetPassword);
router.post('/reset-password/:token', adminController.postResetPassword);
// Check-in / Check-out page
router.get('/checkin-checkout', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), (req, res) => {
    res.render('admin/checkin-checkout', { title: 'Check-in / Check-out', session: req.session });
});
// ==================== AMENITIES ====================
// Only Super Admin and Admin can manage amenities
router.get('/amenities', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getAmenities);
router.post('/amenities', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.createAmenity);
router.put('/amenities/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.updateAmenity);
router.delete('/amenities/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.deleteAmenity);

// ==================== USERS ====================
// Only Super Admin and Admin can manage users
router.get('/users', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getUsers);
router.get('/users/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getUserDetails);
router.put('/users/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.updateUserStatus);

// ==================== STAFF ====================
// Only Super Admin can manage staff (create, edit, delete)
router.get('/staff', isAdminAuthenticated, hasRole(['super_admin']), adminController.getStaff);
router.post('/staff', isAdminAuthenticated, hasRole(['super_admin']), adminController.createStaff);
router.put('/staff/:id', isAdminAuthenticated, hasRole(['super_admin']), adminController.updateStaff);
router.delete('/staff/:id', isAdminAuthenticated, hasRole(['super_admin']), canDelete, adminController.deleteStaff);

// ==================== REQUESTS ====================
// Admin, Super Admin, Receptionist can view and update requests
router.get('/requests', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getRequests);
router.get('/requests/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getRequestDetails);
router.put('/requests/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.updateRequestStatus);

// ==================== MENU ====================
// Only Super Admin and Admin can manage menu
router.get('/menu', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getMenu);
router.post('/menu', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.createMenuItem);
router.put('/menu/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.updateMenuItem);
router.delete('/menu/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.deleteMenuItem);

// ==================== COUNTER BOOKING ====================
// Admin, Super Admin, Receptionist can create counter bookings
router.get('/counter-booking', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getCounterBooking);

// ==================== HISTORICAL BOOKING ====================
// Only Super Admin can record past stays
router.get('/historical-booking', isAdminAuthenticated, hasRole(['super_admin']), adminController.getHistoricalBooking);
router.post('/historical-booking', isAdminAuthenticated, hasRole(['super_admin']), adminController.createHistoricalBooking);

// ==================== REPORTS ====================
// Only Super Admin and Admin can view reports
router.get('/reports', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getReports);

// ==================== SETTINGS ====================
// Only Super Admin can change settings
router.get('/settings', isAdminAuthenticated, hasRole(['super_admin']), adminController.getSettings);
router.put('/settings', isAdminAuthenticated, hasRole(['super_admin']), adminController.updateSettings);

// ==================== ACTIVITY LOGS ====================
// Only Super Admin and Admin can view activity logs
router.get('/activity', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getActivityLogs);

module.exports = router;