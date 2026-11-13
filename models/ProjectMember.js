const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  added_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'project_members',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['project_id', 'employee_id'] },
    { fields: ['project_id'] },
    { fields: ['employee_id'] },
  ],
});

module.exports = ProjectMember;
