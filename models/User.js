const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'MANAGER', 'EMPLOYEE'),
    allowNull: false,
    defaultValue: 'EMPLOYEE',
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['email'] },
    { fields: ['department_id'] },
    { fields: ['role'] },
  ],
});

module.exports = User;
