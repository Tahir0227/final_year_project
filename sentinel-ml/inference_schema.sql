CREATE TABLE inference_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50),
  scan_id INT,
  health_label ENUM('HEALTHY', 'AT_RISK'),
  stability_score FLOAT,
  anomaly_detected BOOLEAN,
  shap_driver_1_feature VARCHAR(100),
  shap_driver_1_value FLOAT,
  shap_driver_1_interpretation TEXT,
  shap_driver_2_feature VARCHAR(100),
  shap_driver_2_value FLOAT,
  shap_driver_2_interpretation TEXT,
  shap_driver_3_feature VARCHAR(100),
  shap_driver_3_value FLOAT,
  shap_driver_3_interpretation TEXT,
  inferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id)
);
