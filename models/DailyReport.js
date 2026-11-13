const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyReport = sequelize.define('DailyReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  report_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED'),
    allowNull: false,
    defaultValue: 'DRAFT',
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'daily_reports',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['employee_id', 'report_date'] },
    { fields: ['employee_id'] },
    { fields: ['report_date'] },
    { fields: ['status'] },
  ],
});

module.exports = DailyReport;
