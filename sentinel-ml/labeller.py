import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def assign_labels(df):
    """
    Assigns binary label (0 = HEALTHY, 1 = AT_RISK) based on specific conditions.
    df: DataFrame containing the raw features from feature_engineering.py
    """
    if df.empty:
        raise ValueError("Empty DataFrame provided to labeller.")
        
    df_labelled = df.copy()
    
    # We need to compute normalized code_churn for the threshold check
    temp_scaler = MinMaxScaler()
    df_labelled['normalized_churn'] = temp_scaler.fit_transform(df_labelled[['code_churn']])
    
    labels = []
    for _, row in df_labelled.iterrows():
        is_at_risk = (
            (row['sprint_velocity_ratio'] < 0.6) or
            (row['avg_task_aging_days'] > 7) or
            (row['pr_cycle_time_hours'] > 48) or
            (row['sentiment_score'] < -0.2) or
            (row['normalized_churn'] > 0.85)
        )
        labels.append(1 if is_at_risk else 0)
        
    df_labelled['label'] = labels
    df_labelled.drop(columns=['normalized_churn'], inplace=True)
    
    # Log class distribution
    class_dist = df_labelled['label'].value_counts().to_dict()
    logger.info(f"Class distribution after labelling: {class_dist}")
    
    # If fewer than 10 labelled samples exist, raise a clear error
    if len(df_labelled) < 10:
        raise ValueError("Insufficient training data — collect more scans before training")
        
    return df_labelled
