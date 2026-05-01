import shap
import numpy as np

interpretations = {
    "commit_frequency":      "Low commit activity detected",
    "code_churn":            "High code change rate — instability risk",
    "pr_cycle_time_hours":   "Pull requests taking too long to merge",
    "contributor_count":     "Low contributor count — knowledge silo risk",
    "sprint_velocity_ratio": "Sprint velocity below target",
    "avg_task_aging_days":   "Tasks aging beyond deadlines",
    "backlog_growth_rate":   "Backlog growing faster than resolution",
    "messages_per_day":      "Team communication frequency dropping",
    "active_users":          "Fewer team members actively communicating",
    "sentiment_score":       "Team sentiment trending negative",
    "velocity_drop_flag":    "Sprint velocity drop flag triggered",
    "burnout_flag":          "Developer burnout pattern detected",
    "silo_flag":             "Single contributor dependency detected",
    "aging_flag":            "Task aging threshold exceeded",
}

class Explainer:
    def __init__(self, rf_model, svm_model, background_data):
        self.rf_model = rf_model
        self.svm_model = svm_model
        
        # Use TreeExplainer for Random Forest
        self.rf_explainer = shap.TreeExplainer(self.rf_model)
        
        # Use KernelExplainer for SVM with background data
        # We explain the probability output
        self.svm_explainer = shap.KernelExplainer(self.svm_model.predict_proba, background_data)
        
    def get_top_risk_drivers(self, feature_vector, feature_names, use_model='rf'):
        """
        Returns top 3 features by absolute SHAP value.
        Positive SHAP value pushes towards class 1 (AT_RISK).
        """
        if use_model == 'rf':
            shap_values = self.rf_explainer.shap_values(feature_vector)
            if isinstance(shap_values, list):
                shap_vals = shap_values[1][0]
            elif len(shap_values.shape) == 3:
                shap_vals = shap_values[0, :, 1]
            else:
                shap_vals = shap_values[0]
                
        elif use_model == 'svm':
            shap_values = self.svm_explainer.shap_values(feature_vector)
            if isinstance(shap_values, list):
                shap_vals = shap_values[1][0]
            elif len(shap_values.shape) == 3:
                shap_vals = shap_values[0, :, 1]
            else:
                shap_vals = shap_values[0]
        else:
            raise ValueError("Unknown model for SHAP explanation")
            
        # Get top 3 features by absolute value
        top_indices = np.argsort(np.abs(shap_vals))[-3:][::-1]
        
        top_drivers = []
        for idx in top_indices:
            feat_name = feature_names[idx]
            val = float(shap_vals[idx])
            top_drivers.append({
                "feature": feat_name,
                "shap_value": round(val, 4),
                "interpretation": interpretations.get(feat_name, "Risk factor detected")
            })
            
        return top_drivers
