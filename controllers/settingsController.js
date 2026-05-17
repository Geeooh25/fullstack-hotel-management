const db = require('../models');
const ActivityLog = require('../models/ActivityLog');

const settingsController = {
    // Get settings page
    getSettings: async (req, res) => {
        try {
            let settings = await db.SystemSetting.findOne({ where: { id: 1 } });
            if (!settings) {
                settings = await db.SystemSetting.create({ id: 1 });
            }
            
            let notificationSettings = await db.NotificationSetting.findOne({ where: { id: 1 } });
            if (!notificationSettings) {
                notificationSettings = await db.NotificationSetting.create({ id: 1 });
            }
            
            res.render('admin/settings', { 
                settings, 
                notificationSettings,
                session: req.session 
            });
        } catch (error) {
            console.error(error);
            res.render('admin/settings', { 
                error: 'Failed to load settings',
                settings: {},
                notificationSettings: {},
                session: req.session
            });
        }
    },
    
    // Update general settings
    updateGeneralSettings: async (req, res) => {
        const {
            hotel_name, hotel_email, hotel_phone, hotel_address,
            tax_rate, currency, timezone, date_format,
            check_in_time, check_out_time
        } = req.body;
        
        try {
            await db.SystemSetting.update({
                hotel_name, hotel_email, hotel_phone, hotel_address,
                tax_rate, currency, timezone, date_format,
                check_in_time, check_out_time,
                updated_at: new Date()
            }, { where: { id: 1 } });
            
            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    },
    
    // Update notification settings
    updateNotificationSettings: async (req, res) => {
        const {
            email_notifications, new_booking_email, new_request_email,
            daily_summary_email, low_occupancy_alert, auto_response_enabled,
            auto_response_message
        } = req.body;
        
        try {
            await db.NotificationSetting.update({
                email_notifications: email_notifications === 'true' || email_notifications === true,
                new_booking_email: new_booking_email === 'true' || new_booking_email === true,
                new_request_email: new_request_email === 'true' || new_request_email === true,
                daily_summary_email: daily_summary_email === 'true' || daily_summary_email === true,
                low_occupancy_alert,
                auto_response_enabled: auto_response_enabled === 'true' || auto_response_enabled === true,
                auto_response_message,
                updated_at: new Date()
            }, { where: { id: 1 } });
            
            res.json({ success: true, message: 'Notification settings updated successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update notification settings' });
        }
    },
    
    // Update booking policies
    updatePolicies: async (req, res) => {
        const { booking_confirmation_subject, booking_confirmation_message, cancellation_policy } = req.body;
        
        try {
            await db.SystemSetting.update({
                booking_confirmation_subject,
                booking_confirmation_message,
                cancellation_policy,
                updated_at: new Date()
            }, { where: { id: 1 } });
            
            res.json({ success: true, message: 'Policies updated successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update policies' });
        }
    },
    
    // Backup database
    backupDatabase: async (req, res) => {
        try {
            res.json({ success: true, message: 'Backup initiated successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create backup' });
        }
    }
};

module.exports = settingsController;