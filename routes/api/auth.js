const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const { validateLogin } = require('../../middleware/validation');
const { loginLimiter } = require('../../middleware/rateLimiter');
const { AuthService } = require('../../services');
const { optionalAuth } = require('../../middleware/auth');
const crypto = require('crypto');
const { Op } = require('sequelize');
const EmailService = require('../../services/emailService');

// ==================== ADMIN/STAFF LOGIN (Session-based - Existing) ====================

// POST /api/auth/login - Staff login (for admin panel)
router.post('/login', loginLimiter, validateLogin, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Account is disabled. Please contact administrator.'
            });
        }
        
        const isValid = await user.validatePassword(password);
        
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        
        user.last_login = new Date();
        await user.save();
        
        req.session.userId = user.id;
        req.session.userRole = user.role;
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            redirect: user.role === 'admin' ? '/admin/dashboard' : '/admin/dashboard'
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/logout - Staff logout
router.post('/logout', (req, res, next) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Logout failed'
                });
            }
            
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me - Get current staff user (session-based)
router.get('/me', async (req, res, next) => {
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
});

// ==================== GUEST USER AUTHENTICATION (JWT-based) ====================

// POST /api/auth/register - Guest registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;
        
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }
        
        const { user, token } = await AuthService.register(req.body);
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// POST /api/auth/guest-login - Guest login (JWT-based)
router.post('/guest-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        
        const { user, token } = await AuthService.login(email, password);
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                avatar: user.avatar
            },
            token
        });
    } catch (error) {
        console.error('Guest login error:', error);
        res.status(401).json({ success: false, error: error.message });
    }
});

// GET /api/auth/guest-me - Get current guest user (JWT-based)
router.get('/guest-me', optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.json({ success: true, user: null });
        }
        
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] }
        });
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Get guest user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/auth/guest-logout - Guest logout
router.post('/guest-logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// PUT /api/auth/profile - Update guest profile
router.put('/profile', optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        const { first_name, last_name, phone, address } = req.body;
        const user = await User.findByPk(req.user.id);
        
        if (first_name) user.first_name = first_name;
        if (last_name) user.last_name = last_name;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        
        await user.save();
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/auth/change-password - Change guest password
router.post('/change-password', optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        const { current_password, new_password } = req.body;
        const user = await User.findByPk(req.user.id);
        
        const isValid = await user.validatePassword(current_password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        }
        
        user.password_hash = new_password;
        await user.save();
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== FORGOT PASSWORD (NEW) ====================

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // For security, don't reveal that user doesn't exist
            return res.json({ success: true, message: 'If an account exists, a reset link will be sent' });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
        
        user.reset_token = resetToken;
        user.reset_token_expires = resetTokenExpires;
        await user.save();
        
        // Send email with reset link
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
        
        // You'll need to add this method to emailService.js
        try {
            await EmailService.sendPasswordResetEmail(user, resetUrl);
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError.message);
            // Still return success for security
        }
        
        res.json({ success: true, message: 'Password reset link sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;
        
        if (!token || !new_password) {
            return res.status(400).json({ success: false, error: 'Token and new password are required' });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }
        
        const user = await User.findOne({
            where: {
                reset_token: token,
                reset_token_expires: { [Op.gt]: new Date() }
            }
        });
        
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
        }
        
        user.password_hash = new_password;
        user.reset_token = null;
        user.reset_token_expires = null;
        await user.save();
        
        res.json({ success: true, message: 'Password reset successfully. Please login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;