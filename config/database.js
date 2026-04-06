const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use DATABASE_URL from .env (PostgreSQL) if available, otherwise fallback to SQLite
let sequelize;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres')) {
  // PostgreSQL connection (for production or local PostgreSQL)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: false
  });
  console.log('✅ PostgreSQL database configured');
} else {
  // SQLite fallback (for development without PostgreSQL)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
  console.log('✅ SQLite database configured');
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection
};