const { sequelize } = require('../config/database');
const fs = require('fs');

async function importToRender() {
    console.log('📥 Importing data to Render PostgreSQL...\n');
    
    // Read the backup file
    const backup = JSON.parse(fs.readFileSync('backup-data.json'));
    
    // Sync tables first (creates structure)
    await sequelize.sync({ alter: false });
    console.log('✅ Tables synced');
    
    // Import data for each table
    for (const [table, rows] of Object.entries(backup)) {
        if (rows.length === 0) continue;
        
        // Get model
        const modelName = table.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
        const Model = require(`../models/${modelName}`);
        
        // Clear existing data
        await Model.destroy({ where: {}, truncate: true });
        console.log(`🗑️ Cleared existing data from ${table}`);
        
        // Insert new data
        await Model.bulkCreate(rows);
        console.log(`✅ Imported ${rows.length} rows to ${table}`);
    }
    
    console.log('\n🎉 Import complete!');
    process.exit(0);
}

importToRender().catch(console.error);