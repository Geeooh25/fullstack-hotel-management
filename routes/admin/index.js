const express = require('express');
const router = express.Router();

// Import admin routes
const dashboardRoutes = require('./dashboard');
const roomsRoutes = require('./rooms');
const bookingsRoutes = require('./bookings');
const guestsRoutes = require('./guests');
const calendarRoutes = require('./calendar');
const housekeepingRoutes = require('./housekeeping');
const reportsRoutes = require('./reports');
const settingsRoutes = require('./settings');

// Mount routes
router.use('/dashboard', dashboardRoutes);
router.use('/rooms', roomsRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/guests', guestsRoutes);
router.use('/calendar', calendarRoutes);
router.use('/housekeeping', housekeepingRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);

// Admin home redirects to dashboard
router.get('/', (req, res) => {
    res.redirect('/admin/dashboard');
});

module.exports = router;