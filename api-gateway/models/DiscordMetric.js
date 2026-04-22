const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');
const TelemetryScan = require('./TelemetryScan');

const DiscordMetric = sequelize.define('DiscordMetric', {
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
  messages_per_day: DataTypes.FLOAT,
  active_users: DataTypes.INTEGER,
  collected_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'discord_metrics',
  timestamps: false
});

TelemetryScan.hasOne(DiscordMetric, { foreignKey: 'scan_id' });
DiscordMetric.belongsTo(TelemetryScan, { foreignKey: 'scan_id' });

module.exports = DiscordMetric;
