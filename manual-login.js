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
        
        // Test with the exact password
        const testPassword = 'Admin123!';
        const isValid = await bcrypt.compare(testPassword, user.password_hash);
        console.log('Direct bcrypt compare result:', isValid);
        
        // Generate a new hash and compare
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log('New hash for same password:', newHash);
        const testNew = await bcrypt.compare(testPassword, newHash);
        console.log('Test with new hash:', testNew);
        
        // Try to see if there's a mismatch
        if (user.password_hash !== newHash) {
            console.log('\n❌ Hashes are different! Updating...');
            user.password_hash = newHash;
            await user.save();
            console.log('✅ Password hash updated');
            
            // Verify again
            const verify = await bcrypt.compare(testPassword, user.password_hash);
            console.log('Verify after update:', verify);
        }
        
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit();
    }
}

test();