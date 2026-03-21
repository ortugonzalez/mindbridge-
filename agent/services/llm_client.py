"""LLM client for BRESO — wraps Anthropic SDK with structured logging and fallbacks."""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import anthropic
import yaml
from dotenv import load_dotenv
from integrations.supabase_client import get_supabase

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
ANTHROPIC_MAX_TOKENS: int = int(os.getenv("ANTHROPIC_MAX_TOKENS", "1024"))
CHECKIN_MAX_TOKENS: int = 600
CHECKIN_TEMPERATURE: float = 0.9
CHECKIN_TOP_P: float = 0.95

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

# ---------------------------------------------------------------------------
# Structured JSON logger
# ---------------------------------------------------------------------------


class _JsonFormatter(logging.Formatter):
    """Emit each log record as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()
        # If the message is already a dict (passed via logger.info({...})) keep it.
        if isinstance(message, str):
            try:
                payload = json.loads(message)
            except (json.JSONDecodeError, TypeError):
                payload = {"message": message}
        elif isinstance(message, dict):
            payload = message
        else:
            payload = {"message": str(message)}

        log_obj: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "service": record.name,
        }
        log_obj.update(payload)
        return json.dumps(log_obj, ensure_ascii=False)


def _build_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        logger.propagate = False
    return logger


logger = _build_logger("breso.llm")

# ---------------------------------------------------------------------------
# Prompt YAML loading
# ---------------------------------------------------------------------------


def _load_yaml(filename: str) -> dict:
    path = _PROMPTS_DIR / filename
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


try:
    _CHECKIN_PROMPTS: dict = _load_yaml("checkin_v1.yaml")
    _TONE_PROMPTS: dict = _load_yaml("tone_analysis_v1.yaml")
    _ALERT_PROMPTS: dict = _load_yaml("alert_message_v1.yaml")
except Exception as exc:  # noqa: BLE001
    logger.warning({"event": "prompts.load_failed", "error": str(exc)})
    _CHECKIN_PROMPTS = {}
    _TONE_PROMPTS = {}
    _ALERT_PROMPTS = {}

# ---------------------------------------------------------------------------
# Anthropic client (lazy init)
# ---------------------------------------------------------------------------


def _get_client() -> anthropic.Anthropic:
    if not ANTHROPIC_API_KEY:
        logger.error({"event": "llm.init_error", "error": "ANTHROPIC_API_KEY environment variable is not set"})
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# ---------------------------------------------------------------------------
# Helper: log an LLM call
# ---------------------------------------------------------------------------


def _log_llm_call(
    *,
    event: str,
    model_id: str,
    prompt_tokens: int,
    completion_tokens: int,
    latency_ms: int,
    outcome: str,
    extra: dict | None = None,
) -> None:
    payload: dict[str, Any] = {
        "event": event,
        "model_id": model_id,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "latency_ms": latency_ms,
        "outcome": outcome,
    }
    if extra:
        payload.update(extra)
    logger.info(payload)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_user_memory(user_id: str) -> str:
    """Fetch Soledad's accumulated memory about this user. Returns '' if none."""
    try:
        supabase = get_supabase()
        result = supabase.table("user_memory").select("memory_text").eq("user_id", user_id).execute()
        if result.data:
            return result.data[0].get("memory_text") or ""
        return ""
    except Exception:  # noqa: BLE001
        return ""


def update_user_memory(user_id: str, conversation: list[dict]) -> None:
    """
    Extract key insights from the recent conversation and upsert to user_memory.
    Runs synchronously — call from a background task to avoid blocking.
    """
    if not conversation:
        return
    try:
        memory_prompt = (
            "Analizá esta conversación y extraé máximo 5 insights clave sobre la persona en formato lista:\n"
            "- Temas recurrentes\n"
            "- Estado emocional general\n"
            "- Situaciones mencionadas\n"
            "- Patrones de comportamiento\n"
            "Solo los hechos, sin análisis. Máximo 200 palabras."
        )
        conversation_text = "\n".join(
            f"{m.get('role', 'user')}: {m.get('content', '')}"
            for m in conversation[-6:]
        )
        client = _get_client()
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": f"{memory_prompt}\n\nConversación:\n{conversation_text}",
            }],
        )
        new_memory = response.content[0].text.strip()
        if not new_memory:
            return

        supabase = get_supabase()
        existing = supabase.table("user_memory").select("id").eq("user_id", user_id).execute()
        if existing.data:
            supabase.table("user_memory").update({
                "memory_text": new_memory,
                "updated_at": "now()",
            }).eq("user_id", user_id).execute()
        else:
            supabase.table("user_memory").insert({
                "user_id": user_id,
                "memory_text": new_memory,
            }).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "llm.memory_update_failed", "user_id": user_id, "error": str(exc)})


def generate_checkin_message(mode: str, language: str, profile: dict) -> str:
    """Generate a personalised check-in message for the given mode and language."""
    fallback_lang = language if language in ("es", "en") else "en"
    fallback_text: str = (
        _CHECKIN_PROMPTS.get("fallback", {}).get(fallback_lang)
        or "Hey, how are you today? I'm here to listen. 💙"
    )

    try:
        # Combine base system prompt with mode-specific instructions
        base_system: str = _CHECKIN_PROMPTS.get("system", "")
        modes_cfg = _CHECKIN_PROMPTS.get("modes", {})
        mode_cfg = modes_cfg.get(mode, modes_cfg.get("listen", {}))
        mode_instructions: str = mode_cfg.get(language) or mode_cfg.get("en", "")
        system_prompt: str = (
            f"{base_system}\n\n{mode_instructions}".strip()
            if mode_instructions
            else base_system
        )

        # Build user message context from profile
        user_parts: list[str] = ["Please send me a check-in message now."]
        interests = profile.get("interests", [])
        hobbies = profile.get("hobbies", [])
        if interests:
            user_parts.append(f"User interests: {', '.join(interests)}.")
        if hobbies:
            user_parts.append(f"User hobbies: {', '.join(hobbies)}.")
        user_message = " ".join(user_parts)

        client = _get_client()
        t0 = time.monotonic()
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=CHECKIN_MAX_TOKENS,
            temperature=CHECKIN_TEMPERATURE,
            top_p=CHECKIN_TOP_P,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

        prompt_tokens: int = response.usage.input_tokens
        completion_tokens: int = response.usage.output_tokens
        text: str = response.content[0].text.strip()

        _log_llm_call(
            event="llm.checkin_message.success",
            model_id=ANTHROPIC_MODEL,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            outcome="success",
            extra={"mode": mode, "language": language},
        )
        return text

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            {
                "event": "llm.fallback_triggered",
                "reason": "generate_checkin_message",
                "error": str(exc),
                "model_id": ANTHROPIC_MODEL,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "latency_ms": 0,
                "outcome": "fallback",
            }
        )
        return fallback_text


def generate_response(
    user_message: str,
    mode: str,
    language: str,
    profile: dict,
    conversation_history: list[dict] | None = None,
    memory: str = "",
) -> str:
    """
    Generate Soledad's conversational reply to a user message.
    Uses the full system prompt + mode instructions + optional prior turns + persistent memory.
    """
    fallback_lang = language if language in ("es", "en") else "es"
    fallback_text: str = (
        _CHECKIN_PROMPTS.get("fallback", {}).get(fallback_lang)
        or "Hola, estoy acá. ¿Cómo estás hoy?"
    )

    try:
        base_system: str = _CHECKIN_PROMPTS.get("system", "")
        modes_cfg = _CHECKIN_PROMPTS.get("modes", {})
        mode_cfg = modes_cfg.get(mode, modes_cfg.get("listen", {}))
        mode_instructions: str = mode_cfg.get(language) or mode_cfg.get("es", "")

        # Prepend persistent memory to the system prompt when available
        if memory:
            base_system = f"Lo que recordás de esta persona:\n{memory}\n\n{base_system}"

        system_prompt: str = (
            f"{base_system}\n\n{mode_instructions}".strip()
            if mode_instructions
            else base_system
        )

        # Build message list (prior turns + current message)
        # History items may use {role, content} (new standard) or {user, soledad} (legacy)
        messages: list[dict] = []
        for turn in (conversation_history or []):
            if "role" in turn and "content" in turn:
                role = turn["role"] if turn["role"] in ("user", "assistant") else "user"
                if turn["content"]:
                    messages.append({"role": role, "content": turn["content"]})
            else:
                if turn.get("user"):
                    messages.append({"role": "user", "content": turn["user"]})
                if turn.get("soledad"):
                    messages.append({"role": "assistant", "content": turn["soledad"]})
        messages.append({"role": "user", "content": user_message})

        client = _get_client()
        t0 = time.monotonic()
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=CHECKIN_MAX_TOKENS,
            temperature=CHECKIN_TEMPERATURE,
            top_p=CHECKIN_TOP_P,
            system=system_prompt,
            messages=messages,
        )
        latency_ms = int((time.monotonic() - t0) * 1000)
        text: str = response.content[0].text.strip()

        _log_llm_call(
            event="llm.response.success",
            model_id=ANTHROPIC_MODEL,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
            latency_ms=latency_ms,
            outcome="success",
            extra={"mode": mode, "language": language},
        )
        return text

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            {
                "event": "llm.fallback_triggered",
                "reason": "generate_response",
                "error": str(exc),
                "model_id": ANTHROPIC_MODEL,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "latency_ms": 0,
                "outcome": "fallback",
            }
        )
        return fallback_text


def analyze_tone(text: str) -> dict:
    """Analyse the emotional tone of a user response. Never raises — returns safe fallback."""
    fallback: dict = {
        "tone_score": 0.0,
        "valence": "neutral",
        "contains_crisis_keywords": False,
    }

    try:
        system_prompt: str = _TONE_PROMPTS.get("system", "")
        client = _get_client()
        t0 = time.monotonic()
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=256,
            system=system_prompt,
            messages=[{"role": "user", "content": text}],
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

        prompt_tokens: int = response.usage.input_tokens
        completion_tokens: int = response.usage.output_tokens
        raw: str = response.content[0].text.strip()

        result: dict = json.loads(raw)

        # Validate tone_score range
        tone_score = float(result.get("tone_score", 0.0))
        tone_score = max(-1.0, min(1.0, tone_score))
        result["tone_score"] = tone_score

        _log_llm_call(
            event="llm.tone_analysis.success",
            model_id=ANTHROPIC_MODEL,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            outcome="success",
        )
        return result

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            {
                "event": "llm.fallback_triggered",
                "reason": "analyze_tone",
                "error": str(exc),
                "model_id": ANTHROPIC_MODEL,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "latency_ms": 0,
                "outcome": "fallback",
            }
        )
        return fallback


def extract_profile_update(response_text: str, current_profile: dict) -> dict:
    """Extract interests/hobbies/energy patterns from user text. Returns empty dict on failure."""
    try:
        system_prompt = (
            "You are a profile extraction assistant. "
            "Given a user's message, extract any personal interests, hobbies, joy triggers, or energy drains mentioned. "
            "Return ONLY a valid JSON object with exactly these keys: "
            '{"interests": [], "hobbies": [], "joy_triggers": [], "energy_drains": []}. '
            "Each value is a list of short strings (1-4 words each). "
            "If nothing relevant is found, return empty lists. Return ONLY the JSON."
        )

        current_summary = (
            f"Current known interests: {current_profile.get('interests', [])}. "
            f"Current hobbies: {current_profile.get('hobbies', [])}."
        )
        user_message = f"{current_summary}\n\nUser message: {response_text}"

        client = _get_client()
        t0 = time.monotonic()
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

        prompt_tokens: int = response.usage.input_tokens
        completion_tokens: int = response.usage.output_tokens
        raw: str = response.content[0].text.strip()
        result: dict = json.loads(raw)

        _log_llm_call(
            event="llm.profile_extraction.success",
            model_id=ANTHROPIC_MODEL,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            outcome="success",
        )
        return result

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            {
                "event": "llm.fallback_triggered",
                "reason": "extract_profile_update",
                "error": str(exc),
                "model_id": ANTHROPIC_MODEL,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "latency_ms": 0,
                "outcome": "fallback",
            }
        )
        return {}  # fail-safe: profile not updated


def generate_alert_message(
    relationship_label: str,
    level: str,
    language: str,
    crisis_number: str = "",
) -> str:
    """
    Generate an alert message for a trusted contact using YAML templates.
    No LLM call needed — pure template substitution.
    """
    try:
        templates = _ALERT_PROMPTS.get("templates", {})

        # Map level to template key
        template_key = "level3" if level == "high" else "level2"
        lang = language if language in ("es", "en") else "en"

        template_str: str = templates.get(template_key, {}).get(lang, "")
        if not template_str:
            raise ValueError(f"No template found for level={level}, language={language}")

        message = template_str.replace("{relationship_label}", relationship_label)
        message = message.replace("{crisis_number}", crisis_number)
        return message

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            {
                "event": "alert_message.template_error",
                "error": str(exc),
                "level": level,
                "language": language,
            }
        )
        # Hardcoded fallback
        if language == "es":
            return (
                f"Hola,\n\nTu {relationship_label} puede estar necesitando apoyo. "
                "Por favor comunícate con ella/él.\n\nCon cariño,\nBRESO"
            )
        return (
            f"Hi,\n\nYour {relationship_label} may need support right now. "
            "Please reach out to them.\n\nWarmly,\nBRESO"
        )
