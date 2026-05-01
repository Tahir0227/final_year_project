from main import load_models, models, get_raw_features, FEATURE_COLUMNS, FLOAT_FEATURES
import pandas as pd

load_models()
scan_id = 1
df_raw = get_raw_features(scan_id=scan_id)
X_raw = df_raw[FEATURE_COLUMNS].copy()
X_scaled = X_raw.copy()
X_scaled[FLOAT_FEATURES] = models['scaler'].transform(X_raw[FLOAT_FEATURES])

print("Running models...")
svm_pred = models['svm'].predict(X_scaled)[0]
rf_proba = models['rf'].predict_proba(X_scaled)[0]
if_pred = models['if'].predict(X_scaled)[0]

print("Running explainer...")
top = models['explainer'].get_top_risk_drivers(X_scaled, FEATURE_COLUMNS, use_model='rf')
print("Top:", top)
