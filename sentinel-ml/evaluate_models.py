import os
import datetime
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, confusion_matrix, classification_report,
    precision_recall_curve, roc_curve, average_precision_score
)

def main():
    print("Evaluating models...")
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Load data
    train_df = pd.read_csv("data/training_data.csv")
    test_df = pd.read_csv("data/test_data.csv")
    anomaly_df = pd.read_csv("data/anomaly_data.csv")
    
    # Load models
    best_svm = joblib.load("models/svm_classifier.joblib")
    best_rf = joblib.load("models/rf_stability.joblib")
    best_iso = joblib.load("models/isolation_forest.joblib")
    ensemble = joblib.load("models/ensemble_classifier.joblib")
    gb_model = joblib.load("models/gradient_boosting.joblib")
    scaler = joblib.load("models/scaler.joblib")
    feature_cols = joblib.load("models/feature_columns.joblib")
    
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
    
    X_train = train_df[feature_cols].copy()
    y_train = train_df["health_label"]
    X_test = test_df[feature_cols].copy()
    y_test = test_df["health_label"]
    
    X_train_scaled = X_train.copy()
    X_train_scaled[FLOAT_FEATURES] = scaler.transform(X_train[FLOAT_FEATURES])
    
    X_test_scaled = X_test.copy()
    X_test_scaled[FLOAT_FEATURES] = scaler.transform(X_test[FLOAT_FEATURES])
    
    models = {
        'SVM': best_svm,
        'Random Forest': best_rf,
        'Gradient Boosting': gb_model,
        'Ensemble (Voting)': ensemble
    }
    
    results = {}
    for name, model in models.items():
        train_pred = model.predict(X_train_scaled)
        test_pred = model.predict(X_test_scaled)
        train_proba = model.predict_proba(X_train_scaled)[:, 1]
        test_proba = model.predict_proba(X_test_scaled)[:, 1]
        
        cv_f1_mean = 0.0
        cv_f1_std = 0.0
        
        results[name] = {
            'train_accuracy': accuracy_score(y_train, train_pred),
            'test_accuracy': accuracy_score(y_test, test_pred),
            'train_f1': f1_score(y_train, train_pred),
            'test_f1': f1_score(y_test, test_pred),
            'train_precision': precision_score(y_train, train_pred),
            'test_precision': precision_score(y_test, test_pred),
            'train_recall': recall_score(y_train, train_pred),
            'test_recall': recall_score(y_test, test_pred),
            'train_auc_roc': roc_auc_score(y_train, train_proba),
            'test_auc_roc': roc_auc_score(y_test, test_proba),
            'test_avg_precision': average_precision_score(y_test, test_proba),
            'confusion_matrix': confusion_matrix(y_test, test_pred),
            'classification_report': classification_report(y_test, test_pred),
            'test_proba': test_proba
        }
        
    # Anomaly evaluation
    X_anomaly = anomaly_df[feature_cols].copy()
    X_anomaly_scaled = X_anomaly.copy()
    X_anomaly_scaled[FLOAT_FEATURES] = scaler.transform(X_anomaly[FLOAT_FEATURES])
    
    anomaly_preds = best_iso.predict(X_anomaly_scaled)
    anomaly_detection_rate = (anomaly_preds == -1).mean()
    
    train_normal_preds = best_iso.predict(X_train_scaled)
    normal_false_positive_rate = (train_normal_preds == -1).mean()
    
    # Check best model for inference
    best_model_name = max(results, key=lambda k: results[k]['test_f1'])
    
    # Overfitting checks
    overfitting_flags = []
    for name, res in results.items():
        diff = res['train_accuracy'] - res['test_accuracy']
        if diff > 0.05:
            overfitting_flags.append(f"{name} (diff: {diff*100:.2f}%)")
            
    overfitting_str = ", ".join(overfitting_flags) if overfitting_flags else "None detected (all train/test accuracies are within 5% limits)."
    
    # Feature Importances (Random Forest)
    importances = best_rf.feature_importances_
    indices = np.argsort(importances)[::-1]
    feature_ranking_str = ""
    for rank in range(len(feature_cols)):
        col_idx = indices[rank]
        feature_ranking_str += f"  {rank+1:<4} {feature_cols[col_idx]:<25} {importances[col_idx]:.4f}\n"

    # Assemble evaluation report text
    report = f"""╔══════════════════════════════════════════════════════════════════╗
║         SENTINEL-HEALTH AI — MODEL EVALUATION REPORT            ║
╚══════════════════════════════════════════════════════════════════╝
Generated: {timestamp}
Training samples: {len(train_df)}
Test samples: {len(test_df)}

══════════════════════════════════════════
MODEL 1: SVM CLASSIFIER
══════════════════════════════════════════
Best Hyperparameters: {best_svm.get_params()}

TRAINING SET:
  Accuracy:  {results['SVM']['train_accuracy']:.4f} ({results['SVM']['train_accuracy']*100:.2f}%)
  F1-Score:  {results['SVM']['train_f1']:.4f}
  Precision: {results['SVM']['train_precision']:.4f}
  Recall:    {results['SVM']['train_recall']:.4f}
  AUC-ROC:   {results['SVM']['train_auc_roc']:.4f}

TEST SET:
  Accuracy:  {results['SVM']['test_accuracy']:.4f} ({results['SVM']['test_accuracy']*100:.2f}%)
  F1-Score:  {results['SVM']['test_f1']:.4f}
  Precision: {results['SVM']['test_precision']:.4f}
  Recall:    {results['SVM']['test_recall']:.4f}
  AUC-ROC:   {results['SVM']['test_auc_roc']:.4f}
  Avg Precision: {results['SVM']['test_avg_precision']:.4f}

Confusion Matrix (Test):
{results['SVM']['confusion_matrix']}

Classification Report (Test):
{results['SVM']['classification_report']}

══════════════════════════════════════════
MODEL 2: RANDOM FOREST STABILITY SCORER
══════════════════════════════════════════
Best Hyperparameters: {best_rf.get_params()}
OOB Score: {best_rf.oob_score_:.4f}

TRAINING SET:
  Accuracy:  {results['Random Forest']['train_accuracy']:.4f} ({results['Random Forest']['train_accuracy']*100:.2f}%)
  F1-Score:  {results['Random Forest']['train_f1']:.4f}
  Precision: {results['Random Forest']['train_precision']:.4f}
  Recall:    {results['Random Forest']['train_recall']:.4f}
  AUC-ROC:   {results['Random Forest']['train_auc_roc']:.4f}

TEST SET:
  Accuracy:  {results['Random Forest']['test_accuracy']:.4f} ({results['Random Forest']['test_accuracy']*100:.2f}%)
  F1-Score:  {results['Random Forest']['test_f1']:.4f}
  Precision: {results['Random Forest']['test_precision']:.4f}
  Recall:    {results['Random Forest']['test_recall']:.4f}
  AUC-ROC:   {results['Random Forest']['test_auc_roc']:.4f}
  Avg Precision: {results['Random Forest']['test_avg_precision']:.4f}

Confusion Matrix (Test):
{results['Random Forest']['confusion_matrix']}

Classification Report (Test):
{results['Random Forest']['classification_report']}

══════════════════════════════════════════
MODEL 3: GRADIENT BOOSTING CLASSIFIER
══════════════════════════════════════════
Best Hyperparameters: {gb_model.get_params()}

TRAINING SET:
  Accuracy:  {results['Gradient Boosting']['train_accuracy']:.4f} ({results['Gradient Boosting']['train_accuracy']*100:.2f}%)
  F1-Score:  {results['Gradient Boosting']['train_f1']:.4f}
  Precision: {results['Gradient Boosting']['train_precision']:.4f}
  Recall:    {results['Gradient Boosting']['train_recall']:.4f}
  AUC-ROC:   {results['Gradient Boosting']['train_auc_roc']:.4f}

TEST SET:
  Accuracy:  {results['Gradient Boosting']['test_accuracy']:.4f} ({results['Gradient Boosting']['test_accuracy']*100:.2f}%)
  F1-Score:  {results['Gradient Boosting']['test_f1']:.4f}
  Precision: {results['Gradient Boosting']['test_precision']:.4f}
  Recall:    {results['Gradient Boosting']['test_recall']:.4f}
  AUC-ROC:   {results['Gradient Boosting']['test_auc_roc']:.4f}
  Avg Precision: {results['Gradient Boosting']['test_avg_precision']:.4f}

Confusion Matrix (Test):
{results['Gradient Boosting']['confusion_matrix']}

Classification Report (Test):
{results['Gradient Boosting']['classification_report']}

══════════════════════════════════════════
MODEL 4: ENSEMBLE VOTING CLASSIFIER
══════════════════════════════════════════
Best Hyperparameters: {ensemble.get_params()}

TRAINING SET:
  Accuracy:  {results['Ensemble (Voting)']['train_accuracy']:.4f} ({results['Ensemble (Voting)']['train_accuracy']*100:.2f}%)
  F1-Score:  {results['Ensemble (Voting)']['train_f1']:.4f}
  Precision: {results['Ensemble (Voting)']['train_precision']:.4f}
  Recall:    {results['Ensemble (Voting)']['train_recall']:.4f}
  AUC-ROC:   {results['Ensemble (Voting)']['train_auc_roc']:.4f}

TEST SET:
  Accuracy:  {results['Ensemble (Voting)']['test_accuracy']:.4f} ({results['Ensemble (Voting)']['test_accuracy']*100:.2f}%)
  F1-Score:  {results['Ensemble (Voting)']['test_f1']:.4f}
  Precision: {results['Ensemble (Voting)']['test_precision']:.4f}
  Recall:    {results['Ensemble (Voting)']['test_recall']:.4f}
  AUC-ROC:   {results['Ensemble (Voting)']['test_auc_roc']:.4f}
  Avg Precision: {results['Ensemble (Voting)']['test_avg_precision']:.4f}

Confusion Matrix (Test):
{results['Ensemble (Voting)']['confusion_matrix']}

Classification Report (Test):
{results['Ensemble (Voting)']['classification_report']}

══════════════════════════════════════════
MODEL 5: ISOLATION FOREST
══════════════════════════════════════════
Best contamination: {best_iso.contamination}
Anomaly detection rate on anomaly_data.csv: {anomaly_detection_rate * 100:.2f}%
Normal data flagged as anomaly (false positive rate): {normal_false_positive_rate * 100:.2f}%

══════════════════════════════════════════
COMPARISON TABLE
══════════════════════════════════════════
Model                Train Acc  Test Acc  Train F1  Test F1  AUC-ROC
SVM                  {results['SVM']['train_accuracy']:.4f}     {results['SVM']['test_accuracy']:.4f}    {results['SVM']['train_f1']:.4f}    {results['SVM']['test_f1']:.4f}   {results['SVM']['test_auc_roc']:.4f}
Random Forest        {results['Random Forest']['train_accuracy']:.4f}     {results['Random Forest']['test_accuracy']:.4f}    {results['Random Forest']['train_f1']:.4f}    {results['Random Forest']['test_f1']:.4f}   {results['Random Forest']['test_auc_roc']:.4f}
Gradient Boosting    {results['Gradient Boosting']['train_accuracy']:.4f}     {results['Gradient Boosting']['test_accuracy']:.4f}    {results['Gradient Boosting']['train_f1']:.4f}    {results['Gradient Boosting']['test_f1']:.4f}   {results['Gradient Boosting']['test_auc_roc']:.4f}
Ensemble             {results['Ensemble (Voting)']['train_accuracy']:.4f}     {results['Ensemble (Voting)']['test_accuracy']:.4f}    {results['Ensemble (Voting)']['train_f1']:.4f}    {results['Ensemble (Voting)']['test_f1']:.4f}   {results['Ensemble (Voting)']['test_auc_roc']:.4f}

RECOMMENDED MODEL FOR INFERENCE: {best_model_name}
OVERFITTING CHECK: {overfitting_str}

══════════════════════════════════════════
FEATURE IMPORTANCE (Random Forest)
══════════════════════════════════════════
Rank  Feature                  Importance
{feature_ranking_str}
"""
    with open("models/evaluation_report.txt", "w", encoding="utf-8") as f:
        f.write(report)
    print("Saved evaluation report to models/evaluation_report.txt")
    
    # Create plots directory
    os.makedirs("models/plots", exist_ok=True)
    
    # Plot 1: ROC Curves
    plt.figure(figsize=(8, 6))
    for name, res in results.items():
        fpr, tpr, _ = roc_curve(y_test, res['test_proba'])
        plt.plot(fpr, tpr, label=f"{name} (AUC = {res['test_auc_roc']:.3f})")
    plt.plot([0, 1], [0, 1], 'k--', alpha=0.5)
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curves - Test Dataset')
    plt.legend(loc='lower right')
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig("models/plots/roc_curves.png", dpi=150)
    plt.close()
    
    # Plot 2: Precision-Recall Curves
    plt.figure(figsize=(8, 6))
    for name, res in results.items():
        precision_vals, recall_vals, _ = precision_recall_curve(y_test, res['test_proba'])
        plt.plot(recall_vals, precision_vals, label=f"{name} (AP = {res['test_avg_precision']:.3f})")
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.title('Precision-Recall Curves - Test Dataset')
    plt.legend(loc='lower left')
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig("models/plots/precision_recall.png", dpi=150)
    plt.close()
    
    # Plot 3: Confusion Matrices Grid
    fig, axes = plt.subplots(2, 2, figsize=(10, 8))
    axes = axes.ravel()
    for idx, (name, res) in enumerate(results.items()):
        cm = res['confusion_matrix']
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[idx], cbar=False,
                    xticklabels=['HEALTHY', 'AT_RISK'], yticklabels=['HEALTHY', 'AT_RISK'])
        axes[idx].set_title(f"{name} Confusion Matrix")
        axes[idx].set_xlabel('Predicted Label')
        axes[idx].set_ylabel('True Label')
    plt.tight_layout()
    plt.savefig("models/plots/confusion_matrices.png", dpi=150)
    plt.close()
    
    # Plot 4: Feature Importance (Random Forest)
    sorted_importances = importances[indices]
    sorted_features = [feature_cols[i] for i in indices]
    plt.figure(figsize=(10, 6))
    sns.barplot(x=sorted_importances, y=sorted_features, palette="viridis")
    plt.title('Random Forest Feature Importance')
    plt.xlabel('Relative Importance')
    plt.ylabel('Feature')
    plt.tight_layout()
    plt.savefig("models/plots/feature_importance.png", dpi=150)
    plt.close()
    
    # Plot 5: Train vs Test Accuracy comparison
    comparison_data = []
    for name, res in results.items():
        comparison_data.append({'Model': name, 'Dataset': 'Train', 'Accuracy': res['train_accuracy']})
        comparison_data.append({'Model': name, 'Dataset': 'Test', 'Accuracy': res['test_accuracy']})
    comp_df = pd.DataFrame(comparison_data)
    
    plt.figure(figsize=(8, 5))
    sns.barplot(data=comp_df, x='Model', y='Accuracy', hue='Dataset', palette="Set2")
    plt.title('Training vs Testing Accuracy Comparison')
    plt.ylim(0, 1.05)
    plt.ylabel('Accuracy')
    plt.grid(True, axis='y', linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig("models/plots/train_vs_test_accuracy.png", dpi=150)
    plt.close()
    
    # Plot 6: Train vs Test F1 comparison
    comparison_data_f1 = []
    for name, res in results.items():
        comparison_data_f1.append({'Model': name, 'Dataset': 'Train', 'F1-Score': res['train_f1']})
        comparison_data_f1.append({'Model': name, 'Dataset': 'Test', 'F1-Score': res['test_f1']})
    comp_f1_df = pd.DataFrame(comparison_data_f1)
    
    plt.figure(figsize=(8, 5))
    sns.barplot(data=comp_f1_df, x='Model', y='F1-Score', hue='Dataset', palette="Set2")
    plt.title('Training vs Testing F1-Score Comparison')
    plt.ylim(0, 1.05)
    plt.ylabel('F1-Score')
    plt.grid(True, axis='y', linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig("models/plots/train_vs_test_f1.png", dpi=150)
    plt.close()
    
    # Plot 7: SHAP Beeswarm Summary Plot
    print("Generating SHAP summary plot...")
    try:
        from explainer_improved import ImprovedSHAPExplainer
        expl = ImprovedSHAPExplainer()
        expl.generate_shap_summary_plot(X_test_scaled, 'models/plots/shap_summary.png')
    except Exception as e:
        print(f"Error generating SHAP summary plot: {e}")
        
    print("SUCCESS: Evaluation report and all validation plots saved to models/ plots/.")

if __name__ == "__main__":
    main()
