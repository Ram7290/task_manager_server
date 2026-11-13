const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else if (process.env.DB_DIALECT === 'postgres') {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'task_management',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
} else {
  // SQLite fallback
  const storagePath = process.env.SQLITE_STORAGE || path.join(__dirname, '../data/database.sqlite');
  const fs = require('fs');
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
  });
}

module.exports = sequelize;
