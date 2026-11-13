const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorklogCategory = sequelize.define('WorklogCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'worklog_categories',
  timestamps: true,
});

module.exports = WorklogCategory;
