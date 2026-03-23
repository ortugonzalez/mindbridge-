"""Check-in routes — generate today's check-in, receive user response, fetch history."""
from __future__ import annotations

import logging
import threading
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel

from integrations.email_client import send_alert_email
from integrations.supabase_client import get_supabase
from models.types import CheckInResponse, CheckInResult, CheckInSubmit, ConversationMode
from routers.users import get_current_user
from services import llm_client, pattern_analyzer


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    language: str = "es"
    history: List[HistoryMessage] = []

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


def _get_trusted_contacts(user_id: str) -> list[dict]:
    """Return active trusted contacts for a user with their emails and names."""
    try:
        supabase = get_supabase()
        resp = (
            supabase.table("trusted_contacts")
            .select("contact_email, relationship_label")
            .eq("user_id", user_id)
            .eq("active", True)
            .execute()
        )
        return resp.data or []
    except Exception:  # noqa: BLE001
        return []


def _get_patient_name(user_id: str) -> str:
    try:
        supabase = get_supabase()
        resp = (
            supabase.table("users")
            .select("display_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return (resp.data or {}).get("display_name") or "tu ser querido"
    except Exception:  # noqa: BLE001
        return "tu ser querido"


def _log_missed_checkin(user_id: str) -> None:
    """
    Check if the user missed their last scheduled check-in.
    - 24h with no response → log warning + send yellow alert email
    - 48h with no response → log alert + send orange alert email
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
            _send_missed_checkin_emails(user_id, level="orange")
        elif hours_missed >= 24:
            logger.warning(
                {
                    "event": "checkins.missed.24h_warning",
                    "user_id": user_id,
                    "checkin_id": missed["id"],
                    "hours_since_scheduled": round(hours_missed, 1),
                }
            )
            _send_missed_checkin_emails(user_id, level="yellow")
    except Exception:  # noqa: BLE001
        pass


def _send_missed_checkin_emails(user_id: str, level: str) -> None:
    """Send alert emails to all trusted contacts for a missed check-in."""
    contacts = _get_trusted_contacts(user_id)
    if not contacts:
        return
    patient_name = _get_patient_name(user_id)
    messages = {
        "yellow": f"Soledad notó que {patient_name} no completó su check-in de hoy. Puede que esté pasando un momento difícil.",
        "orange": f"{patient_name} lleva dos días sin hablar con Soledad. Puede ser un buen momento para contactarle.",
    }
    message = messages.get(level, messages["yellow"])
    for contact in contacts:
        send_alert_email(
            to_email=contact["contact_email"],
            to_name=contact.get("relationship_label", ""),
            patient_name=patient_name,
            alert_level=level,
            message=message,
        )


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
# Gamification
# ---------------------------------------------------------------------------


def _update_gamification(user_id: str) -> None:
    """Update streak, points and check for achievement unlocks."""
    try:
        supabase = get_supabase()
        today = date.today()

        streak_res = supabase.table("user_streaks").select("*").eq("user_id", user_id).execute()

        if streak_res.data:
            s = streak_res.data[0]
            last_str = s.get("last_checkin_date")
            last = date.fromisoformat(last_str) if last_str else None

            if last == today:
                return  # Already counted today
            if last == today - timedelta(days=1):
                new_streak = s["current_streak"] + 1
            else:
                new_streak = 1  # Streak broken

            longest = max(new_streak, s.get("longest_streak", 0))
            total = s.get("total_checkins", 0) + 1
            points = s.get("points", 0) + 10

            supabase.table("user_streaks").update({
                "current_streak": new_streak,
                "longest_streak": longest,
                "last_checkin_date": str(today),
                "total_checkins": total,
                "points": points,
            }).eq("user_id", user_id).execute()

            achievements = {
                "first_checkin": total == 1,
                "streak_7": new_streak == 7,
                "streak_30": new_streak == 30,
                "points_100": points >= 100,
            }
        else:
            supabase.table("user_streaks").insert({
                "user_id": user_id,
                "current_streak": 1,
                "longest_streak": 1,
                "last_checkin_date": str(today),
                "total_checkins": 1,
                "points": 10,
            }).execute()
            achievements = {"first_checkin": True}

        for achievement_id, unlocked in achievements.items():
            if not unlocked:
                continue
            existing = (
                supabase.table("user_achievements")
                .select("id")
                .eq("user_id", user_id)
                .eq("achievement_id", achievement_id)
                .execute()
            )
            if not existing.data:
                supabase.table("user_achievements").insert({
                    "user_id": user_id,
                    "achievement_id": achievement_id,
                }).execute()

    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "gamification.update_error", "user_id": user_id, "error": str(exc)})


# ---------------------------------------------------------------------------
# POST /checkins/respond
# ---------------------------------------------------------------------------


@router.post("/respond")
async def respond_to_checkin(
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Receive a chat message from the user and return Soledad's reply.
    Accepts full conversation history for context. Integrates persistent memory,
    keyword-based crisis detection, tone analysis, and gamification.
    """
    user_id: str = current_user.id
    logger.info({"event": "checkins.respond.received", "user_id": user_id, "message_preview": body.message[:50], "history_len": len(body.history), "language": body.language})
    supabase = get_supabase()
    now_utc = datetime.now(timezone.utc)

    # Determine language and mode
    language = body.language if body.language in ("es", "en") else _get_user_language(user_id)
    mode: str = pattern_analyzer.select_conversation_mode(user_id)
    logger.info({"event": "checkins.respond.mode", "user_id": user_id, "mode": mode, "language": language})

    # Convert history to standard format.
    # The frontend includes the current user message as the last item in body.history
    # (because it appends userMsg before calling sendMessageToSoledad). We strip it
    # here so generate_response can append it once at the end — otherwise the Anthropic
    # API receives two consecutive "user" messages and rejects the request.
    raw_history = body.history
    if (
        raw_history
        and raw_history[-1].role == "user"
        and raw_history[-1].content.strip() == body.message.strip()
    ):
        raw_history = raw_history[:-1]

    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in raw_history[-10:]
        if msg.content
    ]

    # --- FEATURE 1: Load persistent memory ---
    memory = llm_client.get_user_memory(user_id)

    # --- FEATURE 3: Keyword-based pattern detection ---
    pattern_result = pattern_analyzer.analyze_message(body.message, conversation_history, language)
    pattern_level = pattern_result.get("level", "green")

    # Tone analysis (LLM-based, for baseline)
    tone_result = llm_client.analyze_tone(body.message)
    tone_score: float = tone_result.get("tone_score", 0.0)
    contains_crisis: bool = tone_result.get("contains_crisis_keywords", False) or pattern_level == "red"

    # Profile update extraction
    current_profile = _get_user_profile(user_id)
    profile_update = llm_client.extract_profile_update(body.message, current_profile)

    # Generate Soledad's reply with full history + persistent memory
    logger.info({"event": "checkins.respond.calling_llm", "user_id": user_id, "conversation_history_len": len(conversation_history)})
    try:
        breso_response: str = llm_client.generate_response(
            user_message=body.message,
            mode=mode,
            language=language,
            profile=current_profile,
            conversation_history=conversation_history,
            memory=memory,
        )
    except Exception as exc:
        logger.error({"event": "checkins.respond.llm_error", "user_id": user_id, "error_type": type(exc).__name__, "error": str(exc)})
        raise HTTPException(status_code=500, detail=f"LLM error: {type(exc).__name__}: {exc}") from exc
    logger.info({"event": "checkins.respond.llm_ok", "user_id": user_id, "response_preview": breso_response[:80]})

    # --- FEATURE 3: Crisis response modifications ---
    if pattern_level == "red":
        crisis_suffix = (
            "\n\n---\nSi estás pasando un momento muy difícil, no estás sola/o. "
            "Podés llamar al **135** (Centro de Asistencia al Suicida, Argentina, gratuito y confidencial) "
            "o escribir al chat en centrodeasistencia.org. Estoy acá con vos."
        )
        breso_response = breso_response + crisis_suffix

        # Log crisis event
        try:
            supabase.table("crisis_events").insert({
                "user_id": user_id,
                "level": "red",
                "trigger_type": pattern_result.get("trigger"),
                "message_excerpt": body.message[:200],
                "notified_contacts": False,
            }).execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning({"event": "crisis_event.insert_error", "error": str(exc)})

        # Immediate notification to all trusted contacts
        patient_name = _get_patient_name(user_id)
        contacts = _get_trusted_contacts(user_id)
        for contact in contacts:
            send_alert_email(
                to_email=contact["contact_email"],
                to_name=contact.get("relationship_label", ""),
                patient_name=patient_name,
                alert_level="red",
                message=(
                    f"Soledad detectó señales de que {patient_name} puede estar "
                    "pasando un momento muy difícil ahora mismo. "
                    "Por favor, intentá comunicarte con ella/él lo antes posible."
                ),
            )
        try:
            supabase.table("crisis_events").update(
                {"notified_contacts": True}
            ).eq("user_id", user_id).eq("notified_contacts", False).execute()
        except Exception:  # noqa: BLE001
            pass

    elif pattern_level == "orange":
        # Log orange event and schedule (send now, word it softly)
        try:
            supabase.table("crisis_events").insert({
                "user_id": user_id,
                "level": "orange",
                "trigger_type": pattern_result.get("trigger"),
                "message_excerpt": body.message[:200],
                "notified_contacts": False,
            }).execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning({"event": "crisis_event.orange_insert_error", "error": str(exc)})

        patient_name = _get_patient_name(user_id)
        contacts = _get_trusted_contacts(user_id)
        for contact in contacts:
            send_alert_email(
                to_email=contact["contact_email"],
                to_name=contact.get("relationship_label", ""),
                patient_name=patient_name,
                alert_level="orange",
                message=(
                    f"Soledad notó que {patient_name} ha estado expresando algunas emociones difíciles "
                    "en sus conversaciones recientes. No es una alarma, pero si tenés un momento, "
                    "puede ser un buen momento para escribirle."
                ),
            )

    # Store this exchange in check_ins table
    try:
        supabase.table("check_ins").insert({
            "user_id": user_id,
            "scheduled_at": now_utc.isoformat(),
            "responded_at": now_utc.isoformat(),
            "prompt_version": "chat_v1",
            "engagement_flag": True,
            "conversation_mode": mode,
            "tone_score": tone_score,
            "word_count": len(body.message.split()),
            "llm_model_id": llm_client.ANTHROPIC_MODEL,
            "user_response": body.message,
            "breso_message": breso_response,
        }).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "checkins.respond.insert_error", "error": str(exc)})

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
                    set(current_profile.get("joy_triggers", []) + profile_update.get("joy_triggers", []))
                ),
                "energy_drains": list(
                    set(current_profile.get("energy_drains", []) + profile_update.get("energy_drains", []))
                ),
                "checkins_contributing": current_profile.get("checkins_contributing", 0) + 1,
            }
            for field in ("energy_by_hour", "active_hours"):
                if field in current_profile:
                    merged[field] = current_profile[field]
            supabase.table("personalization_profiles").upsert(merged).execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning({"event": "checkins.respond.profile_upsert_error", "error": str(exc)})

    # Update behavioral baseline
    baseline_updated = pattern_analyzer.update_baseline(user_id)

    # --- Sustained negativity check → family push alert ---
    try:
        recent_scores_res = (
            get_supabase()
            .table("check_ins")
            .select("tone_score")
            .eq("user_id", user_id)
            .not_.is_("tone_score", "null")
            .order("responded_at", desc=True)
            .limit(5)
            .execute()
        )
        recent_scores = [r["tone_score"] for r in (recent_scores_res.data or [])]
        if pattern_analyzer.check_sustained_negativity(recent_scores):
            from services.scheduler import send_push_to_family
            background_tasks.add_task(
                send_push_to_family,
                user_id,
                "orange",
                "Negatividad sostenida en los últimos 5 check-ins",
            )
            logger.info({"event": "checkins.respond.sustained_negativity_alert", "user_id": user_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "checkins.respond.sustained_negativity_check_error", "error": str(exc)})

    # --- FEATURE 4: Gamification ---
    background_tasks.add_task(_update_gamification, user_id)

    # --- FEATURE 1: Update memory in background ---
    memory_conversation = conversation_history + [
        {"role": "user", "content": body.message},
        {"role": "assistant", "content": breso_response},
    ]
    background_tasks.add_task(llm_client.update_user_memory, user_id, memory_conversation)

    logger.info({
        "event": "checkins.respond.success",
        "user_id": user_id,
        "tone_score": tone_score,
        "pattern_level": pattern_level,
        "baseline_updated": baseline_updated,
    })

    memory_preview = memory[:60].strip() if memory else ""
    return {
        "response": breso_response,
        "is_crisis": pattern_level == "red",
        "has_memory": bool(memory),
        "memory_preview": memory_preview,
    }


# ---------------------------------------------------------------------------
# GET /checkins/history
# ---------------------------------------------------------------------------


@router.get("/conversation-history")
async def get_conversation_history(
    limit: int = Query(default=20, ge=1, le=100),
    current_user=Depends(get_current_user),
) -> list[dict]:
    """
    Return full conversation history (user messages + Soledad responses).
    Returns up to `limit` most recent exchanges, newest first.
    """
    user_id: str = current_user.id
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("check_ins")
            .select("id, scheduled_at, responded_at, user_response, breso_message, tone_score, conversation_mode")
            .eq("user_id", user_id)
            .not_.is_("breso_message", "null")
            .order("responded_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "checkins.conversation_history.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch conversation history") from exc

    messages = []
    for r in rows:
        if r.get("user_response"):
            messages.append({
                "role": "user",
                "text": r["user_response"],
                "timestamp": r.get("responded_at") or r.get("scheduled_at"),
            })
        if r.get("breso_message"):
            messages.append({
                "role": "soledad",
                "text": r["breso_message"],
                "timestamp": r.get("responded_at") or r.get("scheduled_at"),
            })
    messages.reverse()
    return {"messages": messages, "total": len(messages)}


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


# ---------------------------------------------------------------------------
# GET /checkins/daily-summaries
# ---------------------------------------------------------------------------


@router.get("/daily-summaries")
async def get_daily_summaries(
    current_user=Depends(get_current_user),
) -> list[dict]:
    """
    Return one AI-generated summary per day for the last 30 days.
    Each entry contains date, messages_count, summary, tone_score, alert_level.
    """
    user_id: str = current_user.id
    supabase = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    try:
        resp = (
            supabase.table("check_ins")
            .select("scheduled_at, responded_at, user_response, breso_message, tone_score")
            .eq("user_id", user_id)
            .gte("scheduled_at", cutoff)
            .not_.is_("responded_at", "null")
            .order("scheduled_at", desc=False)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "checkins.daily_summaries.fetch_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch check-in data") from exc

    # Group rows by date
    from collections import defaultdict
    by_date: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        ts = row.get("responded_at") or row.get("scheduled_at") or ""
        day = ts[:10]  # "YYYY-MM-DD"
        if day:
            by_date[day].append(row)

    results: list[dict] = []
    client = llm_client._get_client()

    for day in sorted(by_date.keys()):
        day_rows = by_date[day]
        avg_tone = (
            sum(r["tone_score"] for r in day_rows if r.get("tone_score") is not None)
            / max(1, sum(1 for r in day_rows if r.get("tone_score") is not None))
        ) if any(r.get("tone_score") is not None for r in day_rows) else None

        alert_level = "green"
        if avg_tone is not None:
            if avg_tone < -0.3:
                alert_level = "red"
            elif avg_tone < 0.0:
                alert_level = "orange"
            elif avg_tone < 0.3:
                alert_level = "yellow"

        # Build conversation text for Claude
        parts = []
        for r in day_rows:
            if r.get("user_response"):
                parts.append(f"Usuario: {r['user_response']}")
            if r.get("breso_message"):
                parts.append(f"Soledad: {r['breso_message']}")
        messages_text = "\n".join(parts)[:1500]

        summary = "Sin resumen disponible."
        if messages_text:
            try:
                ai_resp = client.messages.create(
                    model=llm_client.ANTHROPIC_MODEL,
                    max_tokens=100,
                    messages=[{
                        "role": "user",
                        "content": (
                            "Resumí en una oración lo que habló esta persona hoy, "
                            "sin revelar detalles privados. Solo el estado emocional general "
                            "y los temas principales. Máximo 20 palabras.\n\n"
                            f"Conversación:\n{messages_text}"
                        ),
                    }],
                )
                summary = ai_resp.content[0].text.strip()
            except Exception as exc:  # noqa: BLE001
                logger.warning({"event": "checkins.daily_summaries.llm_error", "date": day, "error": str(exc)})

        results.append({
            "date": day,
            "messages_count": len(day_rows),
            "summary": summary,
            "tone_score": round(avg_tone, 2) if avg_tone is not None else None,
            "alert_level": alert_level,
        })

    return results
