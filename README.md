# Sentinel-Health AI — The Digital Stethoscope for Software Projects

> **AI-Powered Software Project Failure Detection, Risk Explainability, and Automated Prescriptions**  
> Final Year Engineering Capstone Project | B.Tech CSE (AI & ML)

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react)](sentinel-dashboard/)
[![Node.js](https://img.shields.io/badge/Gateway-Node.js%20%2B%20Express-339933?logo=node.js)](api-gateway/)
[![FastAPI](https://img.shields.io/badge/ML%20Engine-Python%203.13%20%2B%20FastAPI-009688?logo=fastapi)](sentinel-ml/)
[![Groq](https://img.shields.io/badge/AI%20Prescription-Groq%20LLM-F55036)](sentinel-prescription/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%203.4-38B2AC?logo=tailwindcss)](sentinel-dashboard/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?logo=mysql)](api-gateway/db/)

---

## 📌 Executive Summary

Modern software development teams suffer from fragmented observability: commit velocity lives in GitHub, sprint tracking in Jira, and team communication in Discord. Project failures, missed deadlines, and sprint collapses usually happen quietly before managers notice.

**Sentinel-Health AI** functions as a **"Digital Stethoscope"** that continuously monitors project vital signs:
1. **Module 1 (API Gateway & Ingestion):** Collects telemetry from GitHub (commits, code churn, PR cycle time), Jira (sprint velocity, task aging, backlog growth), and Discord (message volume, sentiment).
2. **Module 2 (ML Inference & Explainability):** Runs an ensemble ML model (Ensemble Voting Classifier + SVM + Random Forest + Isolation Forest + Gradient Boosting) to classify project health (`HEALTHY` vs `AT_RISK`), predict a 0–100 stability score, detect anomalies, and generate SHAP explainability risk drivers.
3. **Module 3 (AI Prescription Engine):** Uses high-speed LLM inference via Groq to analyze root causes and generate concrete, 5-step actionable recovery plans.
4. **Module 4 (Executive Dashboard):** An interactive React 18 dashboard featuring real-time health gauges, risk heatmaps, SHAP feature attribution charts, notifications, multi-project management, an interactive setup guide, and user glossary.

---

## 🏛️ Microservice Architecture

```
                                  ┌───────────────────────────────┐
                                  │      React 18 Dashboard       │
                                  │     (Port 5173 / Vite)        │
                                  └──────────────┬────────────────┘
                                                 │ JWT Auth / REST
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │     Node.js API Gateway       │
                                  │    (Port 3000 / Express)      │
                                  └──────┬───────────────┬────────┘
                                         │               │
                    ┌────────────────────┘               └────────────────────┐
                    ▼                                                         ▼
    ┌───────────────────────────────┐                         ┌───────────────────────────────┐
    │     Sentinel ML Service       │                         │ Sentinel Prescription Engine  │
    │     (Port 8000 / FastAPI)     │                         │     (Port 8001 / FastAPI)     │
    ├───────────────────────────────┤                         ├───────────────────────────────┤
    │ • Ensemble Voting Classifier  │                         │ • Groq LLM (gpt-oss-20b)      │
    │ • Random Forest & SVM         │                         │ • Dual-Key Automatic Failover │
    │ • Isolation Forest Anomaly    │──────── Auto-Trigger ──▶│ • Pydantic v2 Output Parser   │
    │ • SHAP Risk Attribution       │                         │ • 5-Step Prescriptive Actions │
    └───────────────┬───────────────┘                         └───────────────┬───────────────┘
                    │                                                         │
                    └────────────────────────┬────────────────────────────────┘
                                             ▼
                              ┌───────────────────────────────┐
                              │        MySQL Database         │
                              │    (sentinel_health DB)       │
                              └───────────────────────────────┘
```

---

## ⚙️ Prerequisites

Before you start, make sure you have the following installed on your machine:

- **Node.js** `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Python** `3.10` to `3.13` ([Download Python](https://www.python.org/))
- **MySQL Server** `8.0` or higher ([Download MySQL](https://dev.mysql.com/downloads/installer/))
- **Git** ([Download Git](https://git-scm.com/))
- *(Optional)* Free Groq API Key ([Get Groq Key](https://console.groq.com/keys))

---

## 🚀 Complete Step-by-Step Setup Guide

Follow these steps to run the complete application on a fresh machine in less than 5 minutes:

### Step 1: Clone the Repository
```bash
git clone https://github.com/Tahir0227/final_year_project.git
cd final_year_project
```

---

### Step 2: Install All Dependencies (Single Command)
Run the automated installation script from the project root:
```bash
# Installs Node dependencies for root, API gateway, and Dashboard
npm run install:all

# Installs Python dependencies for ML Engine and Prescription Engine
npm run install:python
```

*(Alternatively, if installing manually:)*
```bash
npm install
cd api-gateway && npm install
cd ../sentinel-dashboard && npm install
cd ../sentinel-ml && pip install -r requirements.txt
cd ../sentinel-prescription && pip install -r requirements.txt
cd ..
```

---

### Step 3: Setup Environment Files (`.env`)
Create `.env` files in each sub-service folder:

#### 📁 `api-gateway/.env`
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sentinel_health
DB_USER=root
DB_PASSWORD=your_mysql_password

PORT=3000
SCAN_INTERVAL_MINUTES=30
JWT_SECRET=super_secret_jwt_key_sentinel_2026_xyz
JWT_EXPIRES_IN=30d
ENCRYPTION_KEY=a1bafe42bc392fd51522d5b8e736ac8ed93c58d8bf677240b6bf04307377f75d

ML_INFERENCE_URL=http://localhost:8000
PRESCRIPTION_SERVICE_URL=http://localhost:8001
FRONTEND_URL=http://localhost:5173
```

#### 📁 `sentinel-ml/.env`
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sentinel_health
DB_USER=root
DB_PASSWORD=your_mysql_password
ML_SERVICE_PORT=8000
```

#### 📁 `sentinel-prescription/.env`
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sentinel_health
DB_USER=root
DB_PASSWORD=your_mysql_password

# Get free Groq API key from https://console.groq.com
GROQ_API_KEY_PRIMARY=gsk_your_primary_groq_api_key_here
GROQ_API_KEY_FALLBACK=gsk_your_fallback_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

PRESCRIPTION_SERVICE_PORT=8001
MAX_CONCURRENT_PRESCRIPTIONS=3
```

#### 📁 `sentinel-dashboard/.env`
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

### Step 4: Create Complete Database (Single Command)

Ensure your MySQL Server service is running. Then run the automated database setup command from the project root:

```bash
npm run setup:db
```

**What this command does automatically:**
1. Connects to your MySQL server.
2. Creates the `sentinel_health` database if it doesn't already exist.
3. Automatically creates all 13 tables, foreign keys, and indexes (`users`, `projects`, `telemetry_scans`, `github_metrics`, `jira_metrics`, `discord_metrics`, `discord_messages`, `inference_results`, `shap_values`, `prescriptions`, `notifications`, `scan_schedules`, `alerts`).

*(Alternative Manual Option)*: If you prefer using MySQL CLI or MySQL Workbench, you can run the provided master SQL schema directly:
```bash
mysql -u root -p < database_schema.sql
```

---

### Step 5: Start the Application (Single Command)

From the project root directory, run:
```bash
npm start
```

This single command launches all 4 services concurrently in colored terminal outputs:
- 🟢 **API Gateway:** `http://localhost:3000`
- 🟢 **ML Inference Engine:** `http://localhost:8000`
- 🟣 **AI Prescription Engine:** `http://localhost:8001`
- 🔵 **React Dashboard UI:** `http://localhost:5173`

---

## 🖥️ Using the Application

1. Open your browser and navigate to **`http://localhost:5173`**.
2. **Register / Login:** Create an account on the registration page and log in.
3. **Add a Project:** Click **"Add Project"** and follow the setup wizard:
   - Provide your project name, target completion deadline, and description.
   - Enter your GitHub repository details and Personal Access Token (PAT).
   - *(Optional)* Enter Jira Cloud credentials (Base URL, email, API token, Project Key).
   - *(Optional)* Enter Discord Bot token and Channel ID.
4. **Run Full Analysis Pipeline:**
   - On the Project Details page, click **"Execute Full Analysis Pipeline"**.
   - The system ingests telemetry → computes 10 engineered features → runs the ML Ensemble + SHAP → generates AI prescriptions.
5. **Explore Project Diagnostics:**
   - **Health Overview:** Animated stability gauge (0–100), health label (`HEALTHY` / `AT_RISK`), and 3-pillar risk heatmap.
   - **Telemetry:** Ingested commit velocity, PR cycle times, code churn, sprint velocity, task aging, and Discord sentiment.
   - **Alerts & SHAP Drivers:** Quantified root-cause risk breakdown explaining why the stability score dropped.
   - **AI Prescriptions:** LLM-generated root cause summary with 5 prioritized, actionable recovery steps.
   - **User Guide:** Integrated Glossary explaining all metrics + Setup guide with instructions on generating API keys.

---

## 📂 Repository Structure

```
final_year_project/
├── .gitignore                      # Multi-stack ignore rules (Node, Vite, Python)
├── package.json                    # Root launcher ("npm start" starts all 4 services)
├── database_schema.sql             # Master SQL database schema
├── README.md                       # Master project documentation
├── flow_readme.md                  # Comprehensive data flow & pipeline specs
│
├── api-gateway/                    # [Module 1 & 4] Node.js / Express API Gateway
│   ├── .env                        # Gateway config (DB, Auth, Encryption, Ports)
│   ├── .env.example                # Environment configuration template
│   ├── config.js                   # Central config loader
│   ├── server.js                   # Gateway entry point & route registration
│   ├── adapters/                   # Integration data adapters
│   │   ├── discordAdapter.js       # Discord REST / Bot adapter
│   │   ├── githubAdapter.js        # GitHub Octokit / REST adapter
│   │   └── jiraAdapter.js          # Jira Cloud REST v3 adapter
│   ├── db/                         # Database connection & Sequelize sync
│   │   ├── connection.js           # MySQL connection pool
│   │   ├── init_database.js        # Automated one-command DB setup script
│   │   ├── schema.sql              # Telemetry table schemas
│   │   └── sync.js                 # Automated ORM synchronization
│   ├── middleware/                 # Middleware
│   │   └── authMiddleware.js       # JWT validation & user attachment
│   ├── models/                     # Sequelize data models
│   │   ├── DiscordMessage.js
│   │   ├── DiscordMetric.js
│   │   ├── GithubMetric.js
│   │   ├── JiraMetric.js
│   │   ├── Notification.js
│   │   ├── Project.js
│   │   ├── ScanSchedule.js
│   │   ├── TelemetryScan.js
│   │   └── User.js
│   ├── routes/                     # API routers
│   │   ├── authRouter.js           # Register, login, profile management
│   │   ├── dashboardRouter.js      # Aggregated metrics & executive summary
│   │   ├── projectRouter.js        # Project CRUD, rescan, health history
│   │   └── telemetryRouter.js      # Telemetry triggering & retrieval
│   └── services/                   # Business logic
│       ├── autoScanScheduler.js    # Hourly cron for automated full pipelines
│       ├── credentialValidator.js  # Live external credential testing
│       ├── encryptionService.js    # AES-256-CBC token encryption/decryption
│       ├── pipelineOrchestrator.js # End-to-end (Telemetry → ML → Presc) runner
│       └── telemetryService.js     # Multi-source ingestion coordinator
│
├── sentinel-ml/                    # [Module 2] Machine Learning Inference & SHAP
│   ├── .env                        # ML service configuration
│   ├── requirements.txt            # Python dependencies
│   ├── main.py                     # FastAPI application & /api/infer endpoint
│   ├── db.py                       # SQLAlchemy database engine
│   ├── feature_engineering.py     # 10-metric telemetry feature extractor
│   ├── explainer_improved.py       # SHAP TreeExplainer & feature attribution
│   ├── train_improved.py           # Training pipeline (Ensemble, SVM, RF, IsoForest, GB)
│   ├── evaluate_models.py          # Model evaluation & benchmark reports
│   ├── create_dataset.py           # Synthetic telemetry data generator
│   ├── labeller.py                 # Ground-truth heuristic labeller
│   ├── data/                       # Datasets
│   │   ├── anomaly_data.csv
│   │   ├── dataset_report.txt
│   │   ├── test_data.csv
│   │   └── training_data.csv
│   └── models/                     # Trained models & benchmark plots
│       ├── background_data.joblib
│       ├── ensemble_classifier.joblib
│       ├── feature_columns.joblib
│       ├── gradient_boosting.joblib
│       ├── isolation_forest.joblib
│       ├── rf_stability.joblib
│       ├── scaler.joblib
│       ├── svm_classifier.joblib
│       └── plots/                  # Visual evaluation artifacts
│
├── sentinel-prescription/          # [Module 3] GenAI Prescription Engine
│   ├── .env                        # Prescription config & Groq API keys
│   ├── requirements.txt            # Python dependencies
│   ├── main.py                     # FastAPI application & /api/prescribe endpoint
│   ├── db.py                       # Database connection
│   ├── llm_client.py               # Groq LLM client with automatic failover
│   ├── prescription_service.py     # Prescription generation pipeline
│   ├── prompt_builder.py           # Context-aware Few-Shot prompt generator
│   ├── response_parser.py          # Pydantic v2 structured JSON parser
│   └── trigger.py                  # Module 2 -> Module 3 auto-trigger client
│
└── sentinel-dashboard/             # [Frontend] React 18 + TailwindCSS Dashboard UI
    ├── .env                        # Vite configuration (VITE_API_BASE_URL)
    ├── package.json                # Dependencies & scripts
    ├── index.html                  # HTML entry point
    ├── vite.config.js              # Vite configuration
    ├── tailwind.config.js          # Tailwind styling tokens & design system
    ├── public/                     # Static assets (Favicons, Setup Guide PDF)
    └── src/
        ├── App.jsx                 # Routing layout & application structure
        ├── main.jsx                # Application root mounting
        ├── index.css               # Design system & global styles
        ├── context/                # React Contexts (AuthContext, NotificationContext)
        ├── services/               # API clients (api.js, auth, dashboard, project)
        ├── utils/                  # Formatters, token masking, deadline & health helpers
        ├── pages/                  # Views (Dashboard, Projects, Detail, Guide, Profile, Auth)
        └── components/             # Reusable UI components
            ├── alerts/             # Alert cards, feed, SHAP risk driver breakdown
            ├── common/             # Badges, spinners, modals, empty states
            ├── dashboard/          # Summary cards, health card, recent alerts
            ├── health/             # Health gauge, stability chart, heatmap, telemetry
            ├── layout/             # Navbar, Sidebar, ProtectedRoute
            ├── prescription/       # Root cause summaries, action step cards
            └── projects/           # Add project wizard, credential fields, settings
```

---

## 🔬 Core ML Features & Telemetry

The system extracts 10 real-time telemetry metrics:

| Metric | Source | Description | Ideal Range |
|---|---|---|---|
| `commit_frequency` | GitHub | Commits per day over the last 14 days | 1.0 – 5.0 / day |
| `code_churn` | GitHub | Absolute churn ratio (lines added + deleted / total) | < 0.35 |
| `pr_cycle_time_hours`| GitHub | Time taken from PR creation to merge | < 48 hours |
| `contributor_count` | GitHub | Active authors in the last sprint | >= 2 |
| `sprint_velocity_ratio`| Jira | Completed story points vs planned story points | 0.85 – 1.15 |
| `avg_task_aging_days`| Jira | Average time Jira tasks stay in 'In Progress' | < 7 days |
| `backlog_growth_rate`| Jira | Rate of new tickets created vs closed | < 1.2x |
| `messages_per_day` | Discord | Team daily message volume | > 5 msgs / day |
| `active_users` | Discord | Unique active participants in team channel | >= 2 users |
| `sentiment_score` | Discord | VADER / rule-based sentiment compound score | > 0.05 |

---

## 🛠️ Troubleshooting & FAQ

<details>
<summary><b>1. "Database Setup Error: Access denied for user 'root'@'localhost'"</b></summary>
Make sure your MySQL server is running and check that <code>DB_PASSWORD</code> in <code>api-gateway/.env</code> matches your local MySQL root password.
</details>

<details>
<summary><b>2. "Port 3000 / 8000 / 8001 / 5173 already in use"</b></summary>
Another process is running on one of the ports. Terminate existing Node/Python processes or modify the port numbers in your <code>.env</code> files.
</details>

<details>
<summary><b>3. "Groq API rate limit or invalid API key"</b></summary>
Sentinel-Health AI includes dual-key automatic failover. Ensure you provide a valid primary Groq key in <code>sentinel-prescription/.env</code>. You can obtain free keys at <a href="https://console.groq.com/keys">console.groq.com</a>.
</details>

---

## 👨‍💻 Author & Acknowledgements

Developed as a Final Year Capstone Project by **Tahir** (B.Tech CSE - AI & ML).  
Special thanks to the open-source community across React, Node.js, FastAPI, Scikit-learn, and SHAP.
