'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const ScanSchedule = sequelize.define('ScanSchedule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  project_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  triggered_by: {
    type: DataTypes.ENUM('AUTO', 'MANUAL', 'RESCAN'),
    defaultValue: 'AUTO'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'RUNNING', 'COMPLETE', 'FAILED'),
    defaultValue: 'PENDING'
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'scan_schedule',
  timestamps: false
});

module.exports = ScanSchedule;
