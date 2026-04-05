const { User } = require('../models');

class AuthController {
    
    // Staff login
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            
            const user = await User.findOne({ where: { email } });
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }
            
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is disabled'
                });
            }
            
            const isValid = await user.validatePassword(password);
            
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }
            
            // Update last login
            user.last_login = new Date();
            await user.save();
            
            // Set session
            req.session.userId = user.id;
            req.session.userRole = user.role;
            
            // Check if it's an API request or form submission
            if (req.xhr || req.headers.accept === 'application/json') {
                return res.json({
                    success: true,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        role: user.role
                    },
                    redirect: '/admin/dashboard'
                });
            }
            
            // Redirect for form submission
            res.redirect('/admin/dashboard');
            
        } catch (error) {
            next(error);
        }
    }
    
    // Staff logout
    static async logout(req, res, next) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        error: 'Logout failed'
                    });
                }
                
                res.redirect('/admin/login');
            });
        } catch (error) {
            next(error);
        }
    }
    
    // Get current user (API)
    static async getMe(req, res, next) {
        try {
            if (!req.session.userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }
            
            const user = await User.findByPk(req.session.userId, {
                attributes: ['id', 'email', 'first_name', 'last_name', 'role']
            });
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            res.json({
                success: true,
                user: user
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;