require('dotenv').config();
const { sequelize } = require('./config/database');

async function seedServiceCategories() {
  // Get amenity IDs for existing amenities
  const amenityResult = await sequelize.query(
    `SELECT id, name FROM amenities WHERE name IN ('Spa & Wellness', 'Business Center', 'Kids Club', 'Parking Space')`
  );
  
  const amenities = {};
  for (const a of amenityResult[0]) {
    amenities[a.name] = a.id;
    console.log(`Found amenity: ${a.name} (ID: ${a.id})`);
  }
  
  const categories = [
    { name: 'Spa Treatments', amenity: 'Spa & Wellness', display_order: 10 },
    { name: 'Business Services', amenity: 'Business Center', display_order: 11 },
    { name: 'Kids Activities', amenity: 'Kids Club', display_order: 12 },
    { name: 'Parking Options', amenity: 'Parking Space', display_order: 13 }
  ];
  
  for (const cat of categories) {
    const amenityId = amenities[cat.amenity];
    if (!amenityId) {
      console.log(`⚠️ Amenity not found: ${cat.amenity}`);
      continue;
    }
    
    try {
      await sequelize.query(
        `INSERT INTO menu_categories (amenity_id, name, display_order, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, true, NOW(), NOW())`,
        { bind: [amenityId, cat.name, cat.display_order] }
      );
      console.log('✅ Added category:', cat.name);
    } catch (err) {
      if (err.message.includes('duplicate') || err.message.includes('violates unique constraint')) {
        console.log('⚠️ Category already exists:', cat.name);
      } else {
        console.log('❌ Error:', err.message);
      }
    }
  }
  console.log('Done!');
  process.exit(0);
}

seedServiceCategories();