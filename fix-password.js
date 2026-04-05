const bcrypt = require('bcrypt');
const { sequelize } = require('./config/database');
const { User } = require('./models');

async function fixPassword() {
    try {
        // Generate hash
        const password = 'Admin123!';
        const hash = await bcrypt.hash(password, 10);
        console.log('Generated hash:', hash);
        
        // Test the hash
        const test = await bcrypt.compare(password, hash);
        console.log('Test with generated hash:', test);
        
        // Update user
        const user = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        if (user) {
            user.password_hash = hash;
            await user.save();
            console.log('✅ User updated with new hash');
            
            // Verify after update
            const verify = await bcrypt.compare(password, user.password_hash);
            console.log('Verify after update:', verify);
        } else {
            console.log('User not found');
        }
        
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit();
    }
}

fixPassword();