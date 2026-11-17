const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Admin-recorded per-person absence for a specific date.
// 'ABSENT'   — not present, no excuse logged separately
// 'LEAVE'    — approved leave (sick, annual, etc.)
// 'HALF_DAY' — present for part of the day
const AttendanceException = sequelize.define('AttendanceException', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('ABSENT', 'LEAVE', 'HALF_DAY'),
    allowNull: false,
    defaultValue: 'ABSENT',
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  marked_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'attendance_exceptions',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['employee_id', 'date'] },
    { fields: ['date'] },
    { fields: ['employee_id'] },
  ],
});

module.exports = AttendanceException;
