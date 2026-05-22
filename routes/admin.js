const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminAuthenticated, isAdminGuest, hasRole, isSuperAdmin, canDelete } = require('../middleware/auth');

// ==================== ROOT REDIRECT ====================
router.get('/', (req, res) => {
    res.redirect('/admin/login');
});

// ==================== AUTHENTICATION ====================
router.get('/login', isAdminGuest, adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', isAdminAuthenticated, adminController.logout);

// ==================== DASHBOARD ====================
router.get('/dashboard', isAdminAuthenticated, adminController.getDashboard);

// ==================== BOOKINGS ====================
router.get('/bookings', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getBookings);
router.get('/bookings/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getBookingDetails);
router.put('/bookings/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.updateBookingStatus);

// ==================== ROOMS ====================
router.get('/rooms', isAdminAuthenticated, adminController.getRooms);
router.get('/rooms/create', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getCreateRoom);
router.post('/rooms/create', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.createRoom);
router.get('/rooms/edit/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getEditRoom);
router.put('/rooms/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'housekeeping']), adminController.updateRoomStatus);

// ==================== AMENITIES ====================
router.get('/amenities', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getAmenities);
router.post('/amenities', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.createAmenity);
router.put('/amenities/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.updateAmenity);
router.delete('/amenities/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.deleteAmenity);

// ==================== USERS ====================
router.get('/users', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getUsers);
router.get('/users/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getUserDetails);
router.put('/users/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.updateUserStatus);

// ==================== STAFF ====================
router.get('/staff', isAdminAuthenticated, hasRole(['super_admin']), adminController.getStaff);
router.post('/staff', isAdminAuthenticated, hasRole(['super_admin']), adminController.createStaff);
router.put('/staff/:id', isAdminAuthenticated, hasRole(['super_admin']), adminController.updateStaff);
router.delete('/staff/:id', isAdminAuthenticated, hasRole(['super_admin']), canDelete, adminController.deleteStaff);

// ==================== REQUESTS ====================
router.get('/requests', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getRequests);
router.get('/requests/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getRequestDetails);
router.put('/requests/:id/status', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.updateRequestStatus);

// ==================== MENU ====================
router.get('/menu', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getMenu);
router.post('/menu', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.createMenuItem);
router.put('/menu/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.updateMenuItem);
router.delete('/menu/:id', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.deleteMenuItem);

// ==================== COUNTER BOOKING ====================
router.get('/counter-booking', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), adminController.getCounterBooking);

// ==================== CHECK-IN / CHECK-OUT ====================
router.get('/checkin-checkout', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), (req, res) => {
    res.render('admin/checkin-checkout', { title: 'Check-in / Check-out', session: req.session });
});

// ==================== HISTORICAL BOOKING ====================
router.get('/historical-booking', isAdminAuthenticated, hasRole(['super_admin']), adminController.getHistoricalBooking);
router.post('/historical-booking', isAdminAuthenticated, hasRole(['super_admin']), adminController.createHistoricalBooking);

// ==================== REPORTS ====================
router.get('/reports', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getReports);

// ==================== SETTINGS ====================
router.get('/settings', isAdminAuthenticated, hasRole(['super_admin']), adminController.getSettings);
router.put('/settings', isAdminAuthenticated, hasRole(['super_admin']), adminController.updateSettings);

// ==================== ACTIVITY LOGS ====================
router.get('/activity', isAdminAuthenticated, hasRole(['super_admin', 'admin']), adminController.getActivityLogs);
// Download booking receipt
router.get('/bookings/:id/receipt', isAdminAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const PDFService = require('../services/pdfservice');
        const db = require('../models');
        
        const booking = await db.Booking.findByPk(id, {
            include: [
                { model: db.Guest },
                { model: db.Room, include: [{ model: db.RoomType }] },
                { model: db.Payment },
                { 
                    model: db.BookingService,
                    as: 'services',
                    include: [{ model: db.MenuItem, as: 'menu_item' }]
                }
            ]
        });
        
        if (!booking) {
            return res.status(404).send('Booking not found');
        }
        
        const pdfBuffer = await PDFService.generateReceipt(
            booking,
            booking.Guest,
            booking.Room,
            booking.Payments || [],
            booking.services || []
        );
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${booking.booking_reference}.pdf"`);
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Receipt error:', error);
        res.status(500).send('Error generating receipt');
    }
});

// ==================== SERVICE ORDERS ====================
router.get('/service-orders', isAdminAuthenticated, hasRole(['super_admin', 'admin', 'receptionist']), async (req, res) => {
    try {
        const ServiceOrder = require('../models/serviceOrder');
        const orders = await ServiceOrder.findAll({ order: [['created_at', 'DESC']] });
        res.render('admin/serviceOrders', {
            title: 'Service Orders',
            orders: orders.map(o => o.toJSON()),
            session: req.session
        });
    } catch (error) {
        res.render('admin/serviceOrders', {
            title: 'Service Orders',
            orders: [],
            error: error.message,
            session: req.session
        });
    }
});

router.post('/service-orders/:id/status', isAdminAuthenticated, async (req, res) => {
    try {
        const ServiceOrder = require('../models/serviceOrder');
        await ServiceOrder.update({ status: req.body.status }, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;