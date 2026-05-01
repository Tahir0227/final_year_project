import random
import uuid
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import text
from db import get_engine

def create_tables_if_not_exist(engine):
    with engine.begin() as conn:
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS projects (
            project_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100),
            github_owner VARCHAR(100),
            github_repo VARCHAR(100),
            jira_project_key VARCHAR(50),
            discord_channel_id VARCHAR(50)
        )
        """))
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS telemetry_scans (
            scan_id INT AUTO_INCREMENT PRIMARY KEY,
            project_id VARCHAR(50),
            scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50),
            FOREIGN KEY (project_id) REFERENCES projects(project_id)
        )
        """))
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS github_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            scan_id INT,
            commit_frequency FLOAT,
            code_churn FLOAT,
            pr_cycle_time_hours FLOAT,
            top_contributor VARCHAR(100),
            contributor_count INT,
            FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id)
        )
        """))
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS jira_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            scan_id INT,
            sprint_velocity_planned FLOAT,
            sprint_velocity_completed FLOAT,
            avg_task_aging_days FLOAT,
            backlog_growth_rate FLOAT,
            FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id)
        )
        """))
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS discord_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            scan_id INT,
            messages_per_day FLOAT,
            active_users INT,
            FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id)
        )
        """))
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS discord_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            scan_id INT,
            author_id VARCHAR(50),
            author_name VARCHAR(100),
            content TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id)
        )
        """))
        # Our inference results table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS inference_results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id VARCHAR(50),
            scan_id INT,
            health_label ENUM('HEALTHY', 'AT_RISK'),
            stability_score FLOAT,
            anomaly_detected BOOLEAN,
            shap_driver_1_feature VARCHAR(100),
            shap_driver_1_value FLOAT,
            shap_driver_1_interpretation TEXT,
            shap_driver_2_feature VARCHAR(100),
            shap_driver_2_value FLOAT,
            shap_driver_2_interpretation TEXT,
            shap_driver_3_feature VARCHAR(100),
            shap_driver_3_value FLOAT,
            shap_driver_3_interpretation TEXT,
            inferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scan_id) REFERENCES telemetry_scans(scan_id)
        )
        """))

def seed_database():
    engine = get_engine()
    create_tables_if_not_exist(engine)
    
    with engine.begin() as conn:
        # Check if already seeded
        res = conn.execute(text("SELECT COUNT(*) FROM telemetry_scans")).scalar()
        if res >= 50:
            print("Database already has sufficient data.")
            return

        print("Seeding database with realistic mock data...")
        
        # 1. Insert Project
        project_id = "ProjectAlpha"
        conn.execute(text("""
            INSERT IGNORE INTO projects (project_id, name, github_owner, github_repo, jira_project_key, discord_channel_id)
            VALUES (:pid, 'Project Alpha', 'org', 'repo', 'PA', '123456')
        """), {"pid": project_id})

        # Generate 60 scans (some healthy, some at risk)
        for i in range(1, 61):
            scan_id = i
            
            conn.execute(text("""
                INSERT IGNORE INTO telemetry_scans (scan_id, project_id, status)
                VALUES (:sid, :pid, 'COMPLETED')
            """), {"sid": scan_id, "pid": project_id})
            
            # Make ~30% of scans "AT_RISK"
            is_at_risk = random.random() < 0.3
            
            if is_at_risk:
                # Poor metrics
                commit_freq = random.uniform(0.5, 2.0)
                churn = random.uniform(500, 2000) # High churn
                pr_cycle = random.uniform(49.0, 100.0) # > 48 hours
                contributors = random.choice([1, 2]) # Silo risk
                
                velocity_planned = random.uniform(30, 50)
                velocity_completed = velocity_planned * random.uniform(0.3, 0.5) # < 0.6 ratio
                aging_days = random.uniform(8.0, 15.0) # > 7 days
                backlog_growth = random.uniform(1.2, 2.5)
                
                msgs_per_day = random.uniform(1, 4) # < 5
                active_users = contributors
            else:
                # Healthy metrics
                commit_freq = random.uniform(5.0, 15.0)
                churn = random.uniform(50, 300)
                pr_cycle = random.uniform(5.0, 24.0)
                contributors = random.randint(3, 10)
                
                velocity_planned = random.uniform(30, 50)
                velocity_completed = velocity_planned * random.uniform(0.8, 1.2)
                aging_days = random.uniform(1.0, 5.0)
                backlog_growth = random.uniform(0.8, 1.1)
                
                msgs_per_day = random.uniform(10, 50)
                active_users = contributors
                
            # Insert Github metrics
            conn.execute(text("""
                INSERT INTO github_metrics (scan_id, commit_frequency, code_churn, pr_cycle_time_hours, top_contributor, contributor_count)
                VALUES (:sid, :cf, :cc, :pr, 'user1', :cnt)
            """), {"sid": scan_id, "cf": commit_freq, "cc": churn, "pr": pr_cycle, "cnt": contributors})
            
            # Insert Jira metrics
            conn.execute(text("""
                INSERT INTO jira_metrics (scan_id, sprint_velocity_planned, sprint_velocity_completed, avg_task_aging_days, backlog_growth_rate)
                VALUES (:sid, :vp, :vc, :age, :bg)
            """), {"sid": scan_id, "vp": velocity_planned, "vc": velocity_completed, "age": aging_days, "bg": backlog_growth})
            
            # Insert Discord metrics
            conn.execute(text("""
                INSERT INTO discord_metrics (scan_id, messages_per_day, active_users)
                VALUES (:sid, :msg, :au)
            """), {"sid": scan_id, "msg": msgs_per_day, "au": active_users})
            
            # Insert Discord messages (to drive sentiment)
            # If at risk, generate negative messages
            msg_count = random.randint(1, 5)
            for m in range(msg_count):
                if is_at_risk:
                    content = random.choice([
                        "This is terrible, I hate this project.",
                        "Everything is broken and nothing works.",
                        "I am extremely stressed and burnt out.",
                        "Why is this so difficult?",
                        "Awful experience, fixing bugs all day."
                    ])
                else:
                    content = random.choice([
                        "Great work everyone!",
                        "I love how smooth this deployment was.",
                        "Good progress today.",
                        "Awesome job fixing that issue.",
                        "We are ahead of schedule, excellent."
                    ])
                    
                conn.execute(text("""
                    INSERT INTO discord_messages (scan_id, message_id, author_id, author_name, content)
                    VALUES (:sid, :mid, 'U1', 'dev', :content)
                """), {"sid": scan_id, "mid": str(uuid.uuid4()), "content": content})
                
        print("Successfully seeded 60 scans with comprehensive metrics!")

if __name__ == "__main__":
    seed_database()
