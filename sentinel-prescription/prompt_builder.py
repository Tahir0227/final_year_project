"""
prompt_builder.py — Constructs the LLM prompt for the Prescription Engine.

Accepts a row from `inference_results` and a joined telemetry row, then
returns a fully populated, PII-safe prompt string ready to be injected into
the ChatPromptTemplate as {prescription_prompt}.

Rules:
- All missing / NULL fields → substituted with "N/A" (never crashes)
- No raw developer usernames or PII — project_id only
- SHAP values rounded to 4 decimal places
- Stability score rounded to 1 decimal place
- sprint_velocity_ratio = completed / planned (divide-by-zero → 0.0)
"""

from __future__ import annotations
from typing import Any


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _safe(value: Any, fmt: str = "") -> str:
    """
    Return a safely-formatted string for any value.

    - None / empty string → "N/A"
    - Format codes (e.g. '.4f', '.1f') applied when value is numeric
    """
    if value is None or value == "":
        return "N/A"
    try:
        if fmt:
            return format(float(value), fmt)
        return str(value)
    except (TypeError, ValueError):
        return "N/A"


def _velocity_ratio(planned: Any, completed: Any) -> str:
    """Compute sprint_velocity_ratio safely; zero-division → 0.0000."""
    try:
        p = float(planned)
        c = float(completed)
        if p == 0:
            return "0.0000"
        return format(c / p, ".4f")
    except (TypeError, ValueError):
        return "N/A"


FEATURE_CLEAN_NAMES = {
    "commit_frequency":      "developer commit frequency",
    "code_churn":            "rate of code modifications (code churn)",
    "pr_cycle_time_hours":   "pull request review cycle times",
    "contributor_count":     "active contributor count",
    "sprint_velocity_ratio": "ratio of completed vs planned sprint story points",
    "avg_task_aging_days":   "average task overdue aging days",
    "backlog_growth_rate":   "Jira backlog growth rate",
    "messages_per_day":      "Discord message frequency",
    "active_users":          "active team members count on communication channels",
    "sentiment_score":       "team sentiment and morale score",
    "velocity_drop_flag":    "significant drop in sprint velocity",
    "burnout_flag":          "team burnout pattern detection",
    "silo_flag":             "knowledge silo risk (dependency on a single contributor)",
    "aging_flag":            "overdue tasks accumulation"
}

def _shap_driver_line(feature: Any, interpretation: Any, value: Any, index: int) -> str:
    """Format a single SHAP driver line."""
    raw_feat = str(feature).strip() if feature is not None else ""
    feat  = FEATURE_CLEAN_NAMES.get(raw_feat, _safe(feature))
    interp = _safe(interpretation)
    val   = _safe(value, ".4f")
    return f"{index}. {feat}: {interp} (impact: {val})"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_prompt(inference_row: dict, telemetry_row: dict) -> str:
    """
    Build the complete LLM prompt from an inference_results row and a
    joined telemetry row (telemetry_scans + github_metrics + jira_metrics
    + discord_metrics).

    Parameters
    ----------
    inference_row : dict
        A row from `inference_results`. Expected keys:
        project_id, scan_id, health_label, stability_score, anomaly_detected,
        shap_driver_1_feature, shap_driver_1_value, shap_driver_1_interpretation,
        shap_driver_2_feature, shap_driver_2_value, shap_driver_2_interpretation,
        shap_driver_3_feature, shap_driver_3_value, shap_driver_3_interpretation

    telemetry_row : dict
        A joined row. Expected keys:
        scanned_at, commit_frequency, code_churn, pr_cycle_time_hours,
        contributor_count, sprint_velocity_planned, sprint_velocity_completed,
        avg_task_aging_days, backlog_growth_rate, messages_per_day,
        active_users, sentiment_score

    Returns
    -------
    str
        The fully-formatted prompt string.
    """

    # ---- Inference fields ------------------------------------------------
    project_id      = _safe(inference_row.get("project_id"))
    scanned_at      = _safe(inference_row.get("scanned_at") or telemetry_row.get("scanned_at"))
    stability_score = _safe(inference_row.get("stability_score"), ".1f")
    anomaly         = _safe(inference_row.get("anomaly_detected"))

    shap1_line = _shap_driver_line(
        inference_row.get("shap_driver_1_feature"),
        inference_row.get("shap_driver_1_interpretation"),
        inference_row.get("shap_driver_1_value"),
        1,
    )
    shap2_line = _shap_driver_line(
        inference_row.get("shap_driver_2_feature"),
        inference_row.get("shap_driver_2_interpretation"),
        inference_row.get("shap_driver_2_value"),
        2,
    )
    shap3_line = _shap_driver_line(
        inference_row.get("shap_driver_3_feature"),
        inference_row.get("shap_driver_3_interpretation"),
        inference_row.get("shap_driver_3_value"),
        3,
    )

    # ---- Telemetry / GitHub fields ----------------------------------------
    commit_frequency   = _safe(telemetry_row.get("commit_frequency"), ".4f")
    code_churn         = _safe(telemetry_row.get("code_churn"), ".4f")
    pr_cycle_time      = _safe(telemetry_row.get("pr_cycle_time_hours"), ".2f")
    contributor_count  = _safe(telemetry_row.get("contributor_count"))

    # ---- Jira fields -------------------------------------------------------
    velocity_ratio     = _velocity_ratio(
        telemetry_row.get("sprint_velocity_planned"),
        telemetry_row.get("sprint_velocity_completed"),
    )
    avg_task_aging     = _safe(telemetry_row.get("avg_task_aging_days"), ".2f")
    backlog_growth     = _safe(telemetry_row.get("backlog_growth_rate"), ".4f")

    # ---- Discord / Sentiment fields ----------------------------------------
    messages_per_day   = _safe(telemetry_row.get("messages_per_day"), ".2f")
    active_users       = _safe(telemetry_row.get("active_users"))
    sentiment_score    = _safe(telemetry_row.get("sentiment_score"), ".4f")

    # ---- Assemble prompt ---------------------------------------------------
    health_label = str(inference_row.get("health_label", "HEALTHY")).upper()

    if health_label == "HEALTHY":
        prompt = f"""=== PROJECT HEALTH REPORT ===
Project ID: {project_id}
Scan Time: {scanned_at}
Health Status: HEALTHY
Stability Score: {stability_score}/100
Anomaly Detected: {anomaly}

=== RAW TELEMETRY SIGNALS ===
GitHub:
  - Commit frequency: {commit_frequency} commits/day
  - Code churn: {code_churn} (0-1 normalised, lower is better)
  - PR cycle time: {pr_cycle_time} hours average
  - Active contributors: {contributor_count}

Jira:
  - Sprint velocity ratio: {velocity_ratio} (completed/planned)
  - Average task aging: {avg_task_aging} days beyond deadline
  - Backlog growth rate: {backlog_growth}

Team Communication:
  - Messages per day: {messages_per_day}
  - Active team members: {active_users}
  - Team sentiment score: {sentiment_score} (-1 to +1, positive = stable/unstressed)

=== OUTPUT INSTRUCTIONS ===
Since the project health status is HEALTHY, do not generate actionable recovery steps.
Instead, respond ONLY with this exact JSON structure. No markdown. No explanation.

IMPORTANT: You must write the summary in simple, professional English. Do not use raw database column keys or variables like 'velocity_drop_flag' or 'sprint_velocity_ratio'. When mentioning metrics, always explicitly include a brief, parenthetical explanation of what they mean.
For example:
- 'sprint velocity ratio (the percentage of planned work that was successfully completed)'
- 'code churn (the frequency and volume of code changes, which indicates stability)'
- 'task aging (the average overdue days for open tasks)'
This makes the summary fully educational and understandable for a business user.

{{
  "root_cause_summary": "A 2-3 sentence positive, plain English summary of the project state, explaining why the telemetry metrics indicate a healthy, stable, and low-risk project.",
  "severity": "LOW",
  "action_steps": []
}}"""
    else:
        prompt = f"""=== PROJECT RISK REPORT ===
Project ID: {project_id}
Scan Time: {scanned_at}
Health Status: AT_RISK
Stability Score: {stability_score}/100 (lower = more unstable)
Anomaly Detected: {anomaly}

=== TOP 3 AI-IDENTIFIED RISK DRIVERS (SHAP Analysis) ===
{shap1_line}
{shap2_line}
{shap3_line}

=== RAW TELEMETRY SIGNALS ===
GitHub:
  - Commit frequency: {commit_frequency} commits/day
  - Code churn: {code_churn} (0-1 normalised, higher = more unstable)
  - PR cycle time: {pr_cycle_time} hours average
  - Active contributors: {contributor_count}

Jira:
  - Sprint velocity ratio: {velocity_ratio} (completed/planned)
  - Average task aging: {avg_task_aging} days beyond deadline
  - Backlog growth rate: {backlog_growth}

Team Communication:
  - Messages per day: {messages_per_day}
  - Active team members: {active_users}
  - Team sentiment score: {sentiment_score} (-1 to +1, negative = stressed)

=== OUTPUT INSTRUCTIONS ===
Respond ONLY with this exact JSON structure. No markdown. No explanation.

IMPORTANT: You must write the root cause summary and action steps in simple, professional English. Do not use raw database column keys or variables like 'velocity_drop_flag' or 'sprint_velocity_ratio'. When mentioning risk factors or metrics, always explicitly include a brief, parenthetical explanation of what they mean.
For example:
- 'sprint velocity drop (meaning the team completed significantly less story points in this sprint than originally planned, indicating blockers or scope creep)'
- 'code churn (the frequency and volume of code changes, indicating repeated rewrites or unstable specifications)'
- 'task aging (the average number of days tasks have remained overdue beyond their deadlines)'
- 'knowledge silo (meaning the project depends dangerously on a single contributor for most of the work)'
This makes the summary fully educational and understandable for a business user.

{{
  "root_cause_summary": "2-3 sentence plain English explanation referencing the SHAP drivers above.",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "action_steps": [
    "Step 1: specific actionable recovery step",
    "Step 2: ...",
    "Step 3: ...",
    "Step 4: ...",
    "Step 5: ..."
  ]
}}

=== SEVERITY RULES ===
CRITICAL: stability_score < 30 OR (anomaly_detected = true AND score < 50)
HIGH: stability_score 30-50
MEDIUM: stability_score 50-70
LOW: stability_score > 70 but AT_RISK due to a single driver

=== FEW-SHOT EXAMPLE ===
Signals: PR cycle time 72h, task aging 14 days, sentiment -0.6
Output:
{{
  "root_cause_summary": "The project has a severe PR review bottleneck combined with critical task deadline overruns. Team sentiment is deeply negative indicating burnout risk.",
  "severity": "CRITICAL",
  "action_steps": [
    "Step 1: Run an emergency PR review sprint to clear all open pull requests within 24 hours.",
    "Step 2: Re-estimate all Jira tasks older than 7 days in a team session within 48 hours.",
    "Step 3: Conduct private 1-on-1 check-ins with each developer to assess stress levels.",
    "Step 4: Reduce next sprint scope by 20% to allow team recovery.",
    "Step 5: Set up a daily 10-minute blocker-focused stand-up until stability score exceeds 60."
  ]
}}"""

    return prompt
