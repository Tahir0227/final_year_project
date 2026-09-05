import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from imblearn.over_sampling import SMOTE
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier, IsolationForest
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, StratifiedKFold
from sklearn.metrics import f1_score

FEATURE_COLS = [
    "commit_frequency",
    "code_churn",
    "pr_cycle_time_hours",
    "contributor_count",
    "sprint_velocity_ratio",
    "avg_task_aging_days",
    "backlog_growth_rate",
    "messages_per_day",
    "active_users",
    "sentiment_score",
    "velocity_drop_flag",
    "burnout_flag",
    "silo_flag",
    "aging_flag"
]

def validate_datasets(train_df, test_df, anomaly_df):
    print("Validating datasets...")
    for name, df in [("Train", train_df), ("Test", test_df)]:
        # Check columns
        missing_feats = [col for col in FEATURE_COLS if col not in df.columns]
        if missing_feats:
            raise ValueError(f"{name} dataset is missing columns: {missing_feats}")
        if "health_label" not in df.columns:
            raise ValueError(f"{name} dataset is missing 'health_label' column")
        # Check NaNs
        if df.isna().any().any():
            raise ValueError(f"{name} dataset contains NaN values")
        # Check label values
        labels = df["health_label"].unique()
        if not set(labels).issubset({0, 1}):
            raise ValueError(f"{name} dataset 'health_label' has invalid values: {labels}")
            
    # Validate anomaly dataset
    missing_anomaly_feats = [col for col in FEATURE_COLS if col not in anomaly_df.columns]
    if missing_anomaly_feats:
        raise ValueError(f"Anomaly dataset is missing columns: {missing_anomaly_feats}")
    if anomaly_df.isna().any().any():
        raise ValueError("Anomaly dataset contains NaN values")
        
    print("All datasets are validated successfully. Shapes:")
    print(f"  Train: {train_df.shape}")
    print(f"  Test: {test_df.shape}")
    print(f"  Anomaly: {anomaly_df.shape}")

def run_improved_training_pipeline():
    np.random.seed(42)
    
    # 1. Load CSVs
    if not (os.path.exists("data/training_data.csv") and os.path.exists("data/test_data.csv") and os.path.exists("data/anomaly_data.csv")):
        print("Error: CSV datasets not found in data/ directory. Run create_dataset.py first.")
        sys.exit(1)
        
    train_df = pd.read_csv("data/training_data.csv")
    test_df = pd.read_csv("data/test_data.csv")
    anomaly_df = pd.read_csv("data/anomaly_data.csv")
    
    # Validate
    validate_datasets(train_df, test_df, anomaly_df)
    
    X_train = train_df[FEATURE_COLS]
    y_train = train_df["health_label"]
    X_test = test_df[FEATURE_COLS]
    y_test = test_df["health_label"]
    
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
    
    # 2. Scaler fitting on Train set only (scale only the continuous float features)
    print("\nScaling features...")
    scaler = MinMaxScaler()
    
    X_train_scaled = X_train.copy()
    X_train_scaled[FLOAT_FEATURES] = scaler.fit_transform(X_train[FLOAT_FEATURES])
    
    X_test_scaled = X_test.copy()
    X_test_scaled[FLOAT_FEATURES] = scaler.transform(X_test[FLOAT_FEATURES])
    
    # 3. SMOTE resampling on Train set only (for slight augmentation and robustness)
    print("Applying SMOTE resampling...")
    smote = SMOTE(random_state=42, k_neighbors=5)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
    print(f"  Resampled Train Shape: {X_train_resampled.shape}, Class distribution: {np.bincount(y_train_resampled)}")
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # 4. Model A: SVM Classifier Grid Search
    print("\nTuning SVM Classifier (GridSearchCV)...")
    svm_param_grid = {
        'C': [0.1, 1, 10, 100],
        'gamma': ['scale', 'auto', 0.01, 0.1],
        'kernel': ['rbf', 'poly'],
        'class_weight': ['balanced', None]
    }
    svm_grid = GridSearchCV(
        SVC(probability=True, random_state=42),
        svm_param_grid,
        cv=cv,
        scoring='f1',
        n_jobs=-1,
        verbose=1
    )
    svm_grid.fit(X_train_resampled, y_train_resampled)
    best_svm = svm_grid.best_estimator_
    print(f"  Best SVM params: {svm_grid.best_params_}")
    print(f"  Best CV F1 score: {svm_grid.best_score_:.4f}")
    
    # 5. Model B: Random Forest Classifier Search
    print("\nTuning Random Forest Classifier (RandomizedSearchCV)...")
    rf_param_dist = {
        'n_estimators': [100, 200, 300, 500],
        'max_depth': [5, 10, 15, 20, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4],
        'max_features': ['sqrt', 'log2', 0.3, 0.5],
        'class_weight': ['balanced', 'balanced_subsample', None]
    }
    rf_search = RandomizedSearchCV(
        RandomForestClassifier(random_state=42, oob_score=True),
        rf_param_dist,
        n_iter=25,
        cv=cv,
        scoring='f1',
        n_jobs=-1,
        random_state=42,
        verbose=1
    )
    rf_search.fit(X_train_resampled, y_train_resampled)
    best_rf = rf_search.best_estimator_
    print(f"  Best RF params: {rf_search.best_params_}")
    print(f"  Best RF OOB score: {best_rf.oob_score_:.4f}")
    
    # 6. Gradient Boosting Classifier (comparison model)
    print("\nTraining Gradient Boosting Classifier...")
    gb_model = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        random_state=42
    )
    gb_model.fit(X_train_resampled, y_train_resampled)
    
    # 7. Model C: Isolation Forest contamination tuning
    print("\nTuning Isolation Forest...")
    X_anomaly = anomaly_df[FEATURE_COLS].copy()
    X_anomaly_scaled = X_anomaly.copy()
    X_anomaly_scaled[FLOAT_FEATURES] = scaler.transform(X_anomaly[FLOAT_FEATURES])
    
    # Combine normal training data and anomalous data
    X_iso_train = np.vstack([X_train_scaled, X_anomaly_scaled])
    
    best_iso = None
    best_contamination = 0.05
    for contamination in [0.03, 0.05, 0.08, 0.10, 0.15]:
        iso = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            max_features=0.8,
            bootstrap=True,
            random_state=42,
            n_jobs=-1
        )
        iso.fit(X_iso_train)
        
        # Evaluate anomaly detection rate on anomaly_data.csv
        anomaly_preds = iso.predict(X_anomaly_scaled)
        detection_rate = (anomaly_preds == -1).mean()
        print(f"  Contamination {contamination:.3f}: anomaly detection rate = {detection_rate * 100:.2f}%")
        
        if detection_rate >= 0.70:
            best_iso = iso
            best_contamination = contamination
            break
            
    if best_iso is None:
        print("  Warning: No contamination parameter met the 70% threshold. Defaulting to 0.05")
        best_iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=42, n_jobs=-1)
        best_iso.fit(X_iso_train)
        best_contamination = 0.05
        
    # 8. Model D: Ensemble Voting Classifier
    print("\nBuilding Ensemble Voting Classifier...")
    ensemble = VotingClassifier(
        estimators=[
            ('svm', best_svm),
            ('rf', best_rf),
            ('gb', gb_model)
        ],
        voting='soft',
        weights=[1, 2, 1]  # Give RF double weighting
    )
    ensemble.fit(X_train_resampled, y_train_resampled)
    
    # 9. Saving models
    os.makedirs("models", exist_ok=True)
    joblib.dump(best_svm, "models/svm_classifier.joblib")
    joblib.dump(best_rf, "models/rf_stability.joblib")
    joblib.dump(best_iso, "models/isolation_forest.joblib")
    joblib.dump(ensemble, "models/ensemble_classifier.joblib")
    joblib.dump(gb_model, "models/gradient_boosting.joblib")
    joblib.dump(scaler, "models/scaler.joblib")
    joblib.dump(FEATURE_COLS, "models/feature_columns.joblib")
    
    print("\nSUCCESS: All models, scaling objects, and configs saved to models/")

if __name__ == "__main__":
    run_improved_training_pipeline()
