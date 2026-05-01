import os
import joblib
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from sqlalchemy import text
import pandas as pd

from db import get_engine
from feature_engineering import get_raw_features, FEATURE_COLUMNS, FLOAT_FEATURES
from explainer import Explainer
from train import run_training_pipeline

models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models at startup if they exist
    load_models()
    yield
    # Cleanup on shutdown
    models.clear()

def load_models():
    """Attempt to load models into the global models dict."""
    try:
        models['svm'] = joblib.load('models/svm_classifier.joblib')
        models['rf'] = joblib.load('models/rf_stability.joblib')
        models['if'] = joblib.load('models/isolation_forest.joblib')
        models['scaler'] = joblib.load('models/scaler.joblib')
        
        # Load background data and initialize explainer
        if os.path.exists('models/background_data.joblib'):
            bg_data = joblib.load('models/background_data.joblib')
            models['explainer'] = Explainer(models['rf'], models['svm'], bg_data)
        else:
            models['explainer'] = None
            
        # Get last trained time based on model file
        mtime = os.path.getmtime('models/svm_classifier.joblib')
        models['last_trained'] = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
    except Exception as e:
        print(f"Models not loaded: {str(e)}")

app = FastAPI(lifespan=lifespan)

class InferRequest(BaseModel):
    project_id: str
    scan_id: int

@app.post("/api/infer")
async def infer(request: InferRequest):
    if not models or 'svm' not in models:
        raise HTTPException(status_code=503, detail="Models not trained yet. Call POST /api/train first.")
        
    try:
        # 1. Fetch feature vector
        df_raw = get_raw_features(scan_id=request.scan_id)
        if df_raw.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry data found for scan_id {request.scan_id}")
            
        # Extract features and scale
        X_raw = df_raw[FEATURE_COLUMNS].copy()
        X_scaled = X_raw.copy()
        X_scaled[FLOAT_FEATURES] = models['scaler'].transform(X_raw[FLOAT_FEATURES])
        
        # 3. Run SVM -> health label
        svm_pred = models['svm'].predict(X_scaled)[0]
        health_label = "AT_RISK" if svm_pred == 1 else "HEALTHY"
        
        # 4. Run RF -> stability score
        rf_proba = models['rf'].predict_proba(X_scaled)[0]
        proba_at_risk = rf_proba[1] if len(rf_proba) > 1 else (1.0 if rf_pred == 1 else 0.0)
        stability_score = round((1 - proba_at_risk) * 100, 1)
        
        # 5. Run IF -> anomaly detected
        if_pred = models['if'].predict(X_scaled)[0]
        anomaly_detected = bool(if_pred == -1)
        
        # 6. Run SHAP -> top 3 risk drivers
        top_risk_drivers = []
        if models['explainer']:
            # Using RF explainer for speed and consistency with stability score
            top_risk_drivers = models['explainer'].get_top_risk_drivers(X_scaled, FEATURE_COLUMNS, use_model='rf')
            
        inferred_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        
        # 7. Save to MySQL
        driver1 = top_risk_drivers[0] if len(top_risk_drivers) > 0 else {}
        driver2 = top_risk_drivers[1] if len(top_risk_drivers) > 1 else {}
        driver3 = top_risk_drivers[2] if len(top_risk_drivers) > 2 else {}
        
        engine = get_engine()
        with engine.begin() as conn:
            query = text("""
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
            conn.execute(query, {
                "p_id": request.project_id, "s_id": request.scan_id, "hl": health_label,
                "ss": stability_score, "ad": anomaly_detected,
                "f1": driver1.get('feature'), "v1": driver1.get('shap_value'), "i1": driver1.get('interpretation'),
                "f2": driver2.get('feature'), "v2": driver2.get('shap_value'), "i2": driver2.get('interpretation'),
                "f3": driver3.get('feature'), "v3": driver3.get('shap_value'), "i3": driver3.get('interpretation')
            })
            
        # 8. Return JSON
        return {
            "project_id": request.project_id,
            "scan_id": request.scan_id,
            "health_label": health_label,
            "stability_score": stability_score,
            "anomaly_detected": anomaly_detected,
            "top_risk_drivers": top_risk_drivers,
            "inferred_at": inferred_at + "Z"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train")
async def train(background_tasks: BackgroundTasks):
    def background_train():
        try:
            run_training_pipeline()
            load_models()  # reload models in memory after training
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
        "models_loaded": 'svm' in models,
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
