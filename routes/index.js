const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');

// Homepage
router.get('/', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rooms page
router.get('/rooms', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/rooms.html'));
});

// Room detail page
router.get('/room-detail', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/room-detail.html'));
});

// Booking page
router.get('/booking', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/booking.html'));
});

// Booking confirmation page
router.get('/booking-confirmation', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/booking-confirmation.html'));
});

// Booking lookup page
router.get('/booking-lookup', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/booking-lookup.html'));
});

// Contact page
router.get('/contact', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/contact.html'));
});

// About page
router.get('/about', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/about.html'));
});

// Gallery page
router.get('/gallery', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/gallery.html'));
});

// Amenities page
router.get('/amenities', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/amenities.html'));
});

// Terms page
router.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/terms.html'));
});

// Privacy page
router.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/privacy.html'));
});

module.exports = router;