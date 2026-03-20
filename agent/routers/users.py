"""User profile routes — me, baseline, personalization."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException

from agent.integrations.supabase_client import get_supabase

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
