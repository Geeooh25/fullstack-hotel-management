const { sequelize } = require('./config/database');
const { User } = require('./models');
const bcrypt = require('bcrypt');

async function test() {
    try {
        const user = await User.findOne({ where: { email: 'admin@mansionhotel.com' } });
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User found:', user.email);
        console.log('Stored hash:', user.password_hash);
        
        // Try different password combinations
        const passwords = ['Admin123!', 'admin123', 'Admin123', 'password'];
        for (const pwd of passwords) {
            const isValid = await bcrypt.compare(pwd, user.password_hash);
            console.log(`Testing "${pwd}": ${isValid}`);
        }
        
        // Also try creating a new hash with the same password to compare
        const newHash = await bcrypt.hash('Admin123!', 10);
        console.log('New hash for Admin123!:', newHash);
        console.log('Compare new hash with itself:', await bcrypt.compare('Admin123!', newHash));
        
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit();
    }
}

test();