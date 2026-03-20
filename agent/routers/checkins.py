"""Check-in routes — generate today's check-in, receive user response, fetch history."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from agent.integrations.supabase_client import get_supabase
from agent.models.types import CheckInResponse, CheckInResult, CheckInSubmit, ConversationMode
from agent.routers.users import get_current_user
from agent.services import llm_client, pattern_analyzer

router = APIRouter(prefix="/checkins", tags=["checkins"])
logger = logging.getLogger("breso.checkins")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _today_utc_range() -> tuple[str, str]:
    """Return ISO strings for the start and end of today in UTC."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _get_user_profile(user_id: str) -> dict:
    """Fetch the personalization profile for a user (returns empty dict if missing)."""
    try:
        supabase = get_supabase()
        resp = (
            supabase.table("personalization_profiles")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        data = resp.data or []
        return data[0] if data else {}
    except Exception:  # noqa: BLE001
        return {}


def _get_user_language(user_id: str) -> str:
    """Fetch the user's preferred language (defaults to 'en')."""
    try:
        supabase = get_supabase()
        resp = (
            supabase.table("users")
            .select("language")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return (resp.data or {}).get("language", "en")
    except Exception:  # noqa: BLE001
        return "en"


def _check_trial_expired(user_id: str) -> bool:
    """Return True if user is on free_trial and 15 days have elapsed."""
    try:
        supabase = get_supabase()
        resp = (
            supabase.table("users")
            .select("plan, trial_start")
            .eq("id", user_id)
            .single()
            .execute()
        )
        row = resp.data or {}
        if row.get("plan") != "free_trial":
            return False
        trial_start_str = row.get("trial_start")
        if not trial_start_str:
            return False
        trial_start = datetime.fromisoformat(trial_start_str.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - trial_start).days >= 15
    except Exception:  # noqa: BLE001
        return False


def _log_missed_checkin(user_id: str) -> None:
    """
    Check if the user missed their last scheduled check-in.
    - 24h with no response → log a warning
    - 48h with no response → log alert (contact notification handled separately)
    """
    try:
        supabase = get_supabase()
        cutoff_48h = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        resp = (
            supabase.table("check_ins")
            .select("id, scheduled_at, responded_at")
            .eq("user_id", user_id)
            .lt("scheduled_at", cutoff_48h)
            .is_("responded_at", "null")
            .order("scheduled_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return
        missed = rows[0]
        scheduled_dt = datetime.fromisoformat(missed["scheduled_at"].replace("Z", "+00:00"))
        hours_missed = (datetime.now(timezone.utc) - scheduled_dt).total_seconds() / 3600
        if hours_missed >= 48:
            logger.warning(
                {
                    "event": "checkins.missed.48h_alert",
                    "user_id": user_id,
                    "checkin_id": missed["id"],
                    "hours_since_scheduled": round(hours_missed, 1),
                }
            )
        elif hours_missed >= 24:
            logger.warning(
                {
                    "event": "checkins.missed.24h_warning",
                    "user_id": user_id,
                    "checkin_id": missed["id"],
                    "hours_since_scheduled": round(hours_missed, 1),
                }
            )
    except Exception:  # noqa: BLE001
        pass


# ---------------------------------------------------------------------------
# GET /checkins/today
# ---------------------------------------------------------------------------


@router.get("/today", response_model=CheckInResponse)
async def get_today_checkin(current_user=Depends(get_current_user)) -> CheckInResponse:
    """
    Return today's check-in for the authenticated user.
    If one already exists, return it. Otherwise generate a new one via LLM.
    """
    user_id: str = current_user.id

    # Trial expiry guard — return 402 if free trial has elapsed
    if _check_trial_expired(user_id):
        raise HTTPException(status_code=402, detail={"trial_expired": True})

    # Log any missed check-ins (24h / 48h)
    _log_missed_checkin(user_id)

    supabase = get_supabase()

    # Check if a check-in already exists for today
    start, end = _today_utc_range()
    try:
        existing_resp = (
            supabase.table("check_ins")
            .select("*")
            .eq("user_id", user_id)
            .gte("scheduled_at", start)
            .lt("scheduled_at", end)
            .order("scheduled_at", desc=True)
            .limit(1)
            .execute()
        )
        existing: list[dict] = existing_resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "checkins.today.db_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Database error") from exc

    if existing:
        row = existing[0]
        return CheckInResponse(
            checkin_id=row["id"],
            message=row.get("message", ""),
            conversation_mode=ConversationMode(row.get("conversation_mode", "listen")),
            scheduled_at=datetime.fromisoformat(row["scheduled_at"].replace("Z", "+00:00")),
        )

    # Generate a new check-in
    language = _get_user_language(user_id)
    profile = _get_user_profile(user_id)
    mode: str = pattern_analyzer.select_conversation_mode(user_id)
    message: str = llm_client.generate_checkin_message(mode, language, profile)

    now_utc = datetime.now(timezone.utc)

    try:
        insert_resp = (
            supabase.table("check_ins")
            .insert(
                {
                    "user_id": user_id,
                    "scheduled_at": now_utc.isoformat(),
                    "prompt_version": "checkin_v1",
                    "engagement_flag": False,
                    "conversation_mode": mode,
                    "message": message,
                    "llm_model_id": llm_client.ANTHROPIC_MODEL,
                }
            )
            .execute()
        )
        row = insert_resp.data[0]
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "checkins.today.insert_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to create check-in") from exc

    logger.info(
        {
            "event": "checkins.today.created",
            "user_id": user_id,
            "checkin_id": row["id"],
            "mode": mode,
        }
    )

    return CheckInResponse(
        checkin_id=row["id"],
        message=message,
        conversation_mode=ConversationMode(mode),
        scheduled_at=now_utc,
    )


# ---------------------------------------------------------------------------
# POST /checkins/respond
# ---------------------------------------------------------------------------


@router.post("/respond", response_model=CheckInResult)
async def respond_to_checkin(
    body: CheckInSubmit, current_user=Depends(get_current_user)
) -> CheckInResult:
    """
    Submit the user's response to a check-in.
    Analyzes tone, updates profile, marks check-in as responded.
    The raw response_text is NEVER stored.
    """
    user_id: str = current_user.id
    supabase = get_supabase()

    # Validate ownership and that the check-in hasn't already been responded to
    try:
        resp = (
            supabase.table("check_ins")
            .select("*")
            .eq("id", body.checkin_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        checkin_row: dict = resp.data or {}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "checkins.respond.fetch_error", "error": str(exc)})
        raise HTTPException(status_code=404, detail="Check-in not found") from exc

    if not checkin_row:
        raise HTTPException(status_code=404, detail="Check-in not found or access denied")

    if checkin_row.get("responded_at") is not None:
        raise HTTPException(status_code=409, detail="Check-in already responded to")

    # Compute response metrics
    now_utc = datetime.now(timezone.utc)
    scheduled_str: str = checkin_row.get("scheduled_at", now_utc.isoformat())
    try:
        scheduled_dt = datetime.fromisoformat(scheduled_str.replace("Z", "+00:00"))
        response_delay_seconds = int((now_utc - scheduled_dt).total_seconds())
    except Exception:  # noqa: BLE001
        response_delay_seconds = 0

    word_count = len(body.response_text.split())

    # Tone analysis (never stores response_text)
    tone_result = llm_client.analyze_tone(body.response_text)
    tone_score: float = tone_result.get("tone_score", 0.0)
    contains_crisis: bool = tone_result.get("contains_crisis_keywords", False)

    # Profile update extraction
    current_profile = _get_user_profile(user_id)
    profile_update = llm_client.extract_profile_update(body.response_text, current_profile)

    # ---- response_text is discarded here — never written to DB ----

    # Update the check-in row (no raw text stored)
    try:
        supabase.table("check_ins").update(
            {
                "responded_at": now_utc.isoformat(),
                "response_delay_seconds": response_delay_seconds,
                "word_count": word_count,
                "tone_score": tone_score,
                "engagement_flag": True,
                "llm_model_id": llm_client.ANTHROPIC_MODEL,
            }
        ).eq("id", body.checkin_id).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "checkins.respond.update_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to update check-in") from exc

    # Merge and upsert personalization profile if we got new data
    if profile_update:
        try:
            merged = {
                "user_id": user_id,
                "updated_at": now_utc.isoformat(),
                "interests": list(
                    set(current_profile.get("interests", []) + profile_update.get("interests", []))
                ),
                "hobbies": list(
                    set(current_profile.get("hobbies", []) + profile_update.get("hobbies", []))
                ),
                "joy_triggers": list(
                    set(
                        current_profile.get("joy_triggers", [])
                        + profile_update.get("joy_triggers", [])
                    )
                ),
                "energy_drains": list(
                    set(
                        current_profile.get("energy_drains", [])
                        + profile_update.get("energy_drains", [])
                    )
                ),
                "checkins_contributing": current_profile.get("checkins_contributing", 0) + 1,
            }
            # Preserve existing fields not in the update
            for field in ("energy_by_hour", "active_hours"):
                if field in current_profile:
                    merged[field] = current_profile[field]

            supabase.table("personalization_profiles").upsert(merged).execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                {"event": "checkins.respond.profile_upsert_error", "error": str(exc)}
            )

    # Update behavioral baseline
    baseline_updated = pattern_analyzer.update_baseline(user_id)

    # Evaluate alert level (log if any, dispatch in Phase 7)
    alert_level = pattern_analyzer.evaluate_alert_level(user_id)
    if alert_level:
        logger.warning(
            {
                "event": "checkins.respond.alert_detected",
                "user_id": user_id,
                "alert_level": alert_level,
                "contains_crisis_keywords": contains_crisis,
            }
        )

    logger.info(
        {
            "event": "checkins.respond.success",
            "user_id": user_id,
            "checkin_id": body.checkin_id,
            "tone_score": tone_score,
            "word_count": word_count,
            "baseline_updated": baseline_updated,
        }
    )

    return CheckInResult(
        checkin_id=body.checkin_id,
        processed=True,
        tone_score=tone_score,
        follow_up_message=None,
        baseline_updated=baseline_updated,
    )


# ---------------------------------------------------------------------------
# GET /checkins/history
# ---------------------------------------------------------------------------


@router.get("/history")
async def get_history(
    days: int = Query(default=30, ge=1, le=365),
    current_user=Depends(get_current_user),
) -> list[dict]:
    """Return the check-in history for the last N days. Raw response text is never stored."""
    user_id: str = current_user.id
    supabase = get_supabase()

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    try:
        resp = (
            supabase.table("check_ins")
            .select(
                "id, user_id, scheduled_at, responded_at, response_delay_seconds, "
                "word_count, tone_score, engagement_flag, prompt_version, "
                "conversation_mode, llm_model_id, llm_latency_ms"
            )
            .eq("user_id", user_id)
            .gte("scheduled_at", cutoff)
            .order("scheduled_at", desc=True)
            .execute()
        )
        return resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "checkins.history.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch check-in history") from exc
