const { User } = require('../models');
const jwt = require('jsonwebtoken');

// Check if user is authenticated (supports both session and JWT)
const isAuthenticated = async (req, res, next) => {
    // Check JWT token first (for public/guest users)
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-me');
            const user = await User.findByPk(decoded.id);
            if (user && user.is_active) {
                req.user = user;
                req.userId = user.id;
                return next();
            }
        } catch (error) {
            // Token invalid, continue to session check
        }
    }
    
    // Check session (for admin panel)
    if (req.session && req.session.userId) {
        const user = await User.findByPk(req.session.userId);
        if (user) {
            req.user = user;
            req.userId = user.id;
            return next();
        }
    }
    
    // Check if it's an API request
    if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({
            success: false,
            error: 'Please login to access this resource'
        });
    }
    
    // Redirect to login page for HTML requests
    req.session.returnTo = req.originalUrl;
    res.redirect('/admin/login.html');
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
    // Check JWT first
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-me');
            const user = await User.findByPk(decoded.id);
            if (user && user.role === 'admin') {
                req.user = user;
                req.userId = user.id;
                return next();
            }
        } catch (error) {}
    }
    
    // Check session
    if (!req.session || !req.session.userId) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ success: false, error: 'Please login' });
        }
        req.session.returnTo = req.originalUrl;
        return res.redirect('/admin/login.html');
    }
    
    const user = await User.findByPk(req.session.userId);
    
    if (!user || user.role !== 'admin') {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        return res.status(403).send('Admin access required');
    }
    
    req.user = user;
    req.userId = user.id;
    next();
};

// Check if user is staff (admin or receptionist)
const isStaff = async (req, res, next) => {
    // Check JWT first
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-me');
            const user = await User.findByPk(decoded.id);
            if (user && (user.role === 'admin' || user.role === 'receptionist')) {
                req.user = user;
                req.userId = user.id;
                return next();
            }
        } catch (error) {}
    }
    
    // Check session
    if (!req.session || !req.session.userId) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ success: false, error: 'Please login' });
        }
        req.session.returnTo = req.originalUrl;
        return res.redirect('/admin/login.html');
    }
    
    const user = await User.findByPk(req.session.userId);
    
    if (!user || (user.role !== 'admin' && user.role !== 'receptionist')) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(403).json({ success: false, error: 'Staff access required' });
        }
        return res.status(403).send('Staff access required');
    }
    
    req.user = user;
    req.userId = user.id;
    next();
};

// Optional auth (for public routes that can show user info if logged in)
const optionalAuth = async (req, res, next) => {
    // Check JWT first
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-me');
            const user = await User.findByPk(decoded.id);
            if (user) {
                req.user = user;
                req.userId = user.id;
            }
        } catch (error) {}
    }
    
    // Check session
    if (req.session && req.session.userId && !req.user) {
        const user = await User.findByPk(req.session.userId);
        if (user) {
            req.user = user;
            req.userId = user.id;
        }
    }
    
    next();
};

// NEW: Middleware for guest users (doesn't require auth, but attaches user if available)
const optionalAuthForGuests = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-me');
            const user = await User.findByPk(decoded.id);
            if (user && user.is_active) {
                req.user = user;
                req.userId = user.id;
            }
        } catch (error) {}
    }
    
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isStaff,
    optionalAuth,
    optionalAuthForGuests
};