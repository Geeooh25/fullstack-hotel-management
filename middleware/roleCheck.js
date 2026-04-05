// Check if user has required role
const hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Role ${req.user.role} does not have permission. Required: ${roles.join(', ')}`
            });
        }
        
        next();
    };
};

// Check if user is admin
const isAdmin = hasRole('admin');

// Check if user is admin or receptionist
const isStaff = hasRole('admin', 'receptionist');

// Check if user is admin or housekeeping
const isHousekeeping = hasRole('admin', 'housekeeping');

module.exports = {
    hasRole,
    isAdmin,
    isStaff,
    isHousekeeping
};