require('dotenv').config();
const { sequelize } = require('./config/database');

const services = [
  // SPA TREATMENTS
  { name: 'Swedish Massage', description: '60 min full body relaxation massage', price: 120.00, category: 'Spa Treatments', requires_appointment: true, duration_minutes: 60 },
  { name: 'Deep Tissue Massage', description: '60 min intense muscle therapy', price: 140.00, category: 'Spa Treatments', requires_appointment: true, duration_minutes: 60 },
  { name: 'Hot Stone Massage', description: '75 min massage with heated stones', price: 160.00, category: 'Spa Treatments', requires_appointment: true, duration_minutes: 75 },
  { name: 'Facial Treatment', description: '60 min rejuvenating facial', price: 110.00, category: 'Spa Treatments', requires_appointment: true, duration_minutes: 60 },
  { name: 'Body Scrub', description: '45 min exfoliating treatment', price: 90.00, category: 'Spa Treatments', requires_appointment: true, duration_minutes: 45 },
  { name: 'Couples Massage', description: '60 min massage for two', price: 240.00, category: 'Spa Treatments', requires_appointment: true, duration_minutes: 60 },
  { name: 'Manicure & Pedicure', description: 'Complete nail care treatment', price: 75.00, category: 'Spa Treatments', requires_appointment: true, duration_minutes: 75 },
  
  // BUSINESS SERVICES
  { name: 'Meeting Room - Small', description: 'Boardroom for up to 6 people, includes projector and WiFi', price: 150.00, category: 'Business Services', requires_appointment: true, duration_minutes: 240 },
  { name: 'Meeting Room - Large', description: 'Conference room for up to 20 people, includes AV equipment', price: 300.00, category: 'Business Services', requires_appointment: true, duration_minutes: 240 },
  { name: 'Secretarial Services', description: 'Printing, scanning, document preparation (per hour)', price: 50.00, category: 'Business Services', requires_appointment: false, duration_minutes: 60 },
  { name: 'Video Conferencing', description: 'Professional video call setup (per hour)', price: 75.00, category: 'Business Services', requires_appointment: true, duration_minutes: 60 },
  
  // KIDS ACTIVITIES
  { name: 'Kids Club - Half Day', description: 'Supervised activities for 4 hours', price: 35.00, category: 'Kids Activities', requires_appointment: true, duration_minutes: 240 },
  { name: 'Kids Club - Full Day', description: 'Supervised activities for 8 hours with lunch', price: 60.00, category: 'Kids Activities', requires_appointment: true, duration_minutes: 480 },
  { name: 'Babysitting Service', description: 'In-room babysitting (per hour)', price: 25.00, category: 'Kids Activities', requires_appointment: true, duration_minutes: 60 },
  { name: 'Arts & Crafts Session', description: '1 hour guided craft activity', price: 20.00, category: 'Kids Activities', requires_appointment: true, duration_minutes: 60 },
  
  // PARKING OPTIONS
  { name: 'Self Parking - Daily', description: '24 hour self-parking access', price: 15.00, category: 'Parking Options', requires_appointment: false, duration_minutes: null },
  { name: 'Valet Parking - Daily', description: '24 hour valet parking service', price: 25.00, category: 'Parking Options', requires_appointment: false, duration_minutes: null },
  { name: 'Electric Vehicle Charging', description: 'EV charging station access', price: 10.00, category: 'Parking Options', requires_appointment: false, duration_minutes: null },
  { name: 'Weekly Parking Pass', description: '7 days parking access', price: 80.00, category: 'Parking Options', requires_appointment: false, duration_minutes: null }
];

async function seedServices() {
  // Get category IDs
  const catResult = await sequelize.query(
    `SELECT id, name FROM menu_categories WHERE name IN ('Spa Treatments', 'Business Services', 'Kids Activities', 'Parking Options')`
  );
  
  const categories = {};
  for (const cat of catResult[0]) {
    categories[cat.name] = cat.id;
    console.log(`Found category: ${cat.name} (ID: ${cat.id})`);
  }
  
  let added = 0;
  for (const item of services) {
    const categoryId = categories[item.category];
    if (!categoryId) {
      console.log(`⚠️ Category not found: ${item.category}`);
      continue;
    }
    
    try {
      await sequelize.query(
        `INSERT INTO menu_items (category_id, name, description, price, requires_appointment, duration_minutes, is_available, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
        { bind: [categoryId, item.name, item.description, item.price, item.requires_appointment, item.duration_minutes] }
      );
      added++;
      console.log(`✅ Added: ${item.name} - $${item.price}`);
    } catch (err) {
      if (err.message.includes('duplicate') || err.message.includes('violates unique constraint')) {
        console.log(`⚠️ Already exists: ${item.name}`);
      } else {
        console.log(`❌ Error adding ${item.name}:`, err.message);
      }
    }
  }
  
  console.log(`\n🎉 Added ${added} new service items!`);
  process.exit(0);
}

seedServices();