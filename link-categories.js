require('dotenv').config();
const { sequelize } = require('./config/database');

async function linkCategories() {
    try {
        // Update Spa Treatments (category_id 8) to link to Spa & Wellness (amenity_id 6)
        await sequelize.query('UPDATE menu_categories SET amenity_id = 6 WHERE id = 8');
        console.log('✅ Linked Spa Treatments to Spa & Wellness');
        
        // Update Business Services (category_id 9) to link to Business Center (amenity_id 9)
        await sequelize.query('UPDATE menu_categories SET amenity_id = 9 WHERE id = 9');
        console.log('✅ Linked Business Services to Business Center');
        
        // Update Kids Activities (category_id 10) to link to Kids Club (amenity_id 8)
        await sequelize.query('UPDATE menu_categories SET amenity_id = 8 WHERE id = 10');
        console.log('✅ Linked Kids Activities to Kids Club');
        
        // Update Parking Options (category_id 11) to link to Parking Space (amenity_id 2)
        await sequelize.query('UPDATE menu_categories SET amenity_id = 2 WHERE id = 11');
        console.log('✅ Linked Parking Options to Parking Space');
        
        // Link food categories to Restaurant & Bar (amenity_id 4)
        await sequelize.query('UPDATE menu_categories SET amenity_id = 4 WHERE id IN (2,3,4,5,6,7)');
        console.log('✅ Linked food categories to Restaurant & Bar');
        
        console.log('All categories linked!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

linkCategories();