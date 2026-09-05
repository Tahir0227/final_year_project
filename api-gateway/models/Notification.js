'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  project_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'CRITICAL_ALERT', 'HIGH_ALERT', 'MEDIUM_ALERT',
      'PRESCRIPTION_READY', 'SCAN_FAILED', 'SCAN_COMPLETE',
      'PROJECT_ENDING_SOON', 'PROJECT_ENDED'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'notifications',
  timestamps: false
});

module.exports = Notification;
