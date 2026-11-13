const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyWorklog = sequelize.define('DailyWorklog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  daily_report_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  task_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  task_assignee_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  project_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 30,
      isDivisibleBy30(value) {
        if (value % 30 !== 0) {
          throw new Error('Duration must be a multiple of 30 minutes');
        }
      },
    },
  },
}, {
  tableName: 'daily_worklogs',
  timestamps: true,
  indexes: [
    { fields: ['daily_report_id'] },
    { fields: ['task_id'] },
    { fields: ['category_id'] },
    { fields: ['project_id'] },
  ],
});

module.exports = DailyWorklog;
