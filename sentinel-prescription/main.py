"""
main.py — FastAPI application for the Sentinel Prescription Engine (Module 3).

Runs on port 8001 (configurable via PRESCRIPTION_SERVICE_PORT env var).

Endpoints:
  POST /api/prescription/generate                   — Generate prescription for one AT_RISK inference
  POST /api/prescription/generate-all-pending       — Batch generate for all un-prescribed AT_RISK rows
  GET  /api/prescription/{project_id}/latest        — Most recent prescription for a project
  GET  /api/prescription/{project_id}/history       — Last N prescriptions (default: 10)
  GET  /api/prescription/health                     — Health/status check
"""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from db import check_mysql_connection, get_engine
from prescription_service import generate_prescription

load_dotenv(override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Sentinel Prescription Engine starting up…")
    # Verify DB connection on startup
    if check_mysql_connection():
        logger.info("MySQL connection: OK")
    else:
        logger.warning("MySQL connection: FAILED — check .env credentials")
    yield
    logger.info("Sentinel Prescription Engine shutting down.")


app = FastAPI(
    title="Sentinel Prescription Engine",
    description="Module 3 — Generative AI Prescription Engine for Sentinel Health AI",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    inference_id: int


class GeneratePendingResponse(BaseModel):
    total_pending: int
    generated: int
    failed: int
    results: list


# ---------------------------------------------------------------------------
# Helper: fetch last_prescription_at
# ---------------------------------------------------------------------------

def _last_prescription_at() -> Optional[str]:
    try:
        engine = get_engine()
        sql = text("SELECT MAX(generated_at) FROM prescriptions")
        with engine.connect() as conn:
            val = conn.execute(sql).scalar()
        if val:
            if isinstance(val, datetime):
                return val.strftime("%Y-%m-%dT%H:%M:%SZ")
            return str(val) + "Z"
        return None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Helper: query all pending AT_RISK inference rows without prescriptions
# ---------------------------------------------------------------------------

def _get_pending_inference_ids() -> List[int]:
    engine = get_engine()
    sql = text("""
        SELECT ir.id
        FROM   inference_results ir
        LEFT JOIN prescriptions  p  ON p.inference_id = ir.id
        WHERE  ir.health_label = 'AT_RISK'
          AND  p.id IS NULL
        ORDER BY ir.inferred_at ASC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()
    return [r[0] for r in rows]


# ---------------------------------------------------------------------------
# Helper: row dict from prescriptions table
# ---------------------------------------------------------------------------

def _format_prescription_row(row: dict) -> dict:
    """Convert a raw DB prescription row to the public API dict."""
    generated_at = row.get("generated_at")
    if isinstance(generated_at, datetime):
        generated_at = generated_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    elif generated_at is not None:
        generated_at = str(generated_at) + "Z"

    action_steps = [
        row.get("action_step_1"),
        row.get("action_step_2"),
        row.get("action_step_3"),
        row.get("action_step_4"),
        row.get("action_step_5"),
    ]
    action_steps = [s for s in action_steps if s is not None]

    shap_drivers = [
        d for d in [
            row.get("shap_driver_1"),
            row.get("shap_driver_2"),
            row.get("shap_driver_3"),
        ] if d is not None
    ]

    return {
        "prescription_id":   row.get("id"),
        "project_id":        row.get("project_id"),
        "scan_id":           row.get("scan_id"),
        "health_label":      row.get("health_label"),
        "stability_score":   row.get("stability_score"),
        "anomaly_detected":  bool(row.get("anomaly_detected")),
        "severity":          row.get("severity"),
        "root_cause_summary": row.get("root_cause_summary"),
        "action_steps":      action_steps,
        "shap_drivers":      shap_drivers,
        "llm_provider":      row.get("llm_provider"),
        "groq_key_used":     row.get("groq_key_used"),
        "generated_at":      generated_at,
    }


# ---------------------------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------------------------

# ---- POST /api/prescription/generate ----------------------------------------

@app.post("/api/prescription/generate", status_code=200)
async def generate(request: GenerateRequest):
    """
    Generate a prescription for a single AT_RISK inference result.

    Body: { "inference_id": <int> }

    Returns the prescription dict or a skipped message for HEALTHY projects.
    """
    try:
        result = await generate_prescription(request.inference_id)
        return result
    except ValueError as exc:
        # inference_id not found
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error in POST /generate for inference_id=%d", request.inference_id)
        raise HTTPException(status_code=503, detail=f"Prescription engine error: {exc}")


# ---- POST /api/prescription/generate-all-pending ----------------------------

@app.post("/api/prescription/generate-all-pending", status_code=200)
async def generate_all_pending():
    """
    Find all AT_RISK inference rows without an existing prescription
    and run generate_prescription() for each.

    Max concurrency: MAX_CONCURRENT_PRESCRIPTIONS (default 3).
    """
    max_concurrency = int(os.getenv("MAX_CONCURRENT_PRESCRIPTIONS", "3"))
    semaphore = asyncio.Semaphore(max_concurrency)
    pending_ids = _get_pending_inference_ids()
    total_pending = len(pending_ids)

    if total_pending == 0:
        return {
            "total_pending": 0,
            "generated": 0,
            "failed": 0,
            "results": [],
            "message": "No pending AT_RISK inference rows found.",
        }

    logger.info(
        "generate-all-pending: found %d pending rows. Max concurrency: %d",
        total_pending,
        max_concurrency,
    )

    results = []
    generated = 0
    failed = 0

    async def _run_one(inference_id: int):
        async with semaphore:
            try:
                result = await generate_prescription(inference_id)
                return {"inference_id": inference_id, "status": "ok", "result": result}
            except Exception as exc:
                logger.error(
                    "generate-all-pending: failed for inference_id=%d: %s",
                    inference_id, exc,
                )
                return {
                    "inference_id": inference_id,
                    "status": "failed",
                    "error": str(exc),
                }

    tasks = [_run_one(iid) for iid in pending_ids]
    task_results = await asyncio.gather(*tasks, return_exceptions=False)

    for r in task_results:
        results.append(r)
        if r.get("status") == "ok":
            generated += 1
        else:
            failed += 1

    return {
        "total_pending": total_pending,
        "generated": generated,
        "failed": failed,
        "results": results,
    }


# ---- GET /api/prescription/{project_id}/latest ------------------------------

@app.get("/api/prescription/{project_id}/latest", status_code=200)
async def get_latest(project_id: str):
    """Return the most recent prescription for the given project_id."""
    try:
        engine = get_engine()
        sql = text("""
            SELECT *
            FROM prescriptions
            WHERE project_id = :project_id
            ORDER BY generated_at DESC
            LIMIT 1
        """)
        with engine.connect() as conn:
            row = conn.execute(sql, {"project_id": project_id}).mappings().first()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"No prescriptions found for project_id='{project_id}'",
            )

        return _format_prescription_row(dict(row))

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in GET /latest for project_id=%s", project_id)
        raise HTTPException(status_code=503, detail=str(exc))


# ---- GET /api/prescription/{project_id}/history ----------------------------

@app.get("/api/prescription/{project_id}/history", status_code=200)
async def get_history(
    project_id: str,
    limit: int = Query(10, ge=1, le=100),
):
    """Return the last N prescriptions for the given project (newest first)."""
    try:
        engine = get_engine()
        sql = text("""
            SELECT *
            FROM prescriptions
            WHERE project_id = :project_id
            ORDER BY generated_at DESC
            LIMIT :limit
        """)
        with engine.connect() as conn:
            rows = conn.execute(sql, {"project_id": project_id, "limit": limit}).mappings().all()

        return [_format_prescription_row(dict(r)) for r in rows]

    except Exception as exc:
        logger.exception("Error in GET /history for project_id=%s", project_id)
        raise HTTPException(status_code=503, detail=str(exc))


# ---- GET /api/prescription/health -------------------------------------------

@app.get("/api/prescription/health", status_code=200)
async def health():
    """
    Status endpoint — verifies service, MySQL, and LLM configuration.
    """
    primary_status  = "configured" if os.getenv("GROQ_API_KEY_PRIMARY") else "MISSING"
    fallback_status = "configured" if os.getenv("GROQ_API_KEY_FALLBACK") else "MISSING"
    groq_model      = os.getenv("GROQ_MODEL", "llama3-70b-8192")

    mysql_ok = check_mysql_connection()

    return {
        "service":                    "running",
        "llm_framework":              "langchain-v1",
        "model":                      groq_model,
        "groq_primary_key_status":    primary_status,
        "groq_fallback_key_status":   fallback_status,
        "mysql_connected":            mysql_ok,
        "last_prescription_at":       _last_prescription_at(),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PRESCRIPTION_SERVICE_PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
