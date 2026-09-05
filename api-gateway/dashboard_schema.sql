-- ============================================================
-- Sentinel Health AI — Module 4: Dashboard Schema
-- Run AFTER existing Module 1 schema has been applied.
-- Apply via: mysql -u root -p sentinel_health < dashboard_schema.sql
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
);

-- ============================================================
-- 2. ALTER PROJECTS TABLE — Add multi-user & credential fields
--    Safe: all new columns have DEFAULT values so existing rows
--    are not affected.
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(150) NOT NULL DEFAULT 'Unnamed Project',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS project_end_date DATE NOT NULL DEFAULT '2099-12-31',
  ADD COLUMN IF NOT EXISTS github_token_enc TEXT,
  ADD COLUMN IF NOT EXISTS jira_base_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS jira_email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS jira_api_token_enc TEXT,
  ADD COLUMN IF NOT EXISTS discord_bot_token_enc TEXT,
  ADD COLUMN IF NOT EXISTS discord_guild_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scan_interval_minutes INT DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS last_auto_scan TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS next_scheduled_scan TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add FK after column exists (ignore error if already exists)
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 3. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  type ENUM(
    'CRITICAL_ALERT','HIGH_ALERT','MEDIUM_ALERT',
    'PRESCRIPTION_READY','SCAN_FAILED','SCAN_COMPLETE',
    'PROJECT_ENDING_SOON','PROJECT_ENDED'
  ) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. SCAN SCHEDULE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  triggered_by ENUM('AUTO','MANUAL','RESCAN') DEFAULT 'AUTO',
  status ENUM('PENDING','RUNNING','COMPLETE','FAILED') DEFAULT 'PENDING',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. USEFUL INDEX for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_scan_schedule_project ON scan_schedule(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_next_scan ON projects(next_scheduled_scan);
