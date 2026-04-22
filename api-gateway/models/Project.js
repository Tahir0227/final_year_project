const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Project = sequelize.define('Project', {
  project_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
  },
  github_owner: {
    type: DataTypes.STRING(100),
  },
  github_repo: {
    type: DataTypes.STRING(100),
  },
  jira_project_key: {
    type: DataTypes.STRING(50),
  },
  discord_channel_id: {
    type: DataTypes.STRING(100),
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
