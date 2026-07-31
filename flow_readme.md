# Sentinel: Project Health & Telemetry Analysis System
## Architectural & File Flow Documentation

This document explains the end-to-end architecture, file details, and execution flows for the **Sentinel API Gateway** and the **Sentinel ML Service** (`sentinel-ml`). This is a complete breakdown of how the systems extract telemetry data, process features, and run machine learning models to identify project risk levels, calculate stability, and explain risk drivers.

---

## 1. System Architecture Overview

Sentinel is a microservice-based system designed to monitor and evaluate software project health by extracting and analyzing metrics from three primary developer platforms: **GitHub**, **Jira**, and **Discord**. 

```mermaid
flowchart TD
    subgraph Data Extraction (API Gateway)
        Scheduler[scheduler.js] -->|Cron Trigger| Service[telemetryService.js]
        Router[telemetryRouter.js] -->|HTTP POST /collect| Service
        Service --> GH_Adapter[githubAdapter.js]
        Service --> Jira_Adapter[jiraAdapter.js]
        Service --> Discord_Adapter[discordAdapter.js]
    end

    subgraph Data Sources
        GH_Adapter -->|Octokit API| GitHub[(GitHub API)]
        Jira_Adapter -->|Axios REST| Jira[(Jira Cloud API)]
        Discord_Adapter -->|Discord.js| Discord[(Discord Gateway)]
    end

    subgraph Persistence
        Service -->|Sequelize ORM| DB[(MySQL Database: sentinel_health)]
    end

    subgraph Machine Learning & Explainer (sentinel-ml)
        API[main.py: FastAPI] -->|POST /api/infer| FE[feature_engineering.py]
        DB -->|Read Raw Metrics & Messages| FE
        FE -->|Vector Construction & Imputation| SVM_Model[models/svm_classifier.joblib]
        FE -->|Vector Construction & Imputation| RF_Model[models/rf_stability.joblib]
        FE -->|Vector Construction & Imputation| IF_Model[models/isolation_forest.joblib]
        
        SVM_Model -->|Predict Health| Label[HEALTHY / AT_RISK]
        RF_Model -->|Predict Risk Probability| StabScore[Stability Score]
        IF_Model -->|Detect Outliers| Anomaly[Anomaly Flag]
        
        FE -->|SHAP Values| Explainer[explainer.py: Explainer]
        RF_Model --> Explainer
        Explainer -->|Top 3 Risk Drivers| InfResults[(Inference Results in DB)]
    end
```

---

## 2. File-by-File Details

### Module A: `api-gateway` (Node.js & Express)
The API Gateway is responsible for triggering scans, pulling developer logs, and persisting them in MySQL.

1. **`server.js`**
   * **Purpose**: Application entry point.
   * **Mechanism**: Sets up Express, body parsers, and mounts `telemetryRouter` on `/api/telemetry`. On startup, it triggers database table synchronization (`syncDB()`), initializes the automatic background cron job (`initScheduler()`), and starts listening on the designated port.
2. **`config.js`**
   * **Purpose**: Centralized environment configuration.
   * **Mechanism**: Uses `dotenv` to load parameters from `.env`. Defines database credentials (MySQL host, port, database, credentials), GitHub access tokens, Jira REST base URL & credentials, Discord bot parameters, and application settings (port, scanning intervals).
3. **`scheduler.js`**
   * **Purpose**: Handles background telemetry scanning intervals.
   * **Mechanism**: Uses `node-cron` to schedule scans based on `scanIntervalMinutes` (configured in `.env`, defaults to 30 mins). On schedule, it queries all registered projects from the database and loops through them to run `runTelemetryScan(projectId)` sequentially. It also triggers an immediate scan on startup.
4. **`db/connection.js`**
   * **Purpose**: Database connection helper.
   * **Mechanism**: Establishes a database connection pool using the Sequelize ORM pointing to the MySQL instance. SQL logging is disabled for cleaner console output.
5. **`db/sync.js`**
   * **Purpose**: Synchronizes JavaScript Sequelize models with MySQL tables.
   * **Mechanism**: Authenticates the connection and runs `sequelize.sync({ alter: true })`. This modifies existing tables to fit the JS schemas without dropping tables or losing historical metrics.
6. **`db/schema.sql`**
   * **Purpose**: Declarative MySQL schema initialization.
   * **Mechanism**: Explicit DDL script creating the `sentinel_health` database and tables (`projects`, `telemetry_scans`, `github_metrics`, `jira_metrics`, `discord_metrics`, `discord_messages`) with appropriate data types, auto-increment keys, and foreign keys.
7. **`models/Project.js`**
   * **Purpose**: Represents the `projects` table.
   * **Fields**: `project_id`, `name`, `github_owner`, `github_repo`, `jira_project_key`, `discord_channel_id`, `created_at`.
8. **`models/TelemetryScan.js`**
   * **Purpose**: Tracks every scan instance.
   * **Fields**: `scan_id`, `project_id` (foreign key), `scanned_at`, `status` (`complete`, `partial`, `failed`).
9. **`models/GithubMetric.js`**
   * **Purpose**: Stores Github scan telemetry.
   * **Fields**: `id`, `scan_id` (foreign key), `commit_frequency`, `code_churn`, `pr_cycle_time_hours`, `top_contributor`, `contributor_count`, `collected_at`.
10. **`models/JiraMetric.js`**
    * **Purpose**: Stores Jira project management metrics.
    * **Fields**: `id`, `scan_id` (foreign key), `sprint_velocity_planned`, `sprint_velocity_completed`, `avg_task_aging_days`, `backlog_growth_rate`, `collected_at`.
11. **`models/DiscordMetric.js`**
    * **Purpose**: Stores Discord interaction metrics.
    * **Fields**: `id`, `scan_id` (foreign key), `messages_per_day`, `active_users`, `collected_at`.
12. **`models/DiscordMessage.js`**
    * **Purpose**: Stores raw text messages for sentiment analysis.
    * **Fields**: `id`, `scan_id` (foreign key), `message_id` (unique), `author_id`, `author_name`, `content` (text), `sent_at`.
13. **`adapters/githubAdapter.js`**
    * **Purpose**: GitHub integration layer.
    * **Mechanism**: Initializes an Octokit GitHub client. Queries commits from the last 30 days to calculate `commit_frequency` (commits per day) and contributor distributions. Fetches stats for each individual commit to compute overall `code_churn` (lines added + deleted). Queries recent closed pull requests to compute `pr_cycle_time_hours` (average hours from creation to merge).
14. **`adapters/jiraAdapter.js`**
    * **Purpose**: Jira project key tracker.
    * **Mechanism**: Leverages Axios to connect to Jira Cloud APIs. Performs JQL (Jira Query Language) searches on issues created/resolved in the last 30 days to estimate backlog growth and velocity. Measures creation-to-now timestamps of unresolved issues to calculate `avg_task_aging_days`.
15. **`adapters/discordAdapter.js`**
    * **Purpose**: Discord channel text reader.
    * **Mechanism**: Uses `discord.js` to log a bot client into the Guild. Fetches up to 500 messages (maximum) from the channel spanning the last 7 days. Computes `messages_per_day` and active users, formatting the raw texts and metadata for database persistence.
16. **`services/telemetryService.js`**
    * **Purpose**: Telemetry pipeline coordinator.
    * **Mechanism**: Creates a database entry in `telemetry_scans` with a default state of `partial`. Concurrently fires promises fetching metrics for GitHub, Jira, and Discord using the adapters. Once resolved via `Promise.allSettled`, it inserts all records. If all three sources succeed, the scan status updates to `complete`; if at least one succeeds, it stays `partial`; otherwise, it updates to `failed`.
17. **`routes/telemetryRouter.js`**
    * **Purpose**: REST HTTP router.
    * **Endpoints**:
      * `POST /collect`: Triggers manual telemetry scans.
      * `GET /:projectId/latest`: Obtains latest scan metrics.
      * `GET /:projectId/history`: Obtains history list over a default range of 30 days.
      * `GET /:projectId/messages?scan_id=X`: Obtains messages scanned under a specific scan.
18. **`test-adapters.js`**
    * **Purpose**: Command-line verification script.
    * **Mechanism**: Sequentially executes the GitHub, Jira, and Discord adapters using mock settings to verify API authorization and responses.

*Note: `routes/authRouter.js`, `routes/projectRouter.js`, `middleware/authMiddleware.js`, `middleware/errorMiddleware.js`, `middleware/rateLimiter.js`, and `services/normalisationService.js` are currently blank project templates.*

---

### Module B: `sentinel-ml` (Python & FastAPI)
The Machine Learning service is responsible for transforming raw metrics, running classifiers and explainer modules, and saving intelligence reports.

1. **`db.py`**
   * **Purpose**: SQLAlchemy connection engine.
   * **Mechanism**: Reads configuration parameters from `.env`. Sets up a MySQL connection pool using SQLAlchemy and PyMySQL (`pool_size=10`, `max_overflow=20`, `pool_timeout=30`, `pool_recycle=1800`) to guarantee thread safety.
2. **`seed_db.py`**
   * **Purpose**: Data generator for training datasets.
   * **Mechanism**: Constructs SQL tables if missing. Generates 60 historical scan records for `ProjectAlpha` in MySQL. Approximately 30% of scans are generated with anomalous or poor health indices (low commit activity, long PR cycles, single contributor silos, low completed velocity, negative Discord messages) to simulate an unbalanced, realistic learning environment.
3. **`feature_engineering.py`**
   * **Purpose**: Raw data retrieval, aggregation, and mathematical feature synthesis.
   * **Mechanism**:
     * Downloads NLTK's VADER sentiment analyzer dictionary.
     * Extracts database metrics and VADER compound polarity scores on Discord text messages.
     * Computes the `sprint_velocity_ratio` (`completed_velocity / planned_velocity`).
     * Applies mean-imputation to handle any missing values using historical project columns.
     * Computes logical flags:
       * `velocity_drop_flag`: `sprint_velocity_ratio < 0.6`
       * `burnout_flag`: `messages_per_day < 5.0` AND average `sentiment_score < -0.2`
       * `silo_flag`: `contributor_count == 1`
       * `aging_flag`: `avg_task_aging_days > 7`
4. **`labeller.py`**
   * **Purpose**: Label generator for supervised training.
   * **Mechanism**: Applies a deterministic ruleset to label historical data points (1 = `AT_RISK`, 0 = `HEALTHY`). It marks a scan as `AT_RISK` if:
     * `sprint_velocity_ratio < 0.6` OR
     * `avg_task_aging_days > 7` OR
     * `pr_cycle_time_hours > 48` OR
     * `sentiment_score < -0.2` OR
     * Normalized code churn (MinMaxScaler on `code_churn`) `> 0.85`.
5. **`train.py`**
   * **Purpose**: Model training script.
   * **Mechanism**:
     * Runs feature engineering and labelling.
     * Performs a stratified 80/20 train/test split.
     * Balances classes on the training set using **SMOTE** (Synthetic Minority Over-sampling Technique), dynamically tuning neighborhood counts if minority clusters are small.
     * Normalizes the numeric variables in training data to `[0,1]` using `MinMaxScaler` (and saves the scaler artifact).
     * Trains a Support Vector Machine Classifier (**SVC**) with an RBF kernel (for binary classification).
     * Trains a **Random Forest Classifier** (for regression probability / stability scoring).
     * Trains an unsupervised **Isolation Forest** on the complete dataset (for anomaly detection).
     * Serializes all components to disk (`models/*.joblib`) alongside an evaluation report (`models/evaluation_report.txt`).
6. **`explainer.py`**
   * **Purpose**: Explainability layer using SHAP.
   * **Mechanism**: Wraps a SHAP `TreeExplainer` around the Random Forest and a SHAP `KernelExplainer` around the SVM. Analyzes input features and sorts them based on their absolute SHAP values. Translates the top 3 risk factors into user-friendly diagnostic texts (e.g. `"burnout_flag": "Developer burnout pattern detected"`).
7. **`main.py`**
   * **Purpose**: FastAPI microservice endpoint.
   * **Endpoints**:
     * `POST /api/infer`: Evaluates project health for a given `scan_id`. It queries the DB for raw metrics, processes features, scales them, evaluates class predictions (SVM), calculates stability (RF), flags anomalies (IF), extracts SHAP drivers, saves the intelligence results directly into MySQL, and returns the compiled metrics as JSON.
     * `POST /api/train`: Asynchronously triggers `train.py` as a FastAPI background task.
     * `GET /api/health`: Provides uptime state, model load status, and MySQL connection checks.
     * `GET /api/infer/history/{project_id}`: Queries past inference records.
8. **`test_infer.py`**
   * **Purpose**: Command-line validation helper.
   * **Mechanism**: Runs the scaling and predictor steps on scan ID 1 to output diagnostic logs to the terminal.

---

## 3. Step-by-Step Execution Flows

### Flow 1: Telemetry Data Collection (API Gateway)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API Gateway (Server)
    participant Telemetry Service
    participant Adapters (GH, Jira, Discord)
    participant MySQL DB

    Client->>API Gateway (Server): HTTP POST /api/telemetry/collect (projectId)
    Note over API Gateway (Server): Alternatively triggered by scheduler.js cron job
    API Gateway (Server)->>Telemetry Service: runTelemetryScan(projectId)
    activate Telemetry Service
    Telemetry Service->>MySQL DB: Create TelemetryScan record (status: 'partial')
    Telemetry Service->>Adapters (GH, Jira, Discord): Concurrently call fetch() methods
    activate Adapters (GH, Jira, Discord)
    Adapters (GH, Jira, Discord)->>Adapters (GH, Jira, Discord): Fetch GitHub (commits/PRs), Jira (JQL metrics), Discord (channel messages)
    Adapters (GH, Jira, Discord)-->>Telemetry Service: Return resolved metrics & messages
    deactivate Adapters (GH, Jira, Discord)
    Telemetry Service->>MySQL DB: Write metrics and bulk create messages
    Telemetry Service->>MySQL DB: Update TelemetryScan (status: 'complete' or 'partial')
    Telemetry Service-->>API Gateway (Server): Return scan_id & status
    deactivate Telemetry Service
    API Gateway (Server)-->>Client: Response JSON (scan_id, status)
```

---

### Flow 2: Machine Learning Inference (Sentinel-ML)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant FastAPI (main.py)
    participant Feature Engineering
    participant Models (SVM, RF, IF)
    participant SHAP Explainer
    participant MySQL DB

    Client->>FastAPI (main.py): HTTP POST /api/infer (project_id, scan_id)
    FastAPI (main.py)->>Feature Engineering: get_raw_features(scan_id)
    activate Feature Engineering
    Feature Engineering->>MySQL DB: Query telemetry metrics & messages for scan
    MySQL DB-->>Feature Engineering: Return raw datasets
    Feature Engineering->>Feature Engineering: Compute VADER Sentiment, Sprint Velocity Ratio, Impute missing columns, Compute thresholds/flags
    Feature Engineering-->>FastAPI (main.py): Return engineered feature row
    deactivate Feature Engineering
    FastAPI (main.py)->>FastAPI (main.py): Scale float columns using MinMaxScaler (scaler.joblib)
    
    activate Models (SVM, RF, IF)
    FastAPI (main.py)->>Models (SVM, RF, IF): Pass scaled feature vector
    Models (SVM, RF, IF)->>Models (SVM, RF, IF): 1. SVM predicts binary class (HEALTHY / AT_RISK)<br/>2. RF predicts probability of AT_RISK -> Stability Score = (1 - prob) * 100<br/>3. IF checks if outlier (anomaly)
    Models (SVM, RF, IF)-->>FastAPI (main.py): Return predictions, probability, and anomaly state
    deactivate Models (SVM, RF, IF)

    FastAPI (main.py)->>SHAP Explainer: get_top_risk_drivers(scaled_vector)
    activate SHAP Explainer
    SHAP Explainer->>SHAP Explainer: Compute Shapley contribution values & extract top 3 absolute values
    SHAP Explainer->>SHAP Explainer: Map feature names to diagnostic warnings
    SHAP Explainer-->>FastAPI (main.py): Return array of top 3 drivers
    deactivate SHAP Explainer

    FastAPI (main.py)->>MySQL DB: INSERT INTO inference_results
    FastAPI (main.py)-->>Client: Return JSON response (Label, Stability Score, Anomaly Status, top_risk_drivers)
```

---

### Flow 3: Model Training (Offline / Background)

1. **Triggering**: A `POST /api/train` call to FastAPI adds the training task to Python’s ASGI event loops as a background task.
2. **Feature Generation**: The engine executes `get_raw_features()` to read **all** historical metrics and message entries from MySQL.
3. **Data Labeling**: `labeller.py` calculates normalized code churn and applies deterministic project health rules to split historical records into `HEALTHY` (class 0) or `AT_RISK` (class 1).
4. **Data Balancing**: The script partitions the data (80/20 train/test split) and applies **SMOTE** on the training features. This synthesizes minority class variations to ensure the SVM/RF models are not biased.
5. **Feature Scaling**: Fits a new `MinMaxScaler` on training features, transforming both the training and test matrices.
6. **Parallel Model Fitting**:
   * Trains **SVM Classifier** (`svm_classifier.joblib`) to handle project health boundaries.
   * Trains **Random Forest Scorer** (`rf_stability.joblib`) to estimate probabilities.
   * Trains **Isolation Forest** (`isolation_forest.joblib`) on the full unlabelled dataset to establish normal operating boundaries.
7. **Explainer Base Initialization**: Extracts a background reference set of 50 samples, saving it as `background_data.joblib` for use in SHAP.
8. **Performance Reporting**: Tests the newly trained models on the 20% test slice. It writes F1-scores, precision, recall, AUC-ROC metrics, and anomaly metrics to `models/evaluation_report.txt`.
9. **Hot Reloading**: The FastAPI server automatically reloads the newly dumped joblib files into memory, allowing immediately updated inference without service downtime.
