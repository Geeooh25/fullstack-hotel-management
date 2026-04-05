const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');
const { AuthService } = require('../services');

const router = express.Router();

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google Strategy - Uses AuthService for booking linking
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Use AuthService to handle Google user creation and booking linking
            const user = await AuthService.findOrCreateGoogleUser(profile);
            done(null, user);
        } catch (error) {
            console.error('Google auth error:', error);
            done(error, null);
        }
    }));
}

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => {
        // Generate JWT token
        const token = AuthService.generateToken(req.user);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        res.redirect('/');
    }
);

module.exports = router;