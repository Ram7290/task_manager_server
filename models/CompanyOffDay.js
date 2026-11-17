const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// A date on which the entire company is not expected to work.
// Employees CAN still submit on these days — the flag only affects
// whether a missing submission counts as "absent without excuse" in reports.
const CompanyOffDay = sequelize.define('CompanyOffDay', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
  },
  // 'SUNDAY' | 'SATURDAY' | 'PUBLIC_HOLIDAY' | 'OTHER'
  type: {
    type: DataTypes.ENUM('SUNDAY', 'SATURDAY', 'PUBLIC_HOLIDAY', 'OTHER'),
    allowNull: false,
    defaultValue: 'OTHER',
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'company_off_days',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['date'] },
    { fields: ['type'] },
  ],
});

module.exports = CompanyOffDay;
