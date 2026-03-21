"""User profile routes — me, baseline, personalization."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException

from integrations.supabase_client import get_supabase

router = APIRouter(prefix="/users", tags=["users"])
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
