import os
import datetime
import numpy as np
import pandas as pd

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
    "aging_flag"
]

def generate_float(min_val, max_val, size):
    val = np.random.uniform(min_val, max_val, size)
    # Increase Gaussian noise to 0.10 to create realistic overlapping regions
    noise = np.random.normal(0, 0.10, size)
    return np.clip(val + noise, 0.0, 1.0)

def generate_float(min_val, max_val, size):
    val = np.random.uniform(min_val, max_val, size)
    # Increase Gaussian noise to 0.10 to create realistic overlapping regions
    noise = np.random.normal(0, 0.10, size)
    return np.clip(val + noise, 0.0, 1.0)

def generate_healthy_rows(n_rows):
    data = {}
    # Heavy overlaps for continuous features
    data["commit_frequency"] = generate_float(0.30, 0.80, n_rows)
    data["code_churn"] = generate_float(0.20, 0.60, n_rows)
    data["pr_cycle_time_hours"] = generate_float(0.15, 0.55, n_rows)
    data["contributor_count"] = generate_float(0.30, 0.80, n_rows)
    data["sprint_velocity_ratio"] = generate_float(0.45, 0.80, n_rows)
    data["avg_task_aging_days"] = generate_float(0.15, 0.50, n_rows)
    data["backlog_growth_rate"] = generate_float(0.15, 0.55, n_rows)
    data["messages_per_day"] = generate_float(0.30, 0.80, n_rows)
    data["active_users"] = generate_float(0.30, 0.80, n_rows)
    data["sentiment_score"] = generate_float(0.35, 0.75, n_rows)
    
    # Binary flags are randomized to strip direct shortcuts
    data["velocity_drop_flag"] = np.random.choice([0, 1], n_rows, p=[0.50, 0.50])
    data["burnout_flag"] = np.random.choice([0, 1], n_rows, p=[0.50, 0.50])
    data["silo_flag"] = np.random.choice([0, 1], n_rows, p=[0.50, 0.50])
    data["aging_flag"] = np.random.choice([0, 1], n_rows, p=[0.50, 0.50])
    
    data["health_label"] = np.zeros(n_rows, dtype=int)
    return pd.DataFrame(data)

def generate_at_risk_rows(n_rows, sub_type_probs=(0.35, 0.25, 0.25, 0.15)):
    # Calculate counts
    n_a = int(round(n_rows * sub_type_probs[0]))
    n_b = int(round(n_rows * sub_type_probs[1]))
    n_c = int(round(n_rows * sub_type_probs[2]))
    n_d = n_rows - (n_a + n_b + n_c)
    
    dfs = []
    
    # Sub-type A: Technical Debt Risk
    if n_a > 0:
        a_data = {}
        a_data["commit_frequency"] = generate_float(0.20, 0.60, n_a)
        a_data["code_churn"] = generate_float(0.40, 0.80, n_a)
        a_data["pr_cycle_time_hours"] = generate_float(0.40, 0.80, n_a)
        a_data["contributor_count"] = generate_float(0.15, 0.55, n_a)
        a_data["sprint_velocity_ratio"] = generate_float(0.25, 0.60, n_a)
        a_data["avg_task_aging_days"] = generate_float(0.35, 0.75, n_a)
        a_data["backlog_growth_rate"] = generate_float(0.35, 0.75, n_a)
        a_data["messages_per_day"] = generate_float(0.20, 0.55, n_a)
        a_data["active_users"] = generate_float(0.20, 0.55, n_a)
        a_data["sentiment_score"] = generate_float(0.20, 0.55, n_a)
        
        a_data["velocity_drop_flag"] = np.random.choice([0, 1], n_a, p=[0.50, 0.50])
        a_data["burnout_flag"] = np.random.choice([0, 1], n_a, p=[0.50, 0.50])
        a_data["silo_flag"] = np.random.choice([0, 1], n_a, p=[0.50, 0.50])
        a_data["aging_flag"] = np.random.choice([0, 1], n_a, p=[0.50, 0.50])
        
        a_data["health_label"] = np.ones(n_a, dtype=int)
        dfs.append(pd.DataFrame(a_data))
        
    # Sub-type B: Burnout / Communication Risk
    if n_b > 0:
        b_data = {}
        b_data["commit_frequency"] = generate_float(0.20, 0.60, n_b)
        b_data["code_churn"] = generate_float(0.20, 0.60, n_b)
        b_data["pr_cycle_time_hours"] = generate_float(0.20, 0.60, n_b)
        b_data["contributor_count"] = generate_float(0.20, 0.50, n_b)
        b_data["sprint_velocity_ratio"] = generate_float(0.20, 0.55, n_b)
        b_data["avg_task_aging_days"] = generate_float(0.25, 0.65, n_b)
        b_data["backlog_growth_rate"] = generate_float(0.25, 0.65, n_b)
        b_data["messages_per_day"] = generate_float(0.20, 0.55, n_b)
        b_data["active_users"] = generate_float(0.20, 0.55, n_b)
        b_data["sentiment_score"] = generate_float(0.20, 0.55, n_b)
        
        b_data["velocity_drop_flag"] = np.random.choice([0, 1], n_b, p=[0.50, 0.50])
        b_data["burnout_flag"] = np.random.choice([0, 1], n_b, p=[0.50, 0.50])
        b_data["silo_flag"] = np.random.choice([0, 1], n_b, p=[0.50, 0.50])
        b_data["aging_flag"] = np.random.choice([0, 1], n_b, p=[0.50, 0.50])
        
        b_data["health_label"] = np.ones(n_b, dtype=int)
        dfs.append(pd.DataFrame(b_data))
        
    # Sub-type C: Management / Process Risk
    if n_c > 0:
        c_data = {}
        c_data["commit_frequency"] = generate_float(0.25, 0.60, n_c)
        c_data["code_churn"] = generate_float(0.25, 0.60, n_c)
        c_data["pr_cycle_time_hours"] = generate_float(0.25, 0.60, n_c)
        c_data["contributor_count"] = generate_float(0.25, 0.60, n_c)
        c_data["sprint_velocity_ratio"] = generate_float(0.25, 0.60, n_c)
        c_data["avg_task_aging_days"] = generate_float(0.35, 0.75, n_c)
        c_data["backlog_growth_rate"] = generate_float(0.35, 0.75, n_c)
        c_data["messages_per_day"] = generate_float(0.25, 0.60, n_c)
        c_data["active_users"] = generate_float(0.25, 0.60, n_c)
        c_data["sentiment_score"] = generate_float(0.20, 0.50, n_c)
        
        c_data["velocity_drop_flag"] = np.random.choice([0, 1], n_c, p=[0.50, 0.50])
        c_data["burnout_flag"] = np.random.choice([0, 1], n_c, p=[0.50, 0.50])
        c_data["silo_flag"] = np.random.choice([0, 1], n_c, p=[0.50, 0.50])
        c_data["aging_flag"] = np.random.choice([0, 1], n_c, p=[0.50, 0.50])
        
        c_data["health_label"] = np.ones(n_c, dtype=int)
        dfs.append(pd.DataFrame(c_data))

    # Sub-type D: Early Warning Risk
    if n_d > 0:
        d_data = {}
        d_data["commit_frequency"] = generate_float(0.25, 0.60, n_d)
        d_data["code_churn"] = generate_float(0.30, 0.70, n_d)
        d_data["pr_cycle_time_hours"] = generate_float(0.30, 0.60, n_d)
        d_data["contributor_count"] = generate_float(0.25, 0.50, n_d)
        d_data["sprint_velocity_ratio"] = generate_float(0.30, 0.60, n_d)
        d_data["avg_task_aging_days"] = generate_float(0.25, 0.55, n_d)
        d_data["backlog_growth_rate"] = generate_float(0.25, 0.55, n_d)
        d_data["messages_per_day"] = generate_float(0.25, 0.50, n_d)
        d_data["active_users"] = generate_float(0.25, 0.50, n_d)
        d_data["sentiment_score"] = generate_float(0.25, 0.50, n_d)
        
        d_d = n_d
        d_data["velocity_drop_flag"] = np.random.choice([0, 1], d_d, p=[0.50, 0.50])
        d_data["burnout_flag"] = np.random.choice([0, 1], d_d, p=[0.50, 0.50])
        d_data["silo_flag"] = np.random.choice([0, 1], d_d, p=[0.50, 0.50])
        d_data["aging_flag"] = np.random.choice([0, 1], d_d, p=[0.50, 0.50])
        
        d_data["health_label"] = np.ones(n_d, dtype=int)
        dfs.append(pd.DataFrame(d_data))
        
    return pd.concat(dfs, ignore_index=True)

def generate_anomaly_rows(n_rows):
    # n_rows should be split evenly across 4 patterns
    n_p = n_rows // 4
    remainder = n_rows % 4
    counts = [n_p] * 4
    for i in range(remainder):
        counts[i] += 1
        
    dfs = []
    
    # Pattern 1: Sudden complete silence
    if counts[0] > 0:
        p1 = {}
        for col in FEATURE_COLUMNS:
            if col in ["commit_frequency", "messages_per_day", "active_users"]:
                p1[col] = generate_float(0.0, 0.05, counts[0])
            elif col in ["velocity_drop_flag", "burnout_flag", "silo_flag", "aging_flag"]:
                p1[col] = np.zeros(counts[0], dtype=int)
            else:
                p1[col] = generate_float(0.0, 0.1, counts[0])
        p1["anomaly_type"] = ["Pattern1"] * counts[0]
        dfs.append(pd.DataFrame(p1))
        
    # Pattern 2: Explosive activity spike
    if counts[1] > 0:
        p2 = {}
        for col in FEATURE_COLUMNS:
            if col in ["commit_frequency", "code_churn"]:
                p2[col] = generate_float(0.95, 1.0, counts[1])
            elif col in ["velocity_drop_flag", "burnout_flag", "silo_flag", "aging_flag"]:
                p2[col] = np.ones(counts[1], dtype=int)
            else:
                p2[col] = generate_float(0.8, 1.0, counts[1])
        p2["anomaly_type"] = ["Pattern2"] * counts[1]
        dfs.append(pd.DataFrame(p2))
        
    # Pattern 3: Contradictory signals
    if counts[2] > 0:
        p3 = {}
        for col in FEATURE_COLUMNS:
            if col == "sprint_velocity_ratio":
                p3[col] = generate_float(0.9, 1.0, counts[2])
            elif col == "sentiment_score":
                p3[col] = generate_float(0.0, 0.05, counts[2])
            elif col == "avg_task_aging_days":
                p3[col] = generate_float(0.9, 1.0, counts[2])
            elif col in ["velocity_drop_flag", "burnout_flag", "silo_flag", "aging_flag"]:
                p3[col] = np.random.choice([0, 1], counts[2])
            else:
                p3[col] = generate_float(0.3, 0.7, counts[2])
        p3["anomaly_type"] = ["Pattern3"] * counts[2]
        dfs.append(pd.DataFrame(p3))
        
    # Pattern 4: Random uniform noise
    if counts[3] > 0:
        p4 = {}
        for col in FEATURE_COLUMNS:
            if col in ["velocity_drop_flag", "burnout_flag", "silo_flag", "aging_flag"]:
                p4[col] = np.random.choice([0, 1], counts[3])
            else:
                p4[col] = np.random.uniform(0.0, 1.0, counts[3])
        p4["anomaly_type"] = ["Pattern4"] * counts[3]
        dfs.append(pd.DataFrame(p4))
        
    return pd.concat(dfs, ignore_index=True)

def main():
    np.random.seed(42)
    os.makedirs("data", exist_ok=True)
    
    print("Generating training data (5000 rows)...")
    train_healthy = generate_healthy_rows(2500)
    train_at_risk = generate_at_risk_rows(2500)
    train_df = pd.concat([train_healthy, train_at_risk], ignore_index=True)
    # Shuffle
    train_df = train_df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    train_df.to_csv("data/training_data.csv", index=False)
    
    print("Generating test data (1000 rows)...")
    test_healthy = generate_healthy_rows(500)
    test_at_risk = generate_at_risk_rows(500)
    test_df = pd.concat([test_healthy, test_at_risk], ignore_index=True)
    # Shuffle
    test_df = test_df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    test_df.to_csv("data/test_data.csv", index=False)
    
    print("Generating anomaly data (500 rows)...")
    anomaly_df = generate_anomaly_rows(500)
    # Shuffle
    anomaly_df = anomaly_df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    anomaly_df.to_csv("data/anomaly_data.csv", index=False)
    
    print("Generating dataset report...")
    # Calculate distributions
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Means & Stds by class
    means = train_df.groupby("health_label")[FEATURE_COLUMNS].mean().transpose()
    stds = train_df.groupby("health_label")[FEATURE_COLUMNS].std().transpose()
    
    # Sub-type calculations
    # Let's recreate/check how many were generated
    # We can inspect the combination of burnout_flag, silo_flag, code_churn ranges
    # Since we generated exactly 875, 625, 625, 375, we can hardcode or count. 
    # Let's count them or state what was target generated.
    
    corr_matrix = train_df[FEATURE_COLUMNS].corr()
    
    report_text = f"""=== Sentinel-Health AI Dataset Report ===
Generated: {timestamp}

training_data.csv:
  Total rows: {len(train_df)}
  HEALTHY (0): {len(train_df[train_df['health_label'] == 0])} (50.0%)
  AT_RISK (1): {len(train_df[train_df['health_label'] == 1])} (50.0%)
  AT_RISK sub-types: A=875, B=625, C=625, D=375

test_data.csv:
  Total rows: {len(test_df)}
  HEALTHY (0): {len(test_df[test_df['health_label'] == 0])} (50.0%)
  AT_RISK (1): {len(test_df[test_df['health_label'] == 1])} (50.0%)

anomaly_data.csv:
  Total rows: {len(anomaly_df)}
  Pattern distribution: P1=125, P2=125, P3=125, P4=125

Feature Means by Class:
{means.to_string()}

Feature Std by Class:
{stds.to_string()}

Feature Correlation Matrix:
{corr_matrix.to_string()}
"""
    with open("data/dataset_report.txt", "w", encoding="utf-8") as f:
        f.write(report_text)
        
    print("Datasets successfully generated and saved to data/")

if __name__ == "__main__":
    main()
