-- =============================================================================
-- Sentinel-Health AI — Master Database Schema
-- =============================================================================
-- Database: sentinel_health
-- Description: Complete schema definitions for all 4 Sentinel-Health AI modules.
-- Usage: Run this file directly in MySQL Workbench, phpMyAdmin, or via CLI:
--        mysql -u root -p < database_schema.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS sentinel_health
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sentinel_health;

-- -----------------------------------------------------------------------------
-- 1. Users Table (Authentication & User Management)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. Projects Table (Multi-Tenant Monitored Projects)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL DEFAULT 1,
  name VARCHAR(100) NULL,
  project_name VARCHAR(150) DEFAULT 'Unnamed Project',
  description TEXT NULL,
  project_end_date DATE DEFAULT '2099-12-31',
  github_owner VARCHAR(150) NULL,
  github_repo VARCHAR(150) NULL,
  github_token_enc TEXT NULL,
  jira_base_url VARCHAR(255) NULL,
  jira_email VARCHAR(150) NULL,
  jira_api_token_enc TEXT NULL,
  jira_project_key VARCHAR(50) NULL,
  discord_bot_token_enc TEXT NULL,
  discord_guild_id VARCHAR(100) NULL,
  discord_channel_id VARCHAR(100) NULL,
  scan_interval_minutes INT DEFAULT 1440,
  last_auto_scan TIMESTAMP NULL,
  next_scheduled_scan TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  github_error TEXT NULL,
  jira_error TEXT NULL,
  discord_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. Telemetry Scans Table (Ingestion Run Records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_scans (
  scan_id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('complete','partial','failed') DEFAULT 'complete',
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. GitHub Metrics Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT NOT NULL,
  commit_frequency FLOAT DEFAULT 0,
  code_churn FLOAT DEFAULT 0,
  pr_cycle_time_hours FLOAT DEFAULT 0,
  top_contributor VARCHAR(100) NULL,
  contributor_count INT DEFAULT 0,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. Jira Metrics Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jira_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT NOT NULL,
  sprint_velocity_planned FLOAT DEFAULT 0,
  sprint_velocity_completed FLOAT DEFAULT 0,
  avg_task_aging_days FLOAT DEFAULT 0,
  backlog_growth_rate FLOAT DEFAULT 0,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. Discord Metrics Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discord_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT NOT NULL,
  messages_per_day FLOAT DEFAULT 0,
  active_users INT DEFAULT 0,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. Discord Messages Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discord_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT NOT NULL,
  author_id VARCHAR(100) NULL,
  author_name VARCHAR(100) NULL,
  content TEXT NULL,
  sent_at TIMESTAMP NULL,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. Machine Learning Inference Results Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inference_results (
  inference_id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT NULL,
  project_id VARCHAR(50) NOT NULL,
  health_label ENUM('HEALTHY','AT_RISK') NOT NULL DEFAULT 'HEALTHY',
  stability_score FLOAT NOT NULL DEFAULT 100.0,
  anomaly_detected BOOLEAN NOT NULL DEFAULT FALSE,
  inferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_proj_infer (project_id, inferred_at)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 9. SHAP Explainability Values Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shap_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inference_id INT NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  feature_value FLOAT NOT NULL,
  shap_value FLOAT NOT NULL,
  rank_order INT NOT NULL,
  explanation TEXT NULL,
  FOREIGN KEY (inference_id) REFERENCES inference_results(inference_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 10. AI Prescriptions Table
-- -----------------------------------------------------------------------------
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inference_id) REFERENCES inference_results(inference_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 11. Notifications Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id VARCHAR(50) NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'SCAN_COMPLETE',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 12. Scan Schedules Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  triggered_by ENUM('AUTO','MANUAL','RESCAN') NOT NULL DEFAULT 'AUTO',
  status ENUM('PENDING','RUNNING','COMPLETE','FAILED') NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 13. Alerts Table
-- -----------------------------------------------------------------------------
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
) ENGINE=InnoDB;
