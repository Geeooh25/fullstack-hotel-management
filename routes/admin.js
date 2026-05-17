const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminAuthenticated, isAdminGuest } = require('../middleware/auth');

// ==================== AUTHENTICATION ====================
router.get('/login', isAdminGuest, adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', isAdminAuthenticated, adminController.logout);

// ==================== DASHBOARD ====================
router.get('/dashboard', isAdminAuthenticated, adminController.getDashboard);

// ==================== BOOKINGS ====================
router.get('/bookings', isAdminAuthenticated, adminController.getBookings);
router.get('/bookings/:id', isAdminAuthenticated, adminController.getBookingDetails);
router.put('/bookings/:id/status', isAdminAuthenticated, adminController.updateBookingStatus);

// ==================== ROOMS ====================
router.get('/rooms', isAdminAuthenticated, adminController.getRooms);
router.put('/rooms/:id/status', isAdminAuthenticated, adminController.updateRoomStatus);

// ==================== AMENITIES ====================
router.get('/amenities', isAdminAuthenticated, adminController.getAmenities);
router.post('/amenities', isAdminAuthenticated, adminController.createAmenity);
router.put('/amenities/:id', isAdminAuthenticated, adminController.updateAmenity);
router.delete('/amenities/:id', isAdminAuthenticated, adminController.deleteAmenity);

// ==================== USERS ====================
router.get('/users', isAdminAuthenticated, adminController.getUsers);
router.get('/users/:id', isAdminAuthenticated, adminController.getUserDetails);
router.put('/users/:id/status', isAdminAuthenticated, adminController.updateUserStatus);

// ==================== REQUESTS ====================
router.get('/requests', isAdminAuthenticated, adminController.getRequests);
router.get('/requests/:id', isAdminAuthenticated, adminController.getRequestDetails);
router.put('/requests/:id/status', isAdminAuthenticated, adminController.updateRequestStatus);

// ==================== MENU ====================
router.get('/menu', isAdminAuthenticated, adminController.getMenu);
router.post('/menu', isAdminAuthenticated, adminController.createMenuItem);
router.put('/menu/:id', isAdminAuthenticated, adminController.updateMenuItem);
router.delete('/menu/:id', isAdminAuthenticated, adminController.deleteMenuItem);

// ==================== REPORTS ====================
router.get('/reports', isAdminAuthenticated, adminController.getReports);

// ==================== SETTINGS ====================
router.get('/settings', isAdminAuthenticated, adminController.getSettings);
router.put('/settings', isAdminAuthenticated, adminController.updateSettings);

// ==================== ACTIVITY LOGS ====================
router.get('/activity', isAdminAuthenticated, adminController.getActivityLogs);

module.exports = router;