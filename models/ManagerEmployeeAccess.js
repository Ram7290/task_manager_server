const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ManagerEmployeeAccess = sequelize.define('ManagerEmployeeAccess', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  manager_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'manager_employee_access',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['manager_id', 'employee_id'] },
    { fields: ['manager_id'] },
    { fields: ['employee_id'] },
  ],
});

module.exports = ManagerEmployeeAccess;
