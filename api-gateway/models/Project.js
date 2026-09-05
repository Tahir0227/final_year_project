'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Project = sequelize.define('Project', {
  project_id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  // Display fields
  name: {
    type: DataTypes.STRING(100)
  },
  project_name: {
    type: DataTypes.STRING(150),
    defaultValue: 'Unnamed Project'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  project_end_date: {
    type: DataTypes.DATEONLY,
    defaultValue: '2099-12-31'
  },
  // GitHub (encrypted token stored in DB)
  github_owner: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  github_repo: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  github_token_enc: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Jira
  jira_base_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  jira_email: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  jira_api_token_enc: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  jira_project_key: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Discord
  discord_bot_token_enc: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discord_guild_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  discord_channel_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Scheduling
  scan_interval_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 1440
  },
  last_auto_scan: {
    type: DataTypes.DATE,
    allowNull: true
  },
  next_scheduled_scan: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Error states for invalid credentials
  github_error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  jira_error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discord_error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'projects',
  timestamps: false
});

module.exports = Project;
