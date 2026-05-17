const fs = require('fs');
const path = require('path');

const DB_PATH = './database.sqlite';
const BACKUP_DIR = './backups';

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `database_${timestamp}.sqlite`);
  
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`✅ Backup created: ${backupPath}`);
  
  // Delete backups older than 30 days
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 30 * 24 * 60 * 60 * 1000) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted old backup: ${file}`);
    }
  });
}

// Run backup every hour
setInterval(backup, 60 * 60 * 1000);

// Also backup on process exit
process.on('SIGINT', () => {
  backup();
  process.exit();
});

module.exports = { backup };