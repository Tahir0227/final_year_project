const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');
const TelemetryScan = require('./TelemetryScan');

const GithubMetric = sequelize.define('GithubMetric', {
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
  commit_frequency: DataTypes.FLOAT,
  code_churn: DataTypes.FLOAT,
  pr_cycle_time_hours: DataTypes.FLOAT,
  top_contributor: DataTypes.STRING(100),
  contributor_count: DataTypes.INTEGER,
  collected_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'github_metrics',
  timestamps: false
});

TelemetryScan.hasOne(GithubMetric, { foreignKey: 'scan_id' });
GithubMetric.belongsTo(TelemetryScan, { foreignKey: 'scan_id' });

module.exports = GithubMetric;
