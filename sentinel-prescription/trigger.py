"""
trigger.py — Auto-trigger integration helper for Module 2.

Provides auto_trigger_prescription(), which should be called inside
Module 2's POST /api/infer endpoint as a FastAPI BackgroundTask
immediately after saving the inference result to MySQL.

=== WHERE TO ADD IN MODULE 2 (sentinel-ml/main.py) ===

1. At the top of sentinel-ml/main.py, add the import:

    from trigger import auto_trigger_prescription

2. Inside the POST /api/infer handler, AFTER saving to inference_results
   and BEFORE returning the JSON response, add:

    # ---- Auto-trigger prescription engine (Module 3) ----
    background_tasks.add_task(
        auto_trigger_prescription,
        inference_id=<the_new_inference_result_id>,
        health_label=health_label
    )
    # Make sure to add `background_tasks: BackgroundTasks` to the function
    # signature if it is not already there:
    #   async def infer(request: InferRequest, background_tasks: BackgroundTasks):

3. The trigger will only call the Prescription Engine if health_label == 'AT_RISK'.
   HEALTHY results are silently skipped — no network call is made.

Example in context (sentinel-ml/main.py):

    @app.post("/api/infer")
    async def infer(request: InferRequest, background_tasks: BackgroundTasks):
        ...
        # (existing inference logic)
        ...

        # AFTER inserting inference_results row and obtaining its id:
        background_tasks.add_task(
            auto_trigger_prescription,
            inference_id=new_inference_id,   # <-- integer row id
            health_label=health_label         # <-- "AT_RISK" or "HEALTHY"
        )

        return { ... }  # existing return
"""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

# Base URL of the Prescription Engine (Module 3)
_PRESCRIPTION_SERVICE_URL = (
    f"http://localhost:{os.getenv('PRESCRIPTION_SERVICE_PORT', '8001')}"
)


async def auto_trigger_prescription(inference_id: int, health_label: str) -> dict | None:
    """
    HTTP call to the Prescription Engine.

    Only acts when health_label == 'AT_RISK'.
    Designed to run as a FastAPI BackgroundTask or synchronously from Module 2.

    Parameters
    ----------
    inference_id : int
        The primary key of the newly created inference_results row.
    health_label : str
        "AT_RISK" or "HEALTHY" (case-insensitive).
    """
    url = f"{_PRESCRIPTION_SERVICE_URL}/api/prescription/generate"
    payload = {"inference_id": inference_id}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info(
                "auto_trigger_prescription: prescription generated for "
                "inference_id=%d. Status: %d",
                inference_id,
                response.status_code,
            )
            return response.json()
    except httpx.ConnectError:
        logger.warning(
            "auto_trigger_prescription: could not connect to Prescription Engine "
            "at %s. Is Module 3 running?", url
        )
    except httpx.TimeoutException:
        logger.warning(
            "auto_trigger_prescription: timeout waiting for Prescription Engine "
            "for inference_id=%d.", inference_id
        )
    except Exception as exc:
        logger.error(
            "auto_trigger_prescription: unexpected error for inference_id=%d: %s",
            inference_id,
            exc,
        )
    return None
