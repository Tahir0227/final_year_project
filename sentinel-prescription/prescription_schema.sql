-- ============================================================
-- Sentinel Health AI — Module 3: Prescription Engine Schema
-- Run AFTER Module 1 and Module 2 schemas have been applied.
-- Requires: telemetry_scans and inference_results tables to exist.
-- Apply via: python apply_schema.py  (reads .env for DB credentials)
-- OR via mysql CLI: mysql -u root -p sentinel_health < prescription_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS prescriptions (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  inference_id              INT NOT NULL,
  project_id                VARCHAR(50) NOT NULL,
  scan_id                   INT NOT NULL,
  health_label              ENUM('AT_RISK') NOT NULL,
  stability_score           FLOAT,
  anomaly_detected          BOOLEAN,

  -- SHAP driver summary strings (feature: interpretation)
  shap_driver_1             VARCHAR(200),
  shap_driver_2             VARCHAR(200),
  shap_driver_3             VARCHAR(200),

  -- LLM-generated outputs
  root_cause_summary        TEXT NOT NULL,
  severity                  ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
  action_step_1             TEXT,
  action_step_2             TEXT,
  action_step_3             TEXT,
  action_step_4             TEXT,
  action_step_5             TEXT,

  -- Fallback & metadata
  raw_llm_fallback          VARCHAR(2000),
  llm_provider              VARCHAR(50)  DEFAULT 'groq',
  groq_key_used             VARCHAR(20),   -- 'primary' or 'fallback' — NEVER the actual key
  prompt_tokens_used        INT,
  generated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys back to existing Module 1 & 2 tables
  FOREIGN KEY (inference_id) REFERENCES inference_results(id)
    ON DELETE CASCADE,
  FOREIGN KEY (scan_id)      REFERENCES telemetry_scans(scan_id)
    ON DELETE CASCADE
);
