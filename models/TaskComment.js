const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskComment = sequelize.define('TaskComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  task_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  task_assignee_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'task_comments',
  timestamps: true,
  indexes: [
    { fields: ['task_id'] },
    { fields: ['user_id'] },
  ],
});

module.exports = TaskComment;
