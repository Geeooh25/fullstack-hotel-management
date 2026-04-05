const jwt = require('jsonwebtoken');
const { User, Guest, Booking } = require('../models');

class AuthService {
    
    static generateToken(user) {
        return jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name
            },
            process.env.JWT_SECRET || 'your-secret-key-change-me',
            { expiresIn: '7d' }
        );
    }
    
    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-me');
        } catch (error) {
            return null;
        }
    }
    
    static async register(userData) {
        const { email, password, first_name, last_name } = userData;
        
        // Check if user exists
        let existingUser = await User.findOne({ where: { email } });
        
        if (existingUser) {
            throw new Error('User already exists with this email');
        }
        
        // NEW: Check if there are guest bookings with this email
        const guestBookings = await Guest.findOne({ 
            where: { email },
            include: [{ model: Booking, as: 'bookings' }]
        });
        
        // Create user
        const user = await User.create({
            email,
            password_hash: password,
            first_name,
            last_name,
            role: 'guest',
            email_verified: false
        });
        
        // NEW: Link existing guest bookings to this user account
        if (guestBookings && guestBookings.bookings && guestBookings.bookings.length > 0) {
            for (const booking of guestBookings.bookings) {
                booking.user_id = user.id;
                await booking.save();
                console.log(`✅ Linked booking ${booking.booking_reference} to user ${user.email}`);
            }
        }
        
        const token = this.generateToken(user);
        return { user, token };
    }
    
    static async login(email, password) {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        
        const isValid = await user.validatePassword(password);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }
        
        if (!user.is_active) {
            throw new Error('Account is disabled');
        }
        
        // Update last login
        user.last_login = new Date();
        await user.save();
        
        const token = this.generateToken(user);
        return { user, token };
    }
    
    static async getCurrentUser(userId) {
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] }
        });
        return user;
    }
    
    // NEW: Link Google user to existing guest bookings
    static async findOrCreateGoogleUser(profile) {
        const email = profile.emails[0].value;
        
        // Check if user exists by google_id
        let user = await User.findOne({ where: { google_id: profile.id } });
        
        if (user) {
            return user;
        }
        
        // Check if user exists by email
        user = await User.findOne({ where: { email } });
        
        if (user) {
            // Link Google account to existing user
            user.google_id = profile.id;
            user.avatar = profile.photos?.[0]?.value;
            await user.save();
            console.log(`✅ Linked Google account to existing user: ${email}`);
            return user;
        }
        
        // Check for guest bookings with this email
        const guestBookings = await Guest.findOne({ 
            where: { email },
            include: [{ model: Booking, as: 'bookings' }]
        });
        
        // Create new user
        const nameParts = profile.displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        user = await User.create({
            email: email,
            google_id: profile.id,
            first_name: firstName,
            last_name: lastName,
            avatar: profile.photos?.[0]?.value,
            email_verified: true,
            role: 'guest'
        });
        
        // Link existing guest bookings to this user
        if (guestBookings && guestBookings.bookings && guestBookings.bookings.length > 0) {
            for (const booking of guestBookings.bookings) {
                booking.user_id = user.id;
                await booking.save();
                console.log(`✅ Linked booking ${booking.booking_reference} to user ${user.email}`);
            }
        }
        
        return user;
    }
}

module.exports = AuthService;