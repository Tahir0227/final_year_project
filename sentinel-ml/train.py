import os
import joblib
import pandas as pd
from collections import Counter
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from imblearn.over_sampling import SMOTE

from feature_engineering import get_raw_features, FEATURE_COLUMNS, FLOAT_FEATURES
from labeller import assign_labels

def run_training_pipeline():
    print("Starting training pipeline...")
    os.makedirs("models", exist_ok=True)
    
    # 1. Get feature DataFrame
    df = get_raw_features()
    
    # 2. Get labels
    df = assign_labels(df)
    
    # Feature columns and labels
    X = df[FEATURE_COLUMNS]
    y = df['label']
    
    print(f"Total samples: {len(X)}")
    
    # 3. Stratified split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    class_dist_before = dict(Counter(y_train))
    
    # 4. Apply SMOTE only on training set
    smote = SMOTE(random_state=42)
    
    # If the minority class has fewer than n_neighbors (default 5), SMOTE will fail.
    # So dynamically adjust k_neighbors if necessary
    min_class_count = min(class_dist_before.values())
    if min_class_count <= 5:
        smote = SMOTE(k_neighbors=min_class_count - 1, random_state=42)
        
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    class_dist_after = dict(Counter(y_train_res))
    
    # 5. Fit MinMaxScaler on training set only
    scaler = MinMaxScaler()
    
    # We only scale the float features, but for simplicity, we can scale all features
    # or just the float features. The prompt says "Normalise all float features to [0,1]".
    # We will fit scaler on FLOAT_FEATURES only.
    scaler.fit(X_train_res[FLOAT_FEATURES])
    
    # Transform both train and test
    X_train_scaled = X_train_res.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[FLOAT_FEATURES] = scaler.transform(X_train_res[FLOAT_FEATURES])
    X_test_scaled[FLOAT_FEATURES] = scaler.transform(X_test[FLOAT_FEATURES])
    
    # 6. Train models
    print("Training SVM Classifier...")
    svm_clf = SVC(kernel='rbf', C=1.0, gamma='scale', probability=True, random_state=42)
    svm_clf.fit(X_train_scaled, y_train_res)
    
    print("Training Random Forest Stability Scorer...")
    rf_clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    rf_clf.fit(X_train_scaled, y_train_res)
    
    print("Training Isolation Forest Anomaly Detector...")
    # Trained on ALL feature data (unsupervised)
    X_all_scaled = X.copy()
    X_all_scaled[FLOAT_FEATURES] = scaler.transform(X[FLOAT_FEATURES])
    iso_forest = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    iso_forest.fit(X_all_scaled)
    
    # Save models and background data for SHAP
    joblib.dump(svm_clf, 'models/svm_classifier.joblib')
    joblib.dump(rf_clf, 'models/rf_stability.joblib')
    joblib.dump(iso_forest, 'models/isolation_forest.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    
    # Save background data for SHAP KernelExplainer
    background_data = shap.sample(X_train_scaled, 50) if 'shap' in globals() else X_train_scaled.sample(n=min(50, len(X_train_scaled)), random_state=42)
    joblib.dump(background_data, 'models/background_data.joblib')
    
    # Evaluate SVM
    svm_preds = svm_clf.predict(X_test_scaled)
    svm_probs = svm_clf.predict_proba(X_test_scaled)[:, 1]
    
    svm_f1 = f1_score(y_test, svm_preds)
    svm_prec = precision_score(y_test, svm_preds, zero_division=0)
    svm_rec = recall_score(y_test, svm_preds, zero_division=0)
    try:
        svm_auc = roc_auc_score(y_test, svm_probs)
    except ValueError:
        svm_auc = 0.0 # Handle case where only 1 class is in y_test
        
    # Evaluate RF
    rf_preds = rf_clf.predict(X_test_scaled)
    rf_probs = rf_clf.predict_proba(X_test_scaled)[:, 1]
    
    rf_f1 = f1_score(y_test, rf_preds)
    try:
        rf_auc = roc_auc_score(y_test, rf_probs)
    except ValueError:
        rf_auc = 0.0
        
    # Evaluate IF (Anomaly rate on test set)
    if_preds = iso_forest.predict(X_test_scaled)
    # -1 means anomaly, 1 means normal
    anomalies = (if_preds == -1).sum()
    anomaly_rate = (anomalies / len(X_test_scaled)) * 100
    
    report = f"""=== SVM Classifier ===
F1-Score: {svm_f1:.2f}
Precision: {svm_prec:.2f}
Recall: {svm_rec:.2f}
AUC-ROC: {svm_auc:.2f}

=== Random Forest ===
F1-Score: {rf_f1:.2f}
AUC-ROC: {rf_auc:.2f}

=== Isolation Forest ===
Anomaly Rate on test set: {anomaly_rate:.2f}%

Training samples (after SMOTE): {len(X_train_res)}
Test samples: {len(X_test_scaled)}
Class distribution before SMOTE: {class_dist_before}
Class distribution after SMOTE: {class_dist_after}
"""
    
    print("Evaluation Report:\n", report)
    with open('models/evaluation_report.txt', 'w') as f:
        f.write(report)
        
    print("Training pipeline completed successfully.")

if __name__ == "__main__":
    run_training_pipeline()
