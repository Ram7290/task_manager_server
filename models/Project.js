const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD'),
    allowNull: false,
    defaultValue: 'ACTIVE',
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'projects',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['created_by'] },
  ],
});

module.exports = Project;
