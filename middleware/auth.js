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

// Middleware for guest users (doesn't require auth, but attaches user if available)
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

// NEW: Check if admin is authenticated for EJS views (session-based)
const isAdminAuthenticated = async (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    }
    res.redirect('/admin/login');
};

// NEW: Check if admin is guest (not logged in)
const isAdminGuest = async (req, res, next) => {
    if (!req.session || !req.session.admin) {
        return next();
    }
    res.redirect('/admin/dashboard');
};

// Check if user has specific role
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }
        if (roles.includes(req.session.admin.role)) {
            return next();
        }
        return res.status(403).render('admin/error', { 
            title: 'Access Denied', 
            message: 'You do not have permission to access this page.',
            session: req.session 
        });
    };
};

// Check if user is super admin (only one who can manage staff)
const isSuperAdmin = (req, res, next) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    if (req.session.admin.role === 'super_admin') {
        return next();
    }
    return res.status(403).render('admin/error', { 
        title: 'Access Denied', 
        message: 'Only Super Admin can access this page.',
        session: req.session 
    });
};

// Check if user can delete (only super admin and admin, but not self)
const canDelete = (req, res, next) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    const targetId = parseInt(req.params.id);
    const currentUserId = req.session.admin.id;
    
    // Cannot delete yourself
    if (targetId === currentUserId) {
        return res.status(403).json({ error: 'You cannot delete your own account' });
    }
    
    // Super admin can delete anyone except themselves
    if (req.session.admin.role === 'super_admin') {
        return next();
    }
    
    // Admin can delete only guests and receptionists, not other admins
    if (req.session.admin.role === 'admin') {
        // You would need to check target role here
        return next();
    }
    
    return res.status(403).json({ error: 'You do not have permission to delete' });
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isStaff,
    optionalAuth,
    optionalAuthForGuests,
    isAdminAuthenticated,
    isAdminGuest,
    hasRole,
    isSuperAdmin,
    canDelete
};
