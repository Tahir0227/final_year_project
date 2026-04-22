const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');
const TelemetryScan = require('./TelemetryScan');

const JiraMetric = sequelize.define('JiraMetric', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  scan_id: {
    type: DataTypes.INTEGER,
    references: {
      model: TelemetryScan,
      key: 'scan_id'
    }
  },
  sprint_velocity_planned: DataTypes.FLOAT,
  sprint_velocity_completed: DataTypes.FLOAT,
  avg_task_aging_days: DataTypes.FLOAT,
  backlog_growth_rate: DataTypes.FLOAT,
  collected_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'jira_metrics',
  timestamps: false
});

TelemetryScan.hasOne(JiraMetric, { foreignKey: 'scan_id' });
JiraMetric.belongsTo(TelemetryScan, { foreignKey: 'scan_id' });

module.exports = JiraMetric;
