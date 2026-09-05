"""
llm_client.py — LangChain Groq client for the Prescription Engine.

Implements LangChainGroqClient using:
  - langchain_core.language_models.chat_models.init_chat_model (0.3.x)
    also accessible via: from langchain.chat_models import init_chat_model
  - langchain_core.prompts.ChatPromptTemplate
  - langchain_core.output_parsers.StrOutputParser
  - .with_fallbacks([fallback_llm])  for automatic key switching
  - chain.ainvoke()                   for full async execution
  - Manual exponential backoff wrapper (3 attempts: 2s → 4s → 8s)

Compatible with: langchain>=0.3, langchain-core>=0.3, langchain-groq>=0.2
groq_key_used stored as "primary" or "fallback" — NEVER the actual key string.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Tuple

from dotenv import load_dotenv

# LangChain imports — works with langchain>=0.3 / langchain-core>=0.3
try:
    # Preferred path in langchain>=0.3
    from langchain_core.language_models.chat_models import init_chat_model
except ImportError:
    # Fallback for older langchain 0.1/0.2
    from langchain.chat_models import init_chat_model  # type: ignore

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class LLMUnavailableError(Exception):
    """Raised when both primary and fallback Groq API keys fail."""


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GROQ_API_KEY_PRIMARY  = os.getenv("GROQ_API_KEY_PRIMARY", "")
GROQ_API_KEY_FALLBACK = os.getenv("GROQ_API_KEY_FALLBACK", "")
GROQ_MODEL            = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

_RETRY_ATTEMPTS = 3
_RETRY_BASE_DELAY = 2  # seconds; doubles each attempt


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are a software project risk analyst specialising in developer health metrics. "
    "Always respond with valid JSON only. No markdown, no explanation — pure JSON."
)


# ---------------------------------------------------------------------------
# Utility: strip markdown fences (defence-in-depth, parser also strips)
# ---------------------------------------------------------------------------

def _strip_fences(text: str) -> str:
    # Normalize unicode hyphens/dashes and quotes that can break cp1252 or parser
    text = text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '--')
    text = text.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```", "", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Helper: approximate token count (rough heuristic ~4 chars per token)
# ---------------------------------------------------------------------------

def _approx_tokens(text: str) -> int:
    return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# LangChain Groq Client
# ---------------------------------------------------------------------------

class LangChainGroqClient:
    """
    Async LLM client wrapping two Groq API keys via LangChain v1.

    Primary key is tried first.  If it fails (rate-limit, auth error, etc.),
    LangChain's .with_fallbacks() automatically switches to the fallback key.
    If both fail across _RETRY_ATTEMPTS retries, LLMUnavailableError is raised.
    """

    def __init__(self) -> None:
        if not GROQ_API_KEY_PRIMARY:
            raise EnvironmentError(
                "GROQ_API_KEY_PRIMARY is not set. "
                "Add it to sentinel-prescription/.env"
            )
        if not GROQ_API_KEY_FALLBACK:
            logger.warning(
                "GROQ_API_KEY_FALLBACK is not set — fallback LLM will not be available."
            )

        # --- Initialise LLMs (LangChain v1 init_chat_model pattern) --------
        # Note: max_tokens=2500 accommodates reasoning tokens from models like openai/gpt-oss-20b
        self._primary_llm = init_chat_model(
            model=GROQ_MODEL,
            model_provider="groq",
            api_key=GROQ_API_KEY_PRIMARY,
            temperature=0.3,
            max_tokens=2500,
        )

        self._fallback_llm = init_chat_model(
            model=GROQ_MODEL,
            model_provider="groq",
            api_key=GROQ_API_KEY_FALLBACK if GROQ_API_KEY_FALLBACK else GROQ_API_KEY_PRIMARY,
            temperature=0.3,
            max_tokens=2500,
        )

        # LangChain automatically attempts fallback on any exception
        _llm_with_fallback = self._primary_llm.with_fallbacks([self._fallback_llm])

        # --- Build the full chain ------------------------------------------
        _prompt_template = ChatPromptTemplate.from_messages([
            ("system", _SYSTEM_PROMPT),
            ("human", "{prescription_prompt}"),
        ])

        self._chain = _prompt_template | _llm_with_fallback | StrOutputParser()

        # Keep a reference to the primary-only chain to detect which key ran
        self._primary_chain = _prompt_template | self._primary_llm | StrOutputParser()

        logger.info(
            "LangChainGroqClient initialised. Model: %s | Primary key: %s | Fallback key: %s",
            GROQ_MODEL,
            "configured" if GROQ_API_KEY_PRIMARY else "MISSING",
            "configured" if GROQ_API_KEY_FALLBACK else "MISSING",
        )

    # -----------------------------------------------------------------------
    # Internal: single attempt with exponential back-off tracking
    # -----------------------------------------------------------------------

    async def _attempt_generate(self, prompt_text: str) -> Tuple[str, str]:
        """
        Try primary key first; if it raises, fall back to the fallback chain.

        Returns (raw_response, "primary" | "fallback").
        """
        # Try primary only — to detect which key actually handled the request
        try:
            logger.debug("Attempting LLM call via PRIMARY Groq key (%s).", GROQ_MODEL)
            raw = await self._primary_chain.ainvoke(
                {"prescription_prompt": prompt_text}
            )
            logger.info(
                "LLM call succeeded via PRIMARY key. Approx tokens in prompt: %d",
                _approx_tokens(prompt_text),
            )
            return _strip_fences(raw), "primary"

        except Exception as primary_exc:
            logger.warning(
                "PRIMARY Groq key failed (%s). Switching to FALLBACK key.",
                str(primary_exc)[:120],
            )

        # Try fallback
        fallback_chain = (
            ChatPromptTemplate.from_messages([
                ("system", _SYSTEM_PROMPT),
                ("human", "{prescription_prompt}"),
            ])
            | self._fallback_llm
            | StrOutputParser()
        )

        raw = await fallback_chain.ainvoke({"prescription_prompt": prompt_text})
        logger.info(
            "LLM call succeeded via FALLBACK key. Approx tokens in prompt: %d",
            _approx_tokens(prompt_text),
        )
        return _strip_fences(raw), "fallback"

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    async def generate(self, prompt_text: str) -> Tuple[str, str]:
        """
        Generate a prescription from the LLM with exponential back-off retry.

        Parameters
        ----------
        prompt_text : str
            The fully-formatted prompt string from prompt_builder.build_prompt().

        Returns
        -------
        tuple[str, str]
            (raw_response_string, "primary" | "fallback")

        Raises
        ------
        LLMUnavailableError
            If both Groq keys fail across all retry attempts.
        """
        last_exception: Exception | None = None
        delay = _RETRY_BASE_DELAY

        for attempt in range(1, _RETRY_ATTEMPTS + 1):
            try:
                result = await self._attempt_generate(prompt_text)
                return result
            except Exception as exc:
                last_exception = exc
                logger.error(
                    "LLM attempt %d/%d failed: %s",
                    attempt,
                    _RETRY_ATTEMPTS,
                    str(exc)[:200],
                )
                if attempt < _RETRY_ATTEMPTS:
                    logger.info(
                        "Retrying in %d seconds (exponential back-off)...", delay
                    )
                    await asyncio.sleep(delay)
                    delay *= 2  # 2s → 4s → 8s

        raise LLMUnavailableError(
            f"Both Groq API keys failed after {_RETRY_ATTEMPTS} attempts. "
            f"Last error: {last_exception}"
        )
