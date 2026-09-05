import os
import joblib
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from sqlalchemy import text
import pandas as pd
import numpy as np

from db import get_engine
from feature_engineering import get_raw_features, FEATURE_COLUMNS, FLOAT_FEATURES
from explainer_improved import ImprovedSHAPExplainer
from train_improved import run_improved_training_pipeline

# ---- Module 3 Integration: Prescription Engine auto-trigger ----
# Adds sentinel-prescription directory to path so trigger.py can be imported
import sys
_PRESCRIPTION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sentinel-prescription')
if _PRESCRIPTION_DIR not in sys.path:
    sys.path.insert(0, _PRESCRIPTION_DIR)
try:
    from trigger import auto_trigger_prescription
    _PRESCRIPTION_TRIGGER_AVAILABLE = True
except ImportError:
    _PRESCRIPTION_TRIGGER_AVAILABLE = False
    print("[Module3] sentinel-prescription not found — auto-trigger disabled.")

models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models at startup if they exist
    load_models()
    yield
    # Cleanup on shutdown
    models.clear()

def load_models():
    """Attempt to load all models into the global models dict."""
    try:
        if os.path.exists('models/svm_classifier.joblib'):
            models['svm'] = joblib.load('models/svm_classifier.joblib')
            models['rf'] = joblib.load('models/rf_stability.joblib')
            models['if'] = joblib.load('models/isolation_forest.joblib')
            models['gb'] = joblib.load('models/gradient_boosting.joblib')
            models['ensemble'] = joblib.load('models/ensemble_classifier.joblib')
            models['scaler'] = joblib.load('models/scaler.joblib')
            models['feature_cols'] = joblib.load('models/feature_columns.joblib')
            
            # Load improved SHAP explainer
            models['explainer'] = ImprovedSHAPExplainer()
            
            # Get last trained time based on model file
            mtime = os.path.getmtime('models/svm_classifier.joblib')
            models['last_trained'] = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
            print("All improved models and explainer loaded successfully.")
        else:
            print("Models not found on disk. Run training first.")
    except Exception as e:
        print(f"Models not loaded: {str(e)}")

app = FastAPI(lifespan=lifespan) # Uvicorn hot-reload trigger comment

class InferRequest(BaseModel):
    project_id: str
    scan_id: int

@app.post("/api/infer")
async def infer(request: InferRequest, background_tasks: BackgroundTasks):
    if not models or 'ensemble' not in models:
        raise HTTPException(status_code=503, detail="Models not trained yet. Call POST /api/train first.")
        
    try:
        # 1. Fetch feature vector from database
        df_raw = get_raw_features(scan_id=request.scan_id)
        if df_raw.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry data found for scan_id {request.scan_id}")
            
        # Extract features and scale
        X_raw = df_raw[FEATURE_COLUMNS].copy()
        X_scaled = X_raw.copy()
        X_scaled[FLOAT_FEATURES] = models['scaler'].transform(X_raw[FLOAT_FEATURES])
        
        feature_vector = X_scaled.values[0]

        # 2. Run all models predictions
        svm_pred = int(models['svm'].predict(X_scaled)[0])
        rf_pred = int(models['rf'].predict(X_scaled)[0])
        gb_pred = int(models['gb'].predict(X_scaled)[0])
        ensemble_pred = int(models['ensemble'].predict(X_scaled)[0])

        svm_pred_class = "AT_RISK" if svm_pred == 1 else "HEALTHY"
        rf_pred_class = "AT_RISK" if rf_pred == 1 else "HEALTHY"
        gb_pred_class = "AT_RISK" if gb_pred == 1 else "HEALTHY"
        ensemble_pred_class = "AT_RISK" if ensemble_pred == 1 else "HEALTHY"

        # 3. Use Ensemble as primary health_label decision
        health_label = ensemble_pred_class
        
        # 4. Use RF predict_proba for stability_score
        rf_proba = models['rf'].predict_proba(X_scaled)[0]
        proba_at_risk = float(rf_proba[1]) if len(rf_proba) > 1 else (1.0 if rf_pred == 1 else 0.0)
        stability_score = round((1 - proba_at_risk) * 100, 1)
        
        # 5. Run Isolation Forest for anomaly_detected
        if_pred = models['if'].predict(X_scaled)[0]
        anomaly_detected = bool(if_pred == -1)
        
        # 6. Run Ensemble SHAP explainability
        top_risk_drivers = []
        model_agreement = "HIGH"
        confidence = "HIGH"
        base_value = 0.5
        prediction_probability = 0.5

        if models['explainer']:
            shap_output = models['explainer'].explain_ensemble(feature_vector)
            top_risk_drivers = shap_output["top_3_drivers"]
            model_agreement = shap_output["model_agreement"]
            base_value = shap_output["base_value"]
            prediction_probability = shap_output["prediction_value"]
            
            agreement_details = models['explainer'].model_agreement_check(feature_vector)
            confidence = agreement_details["confidence"]
            
        inferred_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')
        
        # 7. Save to MySQL
        driver1 = top_risk_drivers[0] if len(top_risk_drivers) > 0 else {}
        driver2 = top_risk_drivers[1] if len(top_risk_drivers) > 1 else {}
        driver3 = top_risk_drivers[2] if len(top_risk_drivers) > 2 else {}
        
        engine = get_engine()
        with engine.begin() as conn:
            insert_query = text("""
                INSERT INTO inference_results (
                    project_id, scan_id, health_label, stability_score, anomaly_detected,
                    shap_driver_1_feature, shap_driver_1_value, shap_driver_1_interpretation,
                    shap_driver_2_feature, shap_driver_2_value, shap_driver_2_interpretation,
                    shap_driver_3_feature, shap_driver_3_value, shap_driver_3_interpretation
                ) VALUES (
                    :p_id, :s_id, :hl, :ss, :ad,
                    :f1, :v1, :i1,
                    :f2, :v2, :i2,
                    :f3, :v3, :i3
                )
            """)
            result = conn.execute(insert_query, {
                "p_id": request.project_id, "s_id": request.scan_id, "hl": health_label,
                "ss": stability_score, "ad": anomaly_detected,
                "f1": driver1.get('feature'), "v1": driver1.get('shap_value'), "i1": driver1.get('interpretation'),
                "f2": driver2.get('feature'), "v2": driver2.get('shap_value'), "i2": driver2.get('interpretation'),
                "f3": driver3.get('feature'), "v3": driver3.get('shap_value'), "i3": driver3.get('interpretation')
            })
            new_inference_id = result.lastrowid

        # 8. Auto-trigger Module 3 Prescription Engine
        prescription_data = None
        if _PRESCRIPTION_TRIGGER_AVAILABLE and new_inference_id:
            prescription_data = await auto_trigger_prescription(
                inference_id=new_inference_id,
                health_label=health_label
            )

        # 9. Return Enhanced JSON Response
        return {
            "project_id": request.project_id,
            "scan_id": request.scan_id,
            "health_label": health_label,
            "stability_score": stability_score,
            "anomaly_detected": anomaly_detected,
            "model_predictions": {
                "svm": svm_pred_class,
                "random_forest": rf_pred_class,
                "gradient_boosting": gb_pred_class,
                "ensemble": ensemble_pred_class
            },
            "model_agreement": model_agreement,
            "confidence": confidence,
            "top_risk_drivers": top_risk_drivers,
            "base_value": base_value,
            "prediction_probability": prediction_probability,
            "inferred_at": inferred_at + "Z",
            "prescription_triggered": _PRESCRIPTION_TRIGGER_AVAILABLE,
            "prescription": prescription_data
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train")
async def train(background_tasks: BackgroundTasks):
    def background_train():
        try:
            print("Triggering background training...")
            run_improved_training_pipeline()
            load_models()  # reload models in memory after training
            print("Background training completed and models reloaded.")
        except Exception as e:
            print(f"Training failed: {e}")
            
    background_tasks.add_task(background_train)
    return {
        "status": "training started",
        "message": "Models will be saved to models/ folder"
    }

@app.get("/api/health")
async def health():
    engine = get_engine()
    mysql_connected = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        mysql_connected = True
    except:
        pass
        
    return {
        "service": "running",
        "models_loaded": 'ensemble' in models,
        "last_trained": models.get('last_trained', None),
        "mysql_connected": mysql_connected
    }

@app.get("/api/infer/history/{project_id}")
async def get_history(project_id: str, limit: int = Query(10, ge=1, le=100)):
    try:
        engine = get_engine()
        query = "SELECT * FROM inference_results WHERE project_id = %(project_id)s ORDER BY inferred_at DESC LIMIT %(limit)s"
        df = pd.read_sql(query, engine, params={"project_id": project_id, "limit": limit})
        
        results = []
        for _, row in df.iterrows():
            drivers = []
            for i in range(1, 4):
                if pd.notnull(row[f'shap_driver_{i}_feature']):
                    drivers.append({
                        "feature": row[f'shap_driver_{i}_feature'],
                        "shap_value": row[f'shap_driver_{i}_value'],
                        "interpretation": row[f'shap_driver_{i}_interpretation']
                    })
                    
            results.append({
                "project_id": row['project_id'],
                "scan_id": row['scan_id'],
                "health_label": row['health_label'],
                "stability_score": row['stability_score'],
                "anomaly_detected": bool(row['anomaly_detected']),
                "top_risk_drivers": drivers,
                "inferred_at": str(row['inferred_at']) + "Z" if pd.notnull(row['inferred_at']) else None
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
