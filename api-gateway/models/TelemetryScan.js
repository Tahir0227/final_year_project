const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');
const Project = require('./Project');

const TelemetryScan = sequelize.define('TelemetryScan', {
  scan_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.STRING(50),
    references: {
      model: Project,
      key: 'project_id'
    }
  },
  scanned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('complete', 'partial', 'failed'),
  }
}, {
  tableName: 'telemetry_scans',
  timestamps: false
});

Project.hasMany(TelemetryScan, { foreignKey: 'project_id' });
TelemetryScan.belongsTo(Project, { foreignKey: 'project_id' });

module.exports = TelemetryScan;
