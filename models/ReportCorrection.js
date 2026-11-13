const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportCorrection = sequelize.define('ReportCorrection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  daily_report_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  corrected_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  before_data: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  after_data: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: 'report_corrections',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['daily_report_id'] },
    { fields: ['corrected_by'] },
  ],
});

module.exports = ReportCorrection;
