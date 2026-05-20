const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./database.sqlite');
const backup = {};

// List all tables to export
const tables = ['users', 'amenities', 'room_types', 'rooms', 'guests', 'bookings', 'payments', 'menu_categories', 'menu_items', 'request_submissions'];

console.log('📤 Exporting data from SQLite...\n');

tables.forEach(table => {
    db.all(`SELECT * FROM ${table}`, (err, rows) => {
        if (!err && rows && rows.length > 0) {
            backup[table] = rows;
            console.log(`✅ Exported ${rows.length} rows from ${table}`);
        } else {
            console.log(`⚠️ No data in ${table}`);
        }
    });
});

setTimeout(() => {
    fs.writeFileSync('backup-data.json', JSON.stringify(backup, null, 2));
    console.log('\n📦 Data exported to backup-data.json');
    db.close();
}, 2000);