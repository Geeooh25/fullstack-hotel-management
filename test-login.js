const express = require('express'); 
const app = express(); 
app.use(express.json()); 
const { sequelize } = require('./config/database'); 
const { User } = require('./models'); 
const bcrypt = require('bcrypt'); 
 
(async () =
    const user = await User.findOne({ where: { email: 'admin@mansionhotel.com' } }); 
    if (!user) { console.log('No user'); return; } 
    const isValid = await bcrypt.compare('Admin123!', user.password_hash); 
    console.log('Direct compare result:', isValid); 
    console.log('Stored hash:', user.password_hash); 
    process.exit(); 
})(); 
