const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  project_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    allowNull: false,
    defaultValue: 'MEDIUM',
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  estimated_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'tasks',
  timestamps: true,
  indexes: [
    { fields: ['project_id'] },
    { fields: ['created_by'] },
    { fields: ['due_date'] },
    { fields: ['priority'] },
    { fields: ['is_archived'] },
  ],
});

module.exports = Task;
