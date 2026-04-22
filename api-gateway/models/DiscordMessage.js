const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');
const TelemetryScan = require('./TelemetryScan');

const DiscordMessage = sequelize.define('DiscordMessage', {
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
  message_id: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  author_id: DataTypes.STRING(100),
  author_name: DataTypes.STRING(100),
  content: DataTypes.TEXT,
  sent_at: DataTypes.DATE
}, {
  tableName: 'discord_messages',
  timestamps: false
});

TelemetryScan.hasMany(DiscordMessage, { foreignKey: 'scan_id' });
DiscordMessage.belongsTo(TelemetryScan, { foreignKey: 'scan_id' });

module.exports = DiscordMessage;
