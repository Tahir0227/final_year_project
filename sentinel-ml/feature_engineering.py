import os
import pandas as pd
import numpy as np
import joblib
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from db import get_engine

# Download VADER lexicon on first run
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)

sia = SentimentIntensityAnalyzer()

FEATURE_COLUMNS = [
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
    "aging_flag",
]

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

BURNOUT_MSG_THRESHOLD = 5.0

def get_raw_features(scan_id=None):
    """
    Reads from MySQL and constructs the raw feature vector for each scan_id.
    If scan_id is provided, returns only features for that scan, but uses historical 
    data for imputation.
    """
    engine = get_engine()
    
    # Fetch all metrics
    github_query = "SELECT scan_id, commit_frequency, code_churn, pr_cycle_time_hours, contributor_count FROM github_metrics"
    jira_query = "SELECT scan_id, sprint_velocity_planned, sprint_velocity_completed, avg_task_aging_days, backlog_growth_rate FROM jira_metrics"
    discord_query = "SELECT scan_id, messages_per_day, active_users FROM discord_metrics"
    
    github_df = pd.read_sql(github_query, engine)
    jira_df = pd.read_sql(jira_query, engine)
    discord_df = pd.read_sql(discord_query, engine)
    
    # Fetch all scans to use as base
    scans_query = "SELECT scan_id FROM telemetry_scans"
    scans_df = pd.read_sql(scans_query, engine)
    
    # Fetch sentiment per scan
    messages_query = "SELECT scan_id, content FROM discord_messages"
    messages_df = pd.read_sql(messages_query, engine)
    
    # Calculate sentiment_score
    if not messages_df.empty:
        messages_df['vader_score'] = messages_df['content'].apply(lambda text: sia.polarity_scores(text)['compound'] if isinstance(text, str) else 0)
        sentiment_df = messages_df.groupby('scan_id')['vader_score'].mean().reset_index()
        sentiment_df.rename(columns={'vader_score': 'sentiment_score'}, inplace=True)
    else:
        sentiment_df = pd.DataFrame(columns=['scan_id', 'sentiment_score'])
        
    # Merge all
    df = scans_df.merge(github_df, on='scan_id', how='left')
    df = df.merge(jira_df, on='scan_id', how='left')
    df = df.merge(discord_df, on='scan_id', how='left')
    df = df.merge(sentiment_df, on='scan_id', how='left')
    
    # Derived features
    # sprint_velocity_ratio
    df['sprint_velocity_ratio'] = df.apply(
        lambda row: row['sprint_velocity_completed'] / row['sprint_velocity_planned'] 
        if pd.notnull(row['sprint_velocity_planned']) and row['sprint_velocity_planned'] > 0 else 0,
        axis=1
    )
    
    # Drop intermediate jira columns
    df.drop(columns=['sprint_velocity_planned', 'sprint_velocity_completed'], inplace=True)
    
    # Impute missing values with historical column means
    for col in df.columns:
        if col != 'scan_id' and df[col].isnull().any():
            mean_val = df[col].mean()
            if pd.isna(mean_val): # if column is completely empty, fill with 0
                mean_val = 0
            df[col] = df[col].fillna(mean_val)
            
    # Calculate flags (after imputation so we have valid numbers)
    df['velocity_drop_flag'] = (df['sprint_velocity_ratio'] < 0.6).astype(int)
    df['burnout_flag'] = ((df['messages_per_day'] < BURNOUT_MSG_THRESHOLD) & (df['sentiment_score'] < -0.2)).astype(int)
    df['silo_flag'] = (df['contributor_count'] == 1).astype(int)
    df['aging_flag'] = (df['avg_task_aging_days'] > 7).astype(int)
    
    # Cast to appropriate types
    df['contributor_count'] = df['contributor_count'].astype(int)
    df['active_users'] = df['active_users'].astype(int)
    
    # Order features
    final_cols = ['scan_id'] + FEATURE_COLUMNS
    df = df[final_cols]
    
    if scan_id is not None:
        return df[df['scan_id'] == scan_id]
        
    return df
