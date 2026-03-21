"""User profile routes — me, baseline, personalization."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Body, Depends, Header, HTTPException
from pydantic import BaseModel

from integrations.supabase_client import get_supabase

router = APIRouter(prefix="/users", tags=["users"])
family_router = APIRouter(prefix="/family", tags=["family"])
dashboard_router = APIRouter(tags=["dashboard"])
logger = logging.getLogger("breso.users")


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------


async def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Validate the Bearer JWT from the Authorization header using Supabase Auth.
    Returns the Supabase user object (as dict-like) on success.
    Raises HTTP 401 on any failure.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()
    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
        user = getattr(user_response, "user", None)
        if not user:
            raise ValueError("No user returned from token")
        return user
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "auth.token_validation_failed", "error": str(exc)})
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)) -> dict:
    """Return the authenticated user's profile row from the users table."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("users")
            .select("*")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        return resp.data
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "users.get_me.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch user profile") from exc


@router.patch("/me")
async def update_me(body: dict, current_user=Depends(get_current_user)) -> dict:
    """Update language, timezone, and/or checkin_time_preference for the authenticated user."""
    allowed_fields = {"language", "timezone", "checkin_time_preference"}
    update_data = {k: v for k, v in body.items() if k in allowed_fields}

    if not update_data:
        raise HTTPException(
            status_code=422,
            detail=f"No updatable fields provided. Allowed: {sorted(allowed_fields)}",
        )

    supabase = get_supabase()
    try:
        resp = (
            supabase.table("users")
            .update(update_data)
            .eq("id", current_user.id)
            .execute()
        )
        data = resp.data[0] if resp.data else {}
        logger.info(
            {
                "event": "users.update_me.success",
                "user_id": current_user.id,
                "fields": list(update_data.keys()),
            }
        )
        return data
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "users.update_me.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to update user profile") from exc


@router.get("/me/profile")
async def get_profile(current_user=Depends(get_current_user)) -> dict:
    """Return a summary profile: name, phone, plan, trial status, language."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("users")
            .select("display_name, phone_number, plan, trial_start, language, user_type")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        row = resp.data
        trial_days_left: int | None = None
        if row.get("plan") == "free_trial" and row.get("trial_start"):
            try:
                trial_start = datetime.fromisoformat(row["trial_start"].replace("Z", "+00:00"))
                elapsed = (datetime.now(timezone.utc) - trial_start).days
                trial_days_left = max(0, 15 - elapsed)
            except Exception:  # noqa: BLE001
                trial_days_left = None
        return {
            "name": row.get("display_name"),
            "phone": row.get("phone_number"),
            "plan": row.get("plan", "free_trial"),
            "language": row.get("language", "es"),
            "user_type": row.get("user_type", "patient"),
            "trial_start": row.get("trial_start"),
            "trial_days_left": trial_days_left,
        }
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "users.get_profile.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch profile") from exc


@router.get("/me/baseline")
async def get_baseline(current_user=Depends(get_current_user)) -> dict:
    """Return the latest behavioral baseline for the authenticated user."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("behavioral_baselines")
            .select("*")
            .eq("user_id", current_user.id)
            .order("computed_at", desc=True)
            .limit(1)
            .execute()
        )
        data = resp.data or []
        if not data:
            raise HTTPException(status_code=404, detail="Baseline not computed yet")
        return data[0]
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "users.get_baseline.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch baseline") from exc


@router.get("/me/gamification")
async def get_gamification(current_user=Depends(get_current_user)) -> dict:
    """Return streak, points, achievements, and next achievement progress."""
    supabase = get_supabase()
    user_id = current_user.id

    ACHIEVEMENT_META = {
        "first_checkin": {"name": "Primer paso", "icon": "🌱"},
        "streak_7":      {"name": "Una semana entera", "icon": "🔥"},
        "streak_30":     {"name": "Un mes con Soledad", "icon": "⭐"},
        "points_100":    {"name": "100 puntos", "icon": "💎"},
    }

    ACHIEVEMENT_ORDER = ["first_checkin", "streak_7", "streak_30", "points_100"]

    try:
        streak_res = (
            supabase.table("user_streaks").select("*").eq("user_id", user_id).execute()
        )
        streak = streak_res.data[0] if streak_res.data else {}

        achievements_res = (
            supabase.table("user_achievements")
            .select("achievement_id, unlocked_at")
            .eq("user_id", user_id)
            .execute()
        )
        unlocked = {a["achievement_id"]: a["unlocked_at"] for a in (achievements_res.data or [])}

        achievements_out = [
            {
                "id": aid,
                **ACHIEVEMENT_META[aid],
                "unlocked_at": unlocked[aid],
            }
            for aid in ACHIEVEMENT_ORDER
            if aid in unlocked
        ]

        # Find next locked achievement
        current_streak = streak.get("current_streak", 0)
        total_checkins = streak.get("total_checkins", 0)
        points = streak.get("points", 0)

        next_achievement = None
        for aid in ACHIEVEMENT_ORDER:
            if aid in unlocked:
                continue
            meta = ACHIEVEMENT_META[aid]
            if aid == "first_checkin":
                progress = f"{total_checkins}/1 check-ins"
            elif aid == "streak_7":
                progress = f"{current_streak}/7 días"
            elif aid == "streak_30":
                progress = f"{current_streak}/30 días"
            elif aid == "points_100":
                progress = f"{points}/100 puntos"
            else:
                progress = ""
            next_achievement = {"id": aid, **meta, "progress": progress}
            break

        return {
            "streak": current_streak,
            "longest_streak": streak.get("longest_streak", 0),
            "total_checkins": total_checkins,
            "points": points,
            "achievements": achievements_out,
            "next_achievement": next_achievement,
        }

    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "users.get_gamification.error", "error": str(exc)})
        return {
            "streak": 0,
            "longest_streak": 0,
            "total_checkins": 0,
            "points": 0,
            "achievements": [],
            "next_achievement": {
                "id": "first_checkin",
                "name": "Primer paso",
                "icon": "🌱",
                "progress": "0/1 check-ins",
            },
        }


@router.get("/me/personalization")
async def get_personalization(current_user=Depends(get_current_user)) -> dict:
    """Return the personalization profile for the user, or an empty profile with defaults."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("personalization_profiles")
            .select("*")
            .eq("user_id", current_user.id)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        data = resp.data or []
        if data:
            return data[0]

        # Return empty profile with safe defaults
        return {
            "user_id": current_user.id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "interests": [],
            "hobbies": [],
            "joy_triggers": [],
            "energy_drains": [],
            "energy_by_hour": {},
            "active_hours": [],
            "checkins_contributing": 0,
        }
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "users.get_personalization.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch personalization profile") from exc


# ---------------------------------------------------------------------------
# POST /users/me/push-subscription
# ---------------------------------------------------------------------------


class PushSubscriptionBody(BaseModel):
    subscription: dict


@router.post("/me/push-subscription")
async def save_push_subscription(
    body: PushSubscriptionBody,
    current_user=Depends(get_current_user),
) -> dict:
    """Save a browser Web Push subscription for the authenticated user."""
    supabase = get_supabase()
    try:
        supabase.table("push_subscriptions").upsert(
            {
                "user_id": current_user.id,
                "subscription": body.subscription,
            },
            on_conflict="user_id",
        ).execute()
        logger.info({"event": "users.push_subscription.saved", "user_id": current_user.id})
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "users.push_subscription.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to save push subscription") from exc


# ---------------------------------------------------------------------------
# GET /dashboard
# ---------------------------------------------------------------------------


@dashboard_router.get("/dashboard")
async def get_dashboard(current_user=Depends(get_current_user)) -> dict:
    """Return streak, weekly check-ins, achievements, and recent check-ins for the dashboard."""
    supabase = get_supabase()
    user_id = str(current_user.id)

    # Streak data
    streak_res = (
        supabase.table("user_streaks")
        .select("current_streak, longest_streak, total_checkins, points")
        .eq("user_id", user_id)
        .execute()
    )
    streak_data = streak_res.data[0] if streak_res.data else {
        "current_streak": 0,
        "longest_streak": 0,
        "total_checkins": 0,
        "points": 0,
    }

    # Last 7 days check-ins
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    checkins_res = (
        supabase.table("check_ins")
        .select("responded_at, tone_score, breso_message")
        .eq("user_id", user_id)
        .gte("responded_at", week_ago)
        .not_.is_("responded_at", "null")
        .order("responded_at", desc=False)
        .execute()
    )
    checkins = checkins_res.data or []

    # Build weekly_checkins boolean array [Mon..Sun] relative to today
    by_date: set[str] = {c["responded_at"][:10] for c in checkins}
    weekly_checkins = [
        (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d") in by_date
        for i in range(6, -1, -1)
    ]

    # Achievements
    achievements_res = (
        supabase.table("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user_id)
        .execute()
    )

    return {
        "streak": streak_data.get("current_streak", 0),
        "longest_streak": streak_data.get("longest_streak", 0),
        "total_checkins": streak_data.get("total_checkins", 0),
        "points": streak_data.get("points", 0),
        "weekly_checkins": weekly_checkins,
        "achievements": achievements_res.data or [],
        "recent_checkins": checkins[-5:],
    }


# ---------------------------------------------------------------------------
# Family routes — /family/*
# ---------------------------------------------------------------------------


def _get_linked_patient(family_user_id: str) -> dict | None:
    """Return the patient linked to a family member via user_relationships."""
    try:
        supabase = get_supabase()
        rel = (
            supabase.table("user_relationships")
            .select("patient_id")
            .eq("related_user_id", family_user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        if not rel.data:
            return None
        patient_id = rel.data[0]["patient_id"]
        user_resp = (
            supabase.table("users")
            .select("id, display_name, alert_level")
            .eq("id", patient_id)
            .single()
            .execute()
        )
        return user_resp.data or None
    except Exception:  # noqa: BLE001
        return None


@family_router.get("/patient-status")
async def get_patient_status(current_user=Depends(get_current_user)) -> dict:
    """Return a privacy-safe status summary of the linked patient."""
    supabase = get_supabase()
    patient = _get_linked_patient(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="No linked patient found")

    patient_id = patient["id"]

    # Streak
    streak_resp = (
        supabase.table("user_streaks")
        .select("current_streak, last_checkin_date, total_checkins")
        .eq("user_id", patient_id)
        .execute()
    )
    streak_data = streak_resp.data[0] if streak_resp.data else {}
    streak = streak_data.get("current_streak", 0)

    # Last check-in time
    last_resp = (
        supabase.table("check_ins")
        .select("responded_at")
        .eq("user_id", patient_id)
        .not_.is_("responded_at", "null")
        .order("responded_at", desc=True)
        .limit(1)
        .execute()
    )
    last_checkin = "Sin datos"
    if last_resp.data:
        try:
            last_dt = datetime.fromisoformat(last_resp.data[0]["responded_at"].replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            if hours_ago < 1:
                last_checkin = "Hace menos de una hora"
            elif hours_ago < 24:
                last_checkin = f"Hace {int(hours_ago)} hora{'s' if hours_ago >= 2 else ''}"
            else:
                days = int(hours_ago / 24)
                last_checkin = f"Hace {days} día{'s' if days > 1 else ''}"
        except Exception:  # noqa: BLE001
            pass

    # Check-ins this week
    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    week_resp = (
        supabase.table("check_ins")
        .select("id", count="exact")
        .eq("user_id", patient_id)
        .gte("responded_at", week_start)
        .not_.is_("responded_at", "null")
        .execute()
    )
    checkins_this_week = week_resp.count or 0

    alert_level = patient.get("alert_level") or "green"
    needs_attention = alert_level in ("orange", "red")

    level_summary = {
        "green": "Tu ser querido está bien. Está activo/a y conectado/a.",
        "yellow": "Tu ser querido ha tenido algunos días difíciles. Puede ser buen momento para escribirle.",
        "orange": "Tu ser querido puede estar pasando un momento difícil. Recomendamos estar cerca.",
        "red": "Tu ser querido puede necesitar apoyo urgente.",
    }

    return {
        "alert_level": alert_level,
        "streak": streak,
        "last_checkin": last_checkin,
        "checkins_this_week": checkins_this_week,
        "weekly_summary": level_summary.get(alert_level, ""),
        "needs_attention": needs_attention,
    }


@family_router.get("/weekly-report")
async def get_weekly_report(current_user=Depends(get_current_user)) -> dict:
    """Generate a weekly summary report for the family member."""
    supabase = get_supabase()
    patient = _get_linked_patient(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="No linked patient found")

    patient_id = patient["id"]
    patient_name = patient.get("display_name") or "tu ser querido"

    week_start = (datetime.now(timezone.utc) - timedelta(days=7))
    week_label = f"{week_start.strftime('%-d')} - {datetime.now(timezone.utc).strftime('%-d de %B %Y')}"

    week_resp = (
        supabase.table("check_ins")
        .select("tone_score, responded_at")
        .eq("user_id", patient_id)
        .gte("responded_at", week_start.isoformat())
        .not_.is_("responded_at", "null")
        .execute()
    )
    week_rows = week_resp.data or []
    count = len(week_rows)

    alert_level = patient.get("alert_level") or "green"
    avg_tone = (
        sum(r["tone_score"] for r in week_rows if r.get("tone_score") is not None)
        / max(1, sum(1 for r in week_rows if r.get("tone_score") is not None))
    ) if any(r.get("tone_score") is not None for r in week_rows) else 0.0

    if count == 0:
        summary = f"Esta semana {patient_name} no completó ningún check-in con Soledad."
        recommendation = "Intentá ponerte en contacto — a veces solo saber que alguien piensa en vos hace la diferencia."
    elif avg_tone > 0.3:
        summary = f"Esta semana {patient_name} completó {count} check-in{'s' if count > 1 else ''}. Su estado general fue positivo."
        recommendation = "No hay señales de alerta. Seguir acompañando con presencia."
    elif avg_tone > -0.1:
        summary = f"Esta semana {patient_name} completó {count} check-in{'s' if count > 1 else ''} con altibajos."
        recommendation = "Puede ser un buen momento para escribirle y preguntar cómo está."
    else:
        summary = f"Esta semana {patient_name} completó {count} check-in{'s' if count > 1 else ''}. Hubo algunos momentos difíciles."
        recommendation = "Recomendamos estar cerca y disponible para escuchar sin presionar."

    return {
        "week": week_label,
        "summary": summary,
        "alert_level": alert_level,
        "recommendation": recommendation,
    }


@family_router.post("/notify-patient")
async def notify_patient(
    body: dict = Body(...),
    current_user=Depends(get_current_user),
) -> dict:
    """Send a support message from family to the patient via email."""
    from integrations.email_client import send_alert_email

    supabase = get_supabase()
    patient = _get_linked_patient(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="No linked patient found")

    patient_id = patient["id"]
    message = body.get("message", "Estoy pensando en vos. Estoy acá si necesitás.")

    # Get patient email
    patient_info = (
        supabase.table("users")
        .select("email, display_name")
        .eq("id", patient_id)
        .single()
        .execute()
    )
    if not patient_info.data or not patient_info.data.get("email"):
        raise HTTPException(status_code=404, detail="Patient email not found")

    p = patient_info.data
    family_name = (
        supabase.table("users")
        .select("display_name")
        .eq("id", current_user.id)
        .single()
        .execute()
    ).data or {}

    try:
        send_alert_email(
            to_email=p["email"],
            to_name=p.get("display_name") or "amigo/a",
            patient_name=family_name.get("display_name") or "alguien que te quiere",
            alert_level="yellow",
            message=message,
        )
        logger.info({"event": "family.notify_patient.sent", "patient_id": patient_id, "from_user": current_user.id})
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "family.notify_patient.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to send notification") from exc
