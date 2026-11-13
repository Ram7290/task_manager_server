const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskAttachment = sequelize.define('TaskAttachment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  task_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  uploaded_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'task_attachments',
  timestamps: true,
  indexes: [
    { fields: ['task_id'] },
  ],
});

module.exports = TaskAttachment;
