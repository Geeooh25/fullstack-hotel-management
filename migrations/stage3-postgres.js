const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function up() {
    try {
        console.log('🔄 Running Stage 3 PostgreSQL migrations...');

        // Add columns to Bookings table
        await sequelize.query(`
            ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'
        `);
        console.log('✅ Added payment_status to Bookings');

        await sequelize.query(`
            ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP
        `);
        console.log('✅ Added payment_date to Bookings');

        await sequelize.query(`
            ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100)
        `);
        console.log('✅ Added transaction_id to Bookings');

        // Add status to Users table
        await sequelize.query(`
            ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
        `);
        console.log('✅ Added status to Users');

        // Create system_settings table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                hotel_name VARCHAR(255) DEFAULT 'Mansion Hotel',
                hotel_email VARCHAR(255) DEFAULT 'info@mansionhotel.com',
                hotel_phone VARCHAR(50) DEFAULT '+1-555-123-4567',
                hotel_address TEXT DEFAULT '123 Hotel Street, City, Country',
                tax_rate DECIMAL(5,2) DEFAULT 10.00,
                currency VARCHAR(3) DEFAULT 'USD',
                timezone VARCHAR(50) DEFAULT 'UTC',
                date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
                booking_confirmation_subject VARCHAR(255) DEFAULT 'Booking Confirmation',
                booking_confirmation_message TEXT DEFAULT 'Thank you for your booking!',
                cancellation_policy TEXT DEFAULT 'Free cancellation up to 24 hours before check-in',
                check_in_time VARCHAR(5) DEFAULT '14:00',
                check_out_time VARCHAR(5) DEFAULT '11:00',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created system_settings table');

        // Create notification_settings table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notification_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                email_notifications BOOLEAN DEFAULT TRUE,
                new_booking_email BOOLEAN DEFAULT TRUE,
                new_request_email BOOLEAN DEFAULT TRUE,
                daily_summary_email BOOLEAN DEFAULT TRUE,
                low_occupancy_alert INTEGER DEFAULT 70,
                auto_response_enabled BOOLEAN DEFAULT TRUE,
                auto_response_message TEXT DEFAULT 'Thank you for your request. Our team will get back to you shortly.',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created notification_settings table');

        // Create activity_logs table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
                admin_username VARCHAR(255) NOT NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created activity_logs table');

        // Create indexes
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON "Bookings"(payment_status)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_status ON "Users"(status)`);
        console.log('✅ Created indexes');

        // Insert default settings
        await sequelize.query(`
            INSERT INTO system_settings (id) VALUES (1)
            ON CONFLICT (id) DO NOTHING
        `);
        
        await sequelize.query(`
            INSERT INTO notification_settings (id) VALUES (1)
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('✅ Inserted default settings');

        console.log('✅ Stage 3 migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function down() {
    try {
        await sequelize.query(`ALTER TABLE "Bookings" DROP COLUMN IF EXISTS payment_status`);
        await sequelize.query(`ALTER TABLE "Bookings" DROP COLUMN IF EXISTS payment_date`);
        await sequelize.query(`ALTER TABLE "Bookings" DROP COLUMN IF EXISTS transaction_id`);
        await sequelize.query(`ALTER TABLE "Users" DROP COLUMN IF EXISTS status`);
        await sequelize.query(`DROP TABLE IF EXISTS activity_logs`);
        await sequelize.query(`DROP TABLE IF EXISTS notification_settings`);
        await sequelize.query(`DROP TABLE IF EXISTS system_settings`);
        console.log('✅ Rollback completed');
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}

// Run migration
if (require.main === module) {
    up().then(() => {
        console.log('Migration complete');
        process.exit(0);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { up, down };