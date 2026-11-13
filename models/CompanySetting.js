const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CompanySetting = sequelize.define('CompanySetting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  setting_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  setting_value: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'company_settings',
  timestamps: true,
});

module.exports = CompanySetting;
