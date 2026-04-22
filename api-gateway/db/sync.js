const sequelize = require('./connection');
const Project = require('../models/Project');
const TelemetryScan = require('../models/TelemetryScan');
const GithubMetric = require('../models/GithubMetric');
const JiraMetric = require('../models/JiraMetric');
const DiscordMetric = require('../models/DiscordMetric');
const DiscordMessage = require('../models/DiscordMessage');

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connection has been established successfully.');
    // Set alter: true or force: false to prevent data loss while updating schema
    await sequelize.sync({ alter: true });
    console.log('[DB] All models were synchronized successfully.');
  } catch (error) {
    console.error('[DB] Unable to connect to the database:', error.message);
  }
}

module.exports = syncDB;
