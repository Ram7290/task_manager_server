const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actor_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  old_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  new_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['actor_user_id'] },
    { fields: ['action'] },
    { fields: ['entity_type'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = AuditLog;
