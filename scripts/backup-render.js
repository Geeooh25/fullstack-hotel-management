const { sequelize } = require('../config/database');
const fs = require('fs');

async function backupRender() {
    const tables = ['users', 'amenities', 'bookings', 'rooms', 'guests', 'menu_items'];
    const backup = {};
    
    for (const table of tables) {
        const [rows] = await sequelize.query(`SELECT * FROM "${table}"`);
        backup[table] = rows;
        console.log(`✅ Backed up ${rows.length} rows from ${table}`);
    }
    
    fs.writeFileSync(`backup-${Date.now()}.json`, JSON.stringify(backup, null, 2));
    console.log('📦 Backup saved');
    process.exit(0);
}

backupRender();