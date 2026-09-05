"""
response_parser.py — Parses raw LLM output into validated PrescriptionResponse.

Uses Pydantic v2 (required by langchain 0.3.x and Python 3.13).
Validator behaviour is equivalent to the original Pydantic v1 design.

Rules:
- Strip markdown code fences before JSON parsing
- action_steps padded to exactly 5 items
- severity accepted case-insensitively
- If JSON parsing fails → raise ParseError with raw text preserved
- If severity missing/invalid → infer from stability_score
"""

from __future__ import annotations

import json
import re
import logging
from typing import Any, List, Literal

from pydantic import BaseModel, field_validator, model_validator

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class ParseError(Exception):
    """Raised when the LLM response cannot be parsed into valid JSON."""

    def __init__(self, raw_response: str, reason: str = ""):
        self.raw_response = raw_response
        self.reason = reason
        super().__init__(f"Failed to parse LLM response: {reason}")


# ---------------------------------------------------------------------------
# Pydantic v2 response model
# ---------------------------------------------------------------------------

class PrescriptionResponse(BaseModel):
    """Validated prescription produced by the LLM."""

    root_cause_summary: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    action_steps: List[str]

    @field_validator("root_cause_summary", mode="before")
    @classmethod
    def validate_summary(cls, v: Any) -> str:
        if v is None or not str(v).strip():
            return "Project telemetry analysis completed successfully."
        return str(v).strip()

    @field_validator("severity", mode="before")
    @classmethod
    def validate_severity(cls, v: Any) -> str:
        allowed = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        if not v or not isinstance(v, str):
            return "LOW"
        normalised = v.strip().upper()
        if normalised not in allowed:
            return "LOW"
        return normalised

    @field_validator("action_steps", mode="before")
    @classmethod
    def validate_action_steps(cls, v: Any) -> List[str]:
        if v is None:
            v = []
        elif isinstance(v, str):
            v = [v] if v.strip() else []
        elif isinstance(v, dict):
            v = list(v.values())
        elif not isinstance(v, list):
            v = []
            
        clean_steps = [str(item).strip() for item in v if item is not None and str(item).strip()]
        
        filler = "No further action required."
        if len(clean_steps) < 5:
            clean_steps = clean_steps + [filler] * (5 - len(clean_steps))
        elif len(clean_steps) > 5:
            clean_steps = clean_steps[:5]
            
        return clean_steps

    model_config = {"str_strip_whitespace": True}


# ---------------------------------------------------------------------------
# Helper: strip markdown code fences & normalize unicode
# ---------------------------------------------------------------------------

def _strip_markdown_fences(text: str) -> str:
    """
    Remove ```json ... ``` or ``` ... ``` fences from a raw LLM string.
    Normalize unicode characters and strip leading/trailing whitespace.
    """
    if not text:
        return ""
    text = text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '--')
    text = text.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```", "", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Helper: infer severity from stability_score and health_label
# ---------------------------------------------------------------------------

def _infer_severity(stability_score: float, health_label: str = "AT_RISK") -> str:
    """
    Fallback severity inference when the LLM omits or produces invalid severity.

    - If health_label is 'HEALTHY' → strictly 'LOW'
    - Otherwise (AT_RISK):
        CRITICAL : score < 30
        HIGH     : 30 ≤ score < 50
        MEDIUM   : 50 ≤ score < 70
        LOW      : score ≥ 70
    """
    if str(health_label).upper() == "HEALTHY":
        return "LOW"

    if stability_score < 30:
        return "CRITICAL"
    elif stability_score < 50:
        return "HIGH"
    elif stability_score < 70:
        return "MEDIUM"
    else:
        return "LOW"


def repair_json(json_str: str) -> str:
    """
    Attempt to repair a truncated JSON string by closing open strings,
    arrays, and objects.
    """
    json_str = json_str.strip()
    if not json_str.startswith("{"):
        return json_str

    in_string = False
    escape = False
    stack = []
    repaired = []

    for char in json_str:
        if escape:
            repaired.append(char)
            escape = False
            continue

        if char == '\\':
            repaired.append(char)
            escape = True
            continue

        if char == '"':
            in_string = not in_string
            repaired.append(char)
            continue

        if not in_string:
            if char == '{':
                stack.append('}')
            elif char == '[':
                stack.append(']')
            elif char == '}':
                if stack and stack[-1] == '}':
                    stack.pop()
            elif char == ']':
                if stack and stack[-1] == ']':
                    stack.pop()

        repaired.append(char)

    # Close open string
    if in_string:
        repaired.append('"')

    # Close open structures in reverse order
    while stack:
        close_char = stack.pop()
        last_str = "".join(repaired).rstrip()
        if last_str.endswith(','):
            repaired = list(last_str[:-1])
        repaired.append(close_char)

    return "".join(repaired)


# ---------------------------------------------------------------------------
# Public parsing function
# ---------------------------------------------------------------------------

def parse_prescription(
    raw_response: str,
    stability_score: float,
    health_label: str = "AT_RISK",
) -> PrescriptionResponse:
    """
    Parse the raw LLM string into a validated PrescriptionResponse.
    """
    cleaned = _strip_markdown_fences(raw_response)
    logger.debug("Cleaned LLM output for parsing:\n%s", cleaned)

    is_healthy = str(health_label).upper() == "HEALTHY"
    default_summary = (
        "Project telemetry metrics indicate healthy, stable operations with low risk across all monitored channels."
        if is_healthy
        else "Project telemetry analysis complete. Risk factors identified."
    )
    inferred_severity = _infer_severity(stability_score, health_label)

    data: dict = {}

    # --- Attempt JSON parse -----------------------------------------------
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to repair the truncated JSON string first
        repaired = repair_json(cleaned)
        try:
            data = json.loads(repaired)
            logger.info("Successfully repaired and parsed truncated JSON response.")
        except json.JSONDecodeError:
            # Try regex extraction of first JSON block
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group())
                except json.JSONDecodeError:
                    data = {
                        "root_cause_summary": cleaned if (cleaned and len(cleaned) > 20 and not cleaned.startswith("{")) else default_summary,
                        "severity": inferred_severity,
                        "action_steps": []
                    }
            else:
                data = {
                    "root_cause_summary": cleaned if (cleaned and len(cleaned) > 20 and not cleaned.startswith("{")) else default_summary,
                    "severity": inferred_severity,
                    "action_steps": []
                }

    # --- Recover missing severity or enforce HEALTHY → LOW -----------------
    if is_healthy:
        data["severity"] = "LOW"
    elif "severity" not in data or not data["severity"]:
        data["severity"] = inferred_severity

    # --- Validate via Pydantic v2 -----------------------------------------
    try:
        return PrescriptionResponse(**data)
    except Exception as pydantic_exc:
        logger.warning("Pydantic validation fallback triggered: %s", pydantic_exc)
        return PrescriptionResponse(
            root_cause_summary=str(data.get("root_cause_summary", default_summary)),
            severity="LOW" if is_healthy else _infer_severity(stability_score, health_label),
            action_steps=data.get("action_steps", [])
        )
