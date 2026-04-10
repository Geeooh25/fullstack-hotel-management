require('dotenv').config(); 
const { sequelize } = require('./config/database'); 
(async () =
  try { 
    await sequelize.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS \"createdAt\" TIMESTAMP DEFAULT NOW()'); 
    await sequelize.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS \"updatedAt\" TIMESTAMP DEFAULT NOW()'); 
    await sequelize.query('ALTER TABLE guests ADD COLUMN IF NOT EXISTS \"createdAt\" TIMESTAMP DEFAULT NOW()'); 
    await sequelize.query('ALTER TABLE guests ADD COLUMN IF NOT EXISTS \"updatedAt\" TIMESTAMP DEFAULT NOW()'); 
    console.log('? Columns added successfully'); 
    process.exit(0); 
  } catch (err) { 
    console.error('Error:', err.message); 
    process.exit(1); 
  } 
})(); 
