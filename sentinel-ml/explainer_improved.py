import os
import joblib
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

INTERPRETATIONS = {
    "commit_frequency": {
        "high_risk": "Development activity has dropped sharply — team may be blocked or disengaged",
        "low_risk": "Commit activity is healthy and consistent"
    },
    "code_churn": {
        "high_risk": "Extremely high code change rate indicates instability or repeated rework",
        "low_risk": "Code changes are at a stable and sustainable rate"
    },
    "pr_cycle_time_hours": {
        "high_risk": "Pull requests are stuck in review — code integration is severely bottlenecked",
        "low_risk": "Code reviews are completing promptly"
    },
    "contributor_count": {
        "high_risk": "Critical knowledge silo detected — single contributor dependency risk",
        "low_risk": "Work is well-distributed across the team"
    },
    "sprint_velocity_ratio": {
        "high_risk": "Team is completing far less work than planned — sprint targets are not being met",
        "low_risk": "Sprint velocity is on track"
    },
    "avg_task_aging_days": {
        "high_risk": "Tasks are severely overdue — deadline slippage is accelerating",
        "low_risk": "Tasks are being resolved within expected timeframes"
    },
    "backlog_growth_rate": {
        "high_risk": "Backlog is growing faster than it is being resolved — workload spiral detected",
        "low_risk": "Backlog is under control"
    },
    "messages_per_day": {
        "high_risk": "Team communication has collapsed — coordination breakdown risk",
        "low_risk": "Team communication frequency is healthy"
    },
    "active_users": {
        "high_risk": "Most team members are inactive — disengagement or absence risk",
        "low_risk": "Team members are actively engaged"
    },
    "sentiment_score": {
        "high_risk": "Team sentiment is critically negative — burnout and attrition risk elevated",
        "low_risk": "Team morale is positive"
    },
    "velocity_drop_flag": {
        "high_risk": "Sprint velocity drop flag triggered — sprint failure threshold crossed",
        "low_risk": "No velocity drop detected"
    },
    "burnout_flag": {
        "high_risk": "Burnout pattern detected — low communication combined with negative sentiment",
        "low_risk": "No burnout indicators present"
    },
    "silo_flag": {
        "high_risk": "Single contributor silo flag active — bus factor is critically low",
        "low_risk": "No knowledge silo detected"
    },
    "aging_flag": {
        "high_risk": "Task aging threshold exceeded — systematic deadline overruns confirmed",
        "low_risk": "Task aging within acceptable limits"
    }
}

class ImprovedSHAPExplainer:
    def __init__(self):
        # Load models
        self.rf_model = joblib.load('models/rf_stability.joblib')
        self.svm_model = joblib.load('models/svm_classifier.joblib')
        self.gb_model = joblib.load('models/gradient_boosting.joblib')
        self.ensemble = joblib.load('models/ensemble_classifier.joblib')
        self.scaler = joblib.load('models/scaler.joblib')
        self.feature_cols = joblib.load('models/feature_columns.joblib')

        # Load background data (100 samples from training set)
        self.train_df = pd.read_csv('data/training_data.csv')
        FLOAT_FEATURES = [
            "commit_frequency",
            "code_churn",
            "pr_cycle_time_hours",
            "sprint_velocity_ratio",
            "avg_task_aging_days",
            "backlog_growth_rate",
            "messages_per_day",
            "sentiment_score"
        ]
        X_bg = self.train_df[self.feature_cols].sample(100, random_state=42).copy()
        X_bg_scaled = X_bg.copy()
        X_bg_scaled[FLOAT_FEATURES] = self.scaler.transform(X_bg[FLOAT_FEATURES])
        self.X_background = X_bg_scaled.values

        # Compute healthy class averages
        healthy_df = self.train_df[self.train_df['health_label'] == 0]
        self.healthy_averages = healthy_df[self.feature_cols].mean().to_dict()

        # Initialise explainers
        self.tree_explainer = shap.TreeExplainer(self.rf_model)
        self.gb_explainer = shap.TreeExplainer(self.gb_model)
        self.kernel_explainer = shap.KernelExplainer(
            self.svm_model.predict_proba,
            shap.kmeans(self.X_background, 10)
        )

    def explain_single(self, feature_vector: np.ndarray, model: str = 'rf') -> dict:
        """
        Compute SHAP values for a single scaled feature vector.
        """
        # Reshape to 2D if 1D
        if len(feature_vector.shape) == 1:
            feature_vector = feature_vector.reshape(1, -1)

        if model == 'rf':
            # RF returns list of lists (one per class). We want class 1 (AT_RISK).
            shap_values = self.tree_explainer.shap_values(feature_vector)
            # In some versions, TreeExplainer returns a list of shape (classes, samples, features)
            if isinstance(shap_values, list):
                shap_val = shap_values[1][0]
            else:
                shap_val = shap_values[0, :, 1] if len(shap_values.shape) == 3 else shap_values[0]
        elif model == 'gb':
            # GB TreeExplainer might return single array for binary classification
            shap_values = self.gb_explainer.shap_values(feature_vector)
            shap_val = shap_values[0] if len(shap_values.shape) == 2 else shap_values
        elif model == 'svm':
            # KernelExplainer returns list of lists (class probabilities)
            shap_values = self.kernel_explainer.shap_values(feature_vector)
            shap_val = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]
        else:
            raise ValueError(f"Unknown model type: {model}")

        return self._format_shap_output(shap_val, feature_vector[0])

    def explain_ensemble(self, feature_vector: np.ndarray) -> dict:
        """
        Compute SHAP values from RF, GB, and SVM and average them.
        RF(weight=2) + GB(weight=1) + SVM(weight=1)
        """
        if len(feature_vector.shape) == 1:
            feature_vector = feature_vector.reshape(1, -1)

        # 1. RF SHAP
        rf_shap_all = self.tree_explainer.shap_values(feature_vector)
        if isinstance(rf_shap_all, list):
            rf_shap = rf_shap_all[1][0] if len(rf_shap_all) > 1 else rf_shap_all[0][0]
        else:
            rf_shap = rf_shap_all[0, :, 1] if len(rf_shap_all.shape) == 3 else rf_shap_all[0]
            
        # 2. GB SHAP
        gb_shap_all = self.gb_explainer.shap_values(feature_vector)
        if isinstance(gb_shap_all, list):
            gb_shap = gb_shap_all[1][0] if len(gb_shap_all) > 1 else gb_shap_all[0][0]
        else:
            gb_shap = gb_shap_all[0, :, 1] if len(gb_shap_all.shape) == 3 else gb_shap_all[0]
            
        # 3. SVM SHAP (using KernelExplainer probabilities for Class 1)
        svm_shap_all = self.kernel_explainer.shap_values(feature_vector)
        if isinstance(svm_shap_all, list):
            svm_shap = svm_shap_all[1][0] if len(svm_shap_all) > 1 else svm_shap_all[0][0]
        else:
            svm_shap = svm_shap_all[0, :, 1] if len(svm_shap_all.shape) == 3 else svm_shap_all[0]

        # Weighted average SHAP values
        ensemble_shap = (2 * rf_shap + 1 * gb_shap + 1 * svm_shap) / 4

        return self._format_shap_output(ensemble_shap, feature_vector[0])

    def _format_shap_output(self, shap_values, feature_vector) -> dict:
        FLOAT_FEATURES = [
            "commit_frequency",
            "code_churn",
            "pr_cycle_time_hours",
            "sprint_velocity_ratio",
            "avg_task_aging_days",
            "backlog_growth_rate",
            "messages_per_day",
            "sentiment_score"
        ]
        
        # Reconstruct raw values by selectively inverse transforming float features
        raw_values = list(feature_vector)
        float_indices = [self.feature_cols.index(col) for col in FLOAT_FEATURES]
        float_scaled = [feature_vector[idx] for idx in float_indices]
        float_raw = self.scaler.inverse_transform([float_scaled])[0]
        
        for idx, float_idx in enumerate(float_indices):
            raw_values[float_idx] = float_raw[idx]
        
        drivers = []
        for idx, col in enumerate(self.feature_cols):
            shap_val = float(shap_values[idx])
            raw_val = float(raw_values[idx])
            
            # Risk direction
            direction = "INCREASES_RISK" if shap_val > 0 else "DECREASES_RISK"
            
            # Severity contribution
            abs_shap = abs(shap_val)
            if abs_shap > 0.15:
                severity = "HIGH"
            elif abs_shap > 0.05:
                severity = "MEDIUM"
            else:
                severity = "LOW"

            # Get percentile of this value in background training data
            col_series = self.train_df[col]
            percentile = float((col_series <= raw_val).mean() * 100)
            
            # Build interpretation text
            interp_config = INTERPRETATIONS.get(col, {"high_risk": "N/A", "low_risk": "N/A"})
            # Higher values increases risk for features except those where higher values are better
            # e.g., commit_frequency, sprint_velocity_ratio, sentiment_score, messages_per_day, active_users, contributor_count
            higher_better_feats = ["commit_frequency", "sprint_velocity_ratio", "sentiment_score", "messages_per_day", "active_users", "contributor_count"]
            
            if col in higher_better_feats:
                interpretation = interp_config["high_risk"] if raw_val < 0.4 else interp_config["low_risk"]
            else:
                interpretation = interp_config["high_risk"] if (raw_val > 0.5 or raw_val == 1) else interp_config["low_risk"]

            healthy_avg = float(self.healthy_averages.get(col, 0.0))
            detail = f"This feature is at the {percentile:.1f}th percentile of the training set — compared to a healthy project average of {healthy_avg:.2f}"

            drivers.append({
                "feature": col,
                "raw_value": raw_val,
                "shap_value": shap_val,
                "shap_value_abs": abs_shap,
                "direction": direction,
                "severity_contribution": severity,
                "interpretation": interpretation,
                "detail": detail
            })

        # Sort drivers by absolute SHAP value descending
        drivers = sorted(drivers, key=lambda x: x["shap_value_abs"], reverse=True)
        top_3_drivers = []
        for rank, d in enumerate(drivers[:3]):
            d["rank"] = rank + 1
            top_3_drivers.append(d)

        # Predict probability using ensemble model
        pred_prob = float(self.ensemble.predict_proba(feature_vector.reshape(1, -1))[0][1])
        base_val = 0.5  # Base reference probability value

        total_risk = float(sum([d["shap_value"] for d in drivers if d["shap_value"] > 0]))

        agreement_info = self.model_agreement_check(feature_vector)

        return {
            "top_3_drivers": top_3_drivers,
            "base_value": base_val,
            "prediction_value": pred_prob,
            "total_risk_contribution": total_risk,
            "model_agreement": agreement_info["agreement"]
        }

    def model_agreement_check(self, feature_vector) -> dict:
        """
        Check if all models agree on prediction.
        """
        fv = feature_vector.reshape(1, -1) if len(feature_vector.shape) == 1 else feature_vector
        
        svm_pred = int(self.svm_model.predict(fv)[0])
        rf_pred = int(self.rf_model.predict(fv)[0])
        gb_pred = int(self.gb_model.predict(fv)[0])
        ens_pred = int(self.ensemble.predict(fv)[0])

        preds = [svm_pred, rf_pred, gb_pred]
        unique_preds = set(preds)

        # Map labels to string representation
        def label_to_str(l):
            return "AT_RISK" if l == 1 else "HEALTHY"

        if len(unique_preds) == 1:
            agreement = "FULL"
            confidence = "HIGH"
        elif len(unique_preds) == 2:
            # If 2 agree, check splits
            agreement = "PARTIAL"
            confidence = "MEDIUM"
        else:
            agreement = "SPLIT"
            confidence = "LOW"

        ens_str = label_to_str(ens_pred)
        recommendation = f"Treat as {ens_str} with {confidence} confidence — "
        if agreement == "FULL":
            recommendation += "all 3 models agree"
        elif agreement == "PARTIAL":
            # Count agreement
            agree_count = preds.count(ens_pred)
            recommendation += f"{agree_count} of 3 models agree"
        else:
            recommendation += "models are split"

        return {
            "svm_prediction": label_to_str(svm_pred),
            "rf_prediction": label_to_str(rf_pred),
            "gb_prediction": label_to_str(gb_pred),
            "ensemble_prediction": ens_str,
            "agreement": agreement,
            "confidence": confidence,
            "recommendation": recommendation
        }

    def generate_shap_summary_plot(self, X_test_scaled, save_path='models/plots/shap_summary.png'):
        """
        Generate and save SHAP summary beeswarm plot for the RF model.
        """
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        shap_values = self.tree_explainer.shap_values(X_test_scaled)
        
        # Class 1 (AT_RISK)
        # RF shap_values is a list for classification. class 1 is index 1.
        val_to_plot = shap_values[1] if isinstance(shap_values, list) else shap_values
        
        plt.figure(figsize=(10, 6))
        shap.summary_plot(
            val_to_plot,
            X_test_scaled,
            feature_names=self.feature_cols,
            show=False,
            plot_type='beeswarm'
        )
        plt.tight_layout()
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"SHAP summary plot saved to {save_path}")
