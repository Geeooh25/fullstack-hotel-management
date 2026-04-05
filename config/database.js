const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use SQLite - no password needed
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: console.log,
    define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ SQLite database connected successfully');
        console.log('📁 Database file: ./database.sqlite');
    } catch (error) {
        console.error('❌ Unable to connect to SQLite:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, testConnection };