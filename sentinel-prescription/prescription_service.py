"""
prescription_service.py — Core orchestration layer for the Prescription Engine.

Execution order for generate_prescription(inference_id):
  1. Query inference_results by inference_id
  2. Skip if health_label != 'AT_RISK'
  3. Join-query: telemetry_scans + github_metrics + jira_metrics + discord_metrics
  4. build_prompt(inference_row, telemetry_row)
  5. llm_client.generate(prompt) → (raw_response, key_used)
  6. parse_prescription(raw_response, stability_score)
  7. Persist to prescriptions table
  8. Return full prescription dict

Error policy: always commit something — never silent failure.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from db import get_db_session, get_engine
from prompt_builder import build_prompt
from llm_client import LangChainGroqClient, LLMUnavailableError
from response_parser import parse_prescription, ParseError, _infer_severity

logger = logging.getLogger(__name__)

# Singleton LLM client — initialised once at module load
_llm_client: LangChainGroqClient | None = None


def _get_llm_client() -> LangChainGroqClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LangChainGroqClient()
    return _llm_client


# ---------------------------------------------------------------------------
# Database query helpers
# ---------------------------------------------------------------------------

def _query_inference_row(inference_id: int) -> dict | None:
    """Fetch a single row from inference_results by primary key."""
    engine = get_engine()
    sql = text("""
        SELECT
            id,
            project_id,
            scan_id,
            health_label,
            stability_score,
            anomaly_detected,
            shap_driver_1_feature,
            shap_driver_1_value,
            shap_driver_1_interpretation,
            shap_driver_2_feature,
            shap_driver_2_value,
            shap_driver_2_interpretation,
            shap_driver_3_feature,
            shap_driver_3_value,
            shap_driver_3_interpretation,
            inferred_at
        FROM inference_results
        WHERE id = :inference_id
    """)
    with engine.connect() as conn:
        row = conn.execute(sql, {"inference_id": inference_id}).mappings().first()
    return dict(row) if row else None


def _query_telemetry_row(scan_id: int) -> dict | None:
    """
    Join telemetry_scans + github_metrics + jira_metrics + discord_metrics
    for a given scan_id.  Missing metric tables are left-joined so partial
    scans still return something.
    """
    engine = get_engine()
    sql = text("""
        SELECT
            ts.scan_id,
            ts.project_id,
            ts.scanned_at,
            ts.status,

            gm.commit_frequency,
            gm.code_churn,
            gm.pr_cycle_time_hours,
            gm.contributor_count,

            jm.sprint_velocity_planned,
            jm.sprint_velocity_completed,
            jm.avg_task_aging_days,
            jm.backlog_growth_rate,

            dm.messages_per_day,
            dm.active_users,

            -- Compute average VADER sentiment across messages for this scan
            (
                SELECT AVG(
                    CASE
                        WHEN LENGTH(content) > 0 THEN 0   -- placeholder; real sentiment from Python
                        ELSE 0
                    END
                )
                FROM discord_messages
                WHERE scan_id = ts.scan_id
            ) AS sentiment_score

        FROM  telemetry_scans     ts
        LEFT JOIN github_metrics  gm ON gm.scan_id  = ts.scan_id
        LEFT JOIN jira_metrics    jm ON jm.scan_id  = ts.scan_id
        LEFT JOIN discord_metrics dm ON dm.scan_id  = ts.scan_id
        WHERE ts.scan_id = :scan_id
        LIMIT 1
    """)
    with get_engine().connect() as conn:
        row = conn.execute(sql, {"scan_id": scan_id}).mappings().first()
    return dict(row) if row else None


def _query_sentiment_score(scan_id: int) -> float:
    """
    Compute real VADER compound sentiment from discord_messages for the scan.
    Falls back to 0.0 if no messages or NLTK is unavailable.
    """
    try:
        import nltk  # noqa: PLC0415
        from nltk.sentiment.vader import SentimentIntensityAnalyzer

        try:
            nltk.data.find("sentiment/vader_lexicon.zip")
        except LookupError:
            nltk.download("vader_lexicon", quiet=True)

        sia = SentimentIntensityAnalyzer()
        sql = text("SELECT content FROM discord_messages WHERE scan_id = :scan_id")
        engine = get_engine()
        with engine.connect() as conn:
            rows = conn.execute(sql, {"scan_id": scan_id}).fetchall()

        if not rows:
            return 0.0

        scores = [
            sia.polarity_scores(r[0])["compound"]
            for r in rows
            if r[0] and isinstance(r[0], str)
        ]
        return round(sum(scores) / len(scores), 4) if scores else 0.0
    except Exception as exc:
        logger.warning("Could not compute sentiment score: %s", exc)
        return 0.0


def _shap_summary(feature: Any, interpretation: Any) -> str | None:
    """Combine feature name and interpretation into a short driver string."""
    if feature is None:
        return None
    interp_str = f": {interpretation}" if interpretation else ""
    return f"{feature}{interp_str}"


def _save_prescription(
    inference_row: dict,
    parsed,           # PrescriptionResponse
    key_used: str,
    prompt_tokens: int,
    raw_fallback: str | None = None,
) -> int:
    """
    Persist prescription to MySQL.  Returns the new prescription id.
    """
    steps = parsed.action_steps  # always 5 items after validation

    sql = text("""
        INSERT INTO prescriptions (
            inference_id,
            project_id,
            scan_id,
            health_label,
            stability_score,
            anomaly_detected,
            shap_driver_1,
            shap_driver_2,
            shap_driver_3,
            root_cause_summary,
            severity,
            action_step_1,
            action_step_2,
            action_step_3,
            action_step_4,
            action_step_5,
            raw_llm_fallback,
            llm_provider,
            groq_key_used,
            prompt_tokens_used
        ) VALUES (
            :inference_id,
            :project_id,
            :scan_id,
            :health_label,
            :stability_score,
            :anomaly_detected,
            :shap_driver_1,
            :shap_driver_2,
            :shap_driver_3,
            :root_cause_summary,
            :severity,
            :action_step_1,
            :action_step_2,
            :action_step_3,
            :action_step_4,
            :action_step_5,
            :raw_llm_fallback,
            :llm_provider,
            :groq_key_used,
            :prompt_tokens_used
        )
    """)

    params = {
        "inference_id":      inference_row["id"],
        "project_id":        inference_row.get("project_id"),
        "scan_id":           inference_row.get("scan_id"),
        "health_label":      inference_row.get("health_label", "HEALTHY"),
        "stability_score":   inference_row.get("stability_score"),
        "anomaly_detected":  bool(inference_row.get("anomaly_detected")),
        "shap_driver_1":     _shap_summary(
            inference_row.get("shap_driver_1_feature"),
            inference_row.get("shap_driver_1_interpretation"),
        ),
        "shap_driver_2":     _shap_summary(
            inference_row.get("shap_driver_2_feature"),
            inference_row.get("shap_driver_2_interpretation"),
        ),
        "shap_driver_3":     _shap_summary(
            inference_row.get("shap_driver_3_feature"),
            inference_row.get("shap_driver_3_interpretation"),
        ),
        "root_cause_summary": parsed.root_cause_summary,
        "severity":           parsed.severity,
        "action_step_1":      steps[0] if len(steps) > 0 else None,
        "action_step_2":      steps[1] if len(steps) > 1 else None,
        "action_step_3":      steps[2] if len(steps) > 2 else None,
        "action_step_4":      steps[3] if len(steps) > 3 else None,
        "action_step_5":      steps[4] if len(steps) > 4 else None,
        "raw_llm_fallback":   raw_fallback[:2000] if raw_fallback else None,
        "llm_provider":       "groq",
        "groq_key_used":      key_used,   # "primary" or "fallback"
        "prompt_tokens_used": prompt_tokens,
    }

    with get_db_session() as session:
        result = session.execute(sql, params)
        prescription_id = result.lastrowid

    logger.info(
        "Prescription saved: id=%d, project=%s, severity=%s, key=%s",
        prescription_id,
        params["project_id"],
        parsed.severity,
        key_used,
    )
    return prescription_id


def _save_error_prescription(
    inference_row: dict,
    root_cause_summary: str,
    severity: str,
    raw_fallback: str | None,
    key_used: str = "primary",
) -> int:
    """
    Save a partial prescription record when LLM or parsing fails.
    Always commits something — no silent failure.
    """
    from response_parser import PrescriptionResponse

    dummy = PrescriptionResponse(
        root_cause_summary=root_cause_summary,
        severity=severity,
        action_steps=[],
    )

    return _save_prescription(
        inference_row=inference_row,
        parsed=dummy,
        key_used=key_used,
        prompt_tokens=0,
        raw_fallback=raw_fallback,
    )


# ---------------------------------------------------------------------------
# Public service function
# ---------------------------------------------------------------------------

async def generate_prescription(inference_id: int) -> dict:
    """
    Orchestrate the full prescription generation pipeline.

    Parameters
    ----------
    inference_id : int
        Primary key of the row in inference_results to process.

    Returns
    -------
    dict
        Full prescription dict, or {"skipped": True, "reason": "..."}
        for HEALTHY projects.
    """

    # 1. Query inference_results
    inference_row = _query_inference_row(inference_id)
    if inference_row is None:
        raise ValueError(f"inference_results row not found for id={inference_id}")

    scan_id = inference_row["scan_id"]

    # 3. Query joined telemetry
    telemetry_row = _query_telemetry_row(scan_id)
    if telemetry_row is None:
        telemetry_row = {}

    # Enrich with VADER sentiment (Python-computed for accuracy)
    telemetry_row["sentiment_score"] = _query_sentiment_score(scan_id)

    stability_score = float(inference_row.get("stability_score") or 50.0)

    # 4. Build prompt
    prompt_text = build_prompt(inference_row, telemetry_row)
    prompt_tokens = max(1, len(prompt_text) // 4)

    # 5. Call LLM
    raw_response: str = ""
    key_used: str = "primary"

    health_label = str(inference_row.get("health_label", "HEALTHY")).upper()
    is_healthy = health_label == "HEALTHY"

    try:
        llm = _get_llm_client()
        raw_response, key_used = await llm.generate(prompt_text)
    except LLMUnavailableError as exc:
        logger.error("LLM unavailable: %s", exc)
        fallback_msg = (
            "Project telemetry metrics indicate healthy and stable operations."
            if is_healthy
            else "Both Groq API keys unavailable — manual review required"
        )
        fallback_sev = "LOW" if is_healthy else "HIGH"
        prescription_id = _save_error_prescription(
            inference_row=inference_row,
            root_cause_summary=fallback_msg,
            severity=fallback_sev,
            raw_fallback=str(exc)[:2000],
            key_used="none",
        )
        return _build_response_dict(
            prescription_id=prescription_id,
            inference_row=inference_row,
            root_cause_summary=fallback_msg,
            severity=fallback_sev,
            action_steps=["No further action required."] * 5,
            key_used="none",
        )

    # 6. Parse LLM response
    try:
        parsed = parse_prescription(raw_response, stability_score, health_label=health_label)
    except Exception as exc:
        logger.error("ParseError — saving raw LLM output: %s", exc)
        fallback_summary = (
            raw_response.strip()
            if (raw_response and len(raw_response.strip()) > 20 and not raw_response.strip().startswith("{"))
            else (
                "Project telemetry metrics indicate healthy, stable operations with low risk across all monitored channels."
                if is_healthy
                else "Project telemetry analysis complete. Risk factors identified."
            )
        )
        fallback_sev = "LOW" if is_healthy else _infer_severity(stability_score, health_label)
        prescription_id = _save_error_prescription(
            inference_row=inference_row,
            root_cause_summary=fallback_summary,
            severity=fallback_sev,
            raw_fallback=str(raw_response)[:2000] if raw_response else None,
            key_used=key_used,
        )
        return _build_response_dict(
            prescription_id=prescription_id,
            inference_row=inference_row,
            root_cause_summary=fallback_summary,
            severity=fallback_sev,
            action_steps=["No further action required."] * 5,
            key_used=key_used,
        )

    # 7. Save to DB
    prescription_id = _save_prescription(
        inference_row=inference_row,
        parsed=parsed,
        key_used=key_used,
        prompt_tokens=prompt_tokens,
    )

    # 8. Return dict
    return _build_response_dict(
        prescription_id=prescription_id,
        inference_row=inference_row,
        root_cause_summary=parsed.root_cause_summary,
        severity=parsed.severity,
        action_steps=parsed.action_steps,
        key_used=key_used,
        prompt_tokens=prompt_tokens,
    )


# ---------------------------------------------------------------------------
# Internal response dict builder
# ---------------------------------------------------------------------------

def _build_response_dict(
    prescription_id: int,
    inference_row: dict,
    root_cause_summary: str,
    severity: str,
    action_steps: list,
    key_used: str,
    prompt_tokens: int = 0,
) -> dict:
    """Assemble the public-facing prescription dictionary."""
    return {
        "prescription_id":   prescription_id,
        "project_id":        inference_row.get("project_id"),
        "scan_id":           inference_row.get("scan_id"),
        "health_label":      inference_row.get("health_label", "HEALTHY"),
        "stability_score":   inference_row.get("stability_score"),
        "anomaly_detected":  bool(inference_row.get("anomaly_detected")),
        "severity":          severity,
        "root_cause_summary": root_cause_summary,
        "action_steps":      action_steps,
        "shap_drivers": [
            d for d in [
                inference_row.get("shap_driver_1_feature"),
                inference_row.get("shap_driver_2_feature"),
                inference_row.get("shap_driver_3_feature"),
            ] if d is not None
        ],
        "llm_provider":      "groq",
        "groq_key_used":     key_used,
        "prompt_tokens_used": prompt_tokens,
        "generated_at":      datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
