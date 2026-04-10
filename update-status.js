require('dotenv').config();
const { sequelize } = require('./config/database');

async function updateStatus() {
  try {
    const result = await sequelize.query(
      `UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE booking_reference = 'BKG-202604-258a'`
    );
    console.log('✅ Booking status updated to confirmed');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateStatus();