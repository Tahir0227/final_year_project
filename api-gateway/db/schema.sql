CREATE DATABASE IF NOT EXISTS sentinel_health;
USE sentinel_health;

CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  github_owner VARCHAR(100),
  github_repo VARCHAR(100),
  jira_project_key VARCHAR(50),
  discord_channel_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_scans (
  scan_id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('complete','partial','failed'),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS github_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT,
  commit_frequency FLOAT,
  code_churn FLOAT,
  pr_cycle_time_hours FLOAT,
  top_contributor VARCHAR(100),
  contributor_count INT,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jira_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT,
  sprint_velocity_planned FLOAT,
  sprint_velocity_completed FLOAT,
  avg_task_aging_days FLOAT,
  backlog_growth_rate FLOAT,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discord_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT,
  messages_per_day FLOAT,
  active_users INT,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discord_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT,
  author_id VARCHAR(100),
  author_name VARCHAR(100),
  content TEXT,
  sent_at TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id) ON DELETE CASCADE
);
