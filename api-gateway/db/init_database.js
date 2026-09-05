'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const sequelize = require('./connection');

// Import all models to ensure complete schema sync
require('../models/User');
require('../models/Project');
require('../models/TelemetryScan');
require('../models/GithubMetric');
require('../models/JiraMetric');
require('../models/DiscordMetric');
require('../models/DiscordMessage');
require('../models/Notification');
require('../models/ScanSchedule');

async function setupDatabase() {
  console.log('====================================================');
  console.log(' Sentinel-Health AI — Automated Database Setup');
  console.log('====================================================\n');

  const host     = process.env.DB_HOST || 'localhost';
  const port     = parseInt(process.env.DB_PORT || '3306', 10);
  const user     = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'sentinel_health';

  try {
    console.log(`[1/3] Connecting to MySQL server at ${host}:${port}...`);
    const connection = await mysql.createConnection({ host, port, user, password });

    console.log(`[2/3] Ensuring database "${database}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();

    console.log('[3/3] Synchronizing all tables & foreign keys with Sequelize...');
    await sequelize.authenticate();
    await sequelize.sync();

    // Ensure ML & Prescription tables exist (Module 2 & 3 support)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS inference_results (
        inference_id INT AUTO_INCREMENT PRIMARY KEY,
        scan_id INT NULL,
        project_id VARCHAR(50) NOT NULL,
        health_label ENUM('HEALTHY','AT_RISK') NOT NULL DEFAULT 'HEALTHY',
        stability_score FLOAT NOT NULL DEFAULT 100.0,
        anomaly_detected BOOLEAN NOT NULL DEFAULT FALSE,
        inferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shap_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inference_id INT NOT NULL,
        feature_name VARCHAR(100) NOT NULL,
        feature_value FLOAT NOT NULL,
        shap_value FLOAT NOT NULL,
        rank_order INT NOT NULL,
        explanation TEXT NULL
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id INT AUTO_INCREMENT PRIMARY KEY,
        inference_id INT NOT NULL,
        project_id VARCHAR(50) NOT NULL,
        root_cause_summary TEXT NOT NULL,
        severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
        action_step_1 VARCHAR(255) NULL,
        action_step_2 VARCHAR(255) NULL,
        action_step_3 VARCHAR(255) NULL,
        action_step_4 VARCHAR(255) NULL,
        action_step_5 VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        alert_id INT AUTO_INCREMENT PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        inference_id INT NULL,
        prescription_id INT NULL,
        severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
        title VARCHAR(200) NOT NULL,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL
      );
    `);

    console.log('\n✅ DATABASE SETUP COMPLETE! All tables and relations are ready.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database Setup Error:', err.message);
    console.error('\nPlease verify DB_HOST, DB_USER, DB_PASSWORD in api-gateway/.env');
    process.exit(1);
  }
}

setupDatabase();
